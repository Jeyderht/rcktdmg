import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  crearNotificaciones,
  notificarAdmins,
} from "@/lib/notificaciones";
import { codigoDeLicencia, condicionesDe } from "@/lib/licencias";
import { pagoAprobadoParaPedido } from "@/lib/pago-validado";
import { importesDePedidoValidos } from "@/lib/importes-pedido";

/**
 * Comisión de la plataforma sobre cada venta (%).
 * El creador recibe el resto.
 */
export const PLATFORM_COMMISSION_RATE = new Prisma.Decimal("20.00");

export function calculateLineAmounts(
  price: Prisma.Decimal,
  quantity: number
) {
  const lineTotal = price.mul(quantity);

  const platformFee = lineTotal
    .mul(PLATFORM_COMMISSION_RATE)
    .div(100);

  const creatorAmount = lineTotal.sub(platformFee);

  return { lineTotal, platformFee, creatorAmount };
}

/**
 * Marca un pedido como pagado y deja el sistema coherente:
 *
 * 1. Order  -> PAID
 * 2. OrderItem -> comisión y ganancia del creador
 * 3. Download -> una descarga activa por producto comprado
 *
 * Es idempotente: si el pedido ya estaba pagado no duplica
 * descargas ni recalcula nada. La usan tanto el pago de
 * prueba como el webhook de la pasarela, para que el
 * resultado sea siempre el mismo.
 */
export async function fulfillPaidOrder(orderId: string) {
  const result = await prisma.$transaction(tx => acreditarPedido(tx, orderId));
  if (!result.yaEstabaPagado) await avisarPedidoPagado(orderId);
  return result.order;
}

export async function acreditarPedido(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      items: { include: { product: { select: { licenseType: true } } } },
      payment: true,
    },
  });

  if (!order) {
    throw new Error(`Pedido no encontrado: ${orderId}`);
  }

  // Nunca reactivar pedidos cancelados o reembolsados por un
  // webhook tardío o un reintento de pago.
  if (order.status !== "PENDING" && order.status !== "PAID") {
    throw new Error(`No se puede acreditar un pedido en estado ${order.status}`);
  }

  // No confiar en una llamada a esta función como prueba de cobro.
  // El pago debe estar aprobado y coincidir exactamente con el pedido.
  if (!pagoAprobadoParaPedido(order.payment, order.total)) {
    throw new Error(`El pedido ${orderId} no tiene un pago aprobado por el importe correcto`);
  }

  if (order.items.length === 0) {
    throw new Error(`El pedido ${orderId} no contiene recursos`);
  }

  // Verificar la integridad del pedido antes de emitir descargas:
  // el total acreditado debe corresponder a sus líneas menos
  // el descuento registrado. Nunca confiar solo en Payment.amount.
  if (!importesDePedidoValidos(
    order.items,
    order.subtotal,
    order.discount,
    order.total
  )) {
    throw new Error(`El pedido ${orderId} tiene importes o cantidades inconsistentes`);
  }

  // Ganancias del creador y comisión de la plataforma.
  for (const item of order.items) {
    const { platformFee, creatorAmount } =
      calculateLineAmounts(item.price, item.quantity);

    if (order.status === "PAID" || (item.commissionRate.equals(PLATFORM_COMMISSION_RATE) &&
        item.platformFee.equals(platformFee) && item.creatorAmount.equals(creatorAmount))) continue;

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        commissionRate: PLATFORM_COMMISSION_RATE,
        platformFee,
        creatorAmount,
      },
    });
  }

  // Solo una ejecución puede reclamar la transición PENDING -> PAID.
  // Si llegan dos webhooks a la vez, únicamente la primera
  // genera notificaciones de nueva compra.
  const transicion = order.status === "PENDING"
    ? await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "PAID" },
      })
    : { count: 0 };

  const yaEstabaPagado = transicion.count === 0;
  const updatedOrder = await tx.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });

  if (updatedOrder.status !== "PAID") {
    throw new Error(`El pedido ${orderId} cambió de estado durante la acreditación`);
  }

  // Insertar descargas de forma idempotente. El índice único
  // (usuario, producto, pedido) y skipDuplicates protegen
  // también frente a webhooks que llegan simultáneamente.
  // Nunca modificar una descarga existente: podría estar revocada.
  const versiones = await tx.productVersion.findMany({
    where: { productId: { in: order.items.map(item => item.productId) }, isCurrent: true },
    select: { id: true, productId: true },
  });
  const vigente = new Map(versiones.map(version => [version.productId, version.id]));
  const descargas = order.items.map(item => ({
    userId: order.userId,
    productId: item.productId,
    orderId,
    status: "ACTIVE" as const,
    downloadCount: 0,
    versionId: vigente.get(item.productId) ?? null,
  }));

  await tx.download.createMany({
    data: descargas,
    skipDuplicates: true,
  });

  await tx.license.createMany({
    data: order.items.map(item => ({
      orderItemId: item.id,
      orderId,
      productId: item.productId,
      userId: order.userId,
      code: codigoDeLicencia(item.id),
      type: item.product.licenseType,
      terms: condicionesDe(item.product.licenseType),
    })),
    skipDuplicates: true,
  });

  return { order: updatedOrder, yaEstabaPagado };
}

/**
 * Avisos de una compra recién confirmada.
 *
 * Tres destinatarios con tres mensajes distintos: quien
 * compra, cada creador que vendió algo, y administración.
 *
 * Nunca lanza: llega después de que el cobro esté cerrado, y
 * quedarse sin avisar es mucho menos grave que romper la
 * respuesta de una pasarela de pago, que reintentaría.
 */
export async function avisarPedidoPagado(orderId: string) {
  try {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        total: true,
        items: {
          select: {
            creatorAmount: true,
            product: {
              select: { name: true, creatorId: true },
            },
          },
        },
      },
    });

    if (!pedido) return;

    const soles = (v: Prisma.Decimal | number) =>
      `S/ ${Number(v).toFixed(2)}`;

    const cuantos = pedido.items.length;

    await crearNotificaciones([
      // COMPRADOR
      {
        userId: pedido.userId,
        type: "ORDER_PAID",
        title: "Compra confirmada",
        body: `Tu pedido de ${soles(pedido.total)} está pagado.`,
        href: "/mi-cuenta/compras",
      },
      {
        userId: pedido.userId,
        type: "DOWNLOAD_READY",
        title:
          cuantos === 1
            ? "Tu descarga ya está lista"
            : "Tus descargas ya están listas",
        body:
          cuantos === 1
            ? "Ya puedes descargar el recurso que compraste."
            : `Ya puedes descargar los ${cuantos} recursos que compraste.`,
        href: "/mi-cuenta/descargas",
      },

      // CREADORES: uno por línea vendida.
      ...pedido.items.map((item) => ({
        userId: item.product.creatorId,
        type: "SALE" as const,
        title: "Nueva venta",
        body: `${item.product.name} · ${soles(item.creatorAmount)} para ti.`,
        href: "/creadores/panel",
      })),
    ]);

    await notificarAdmins({
      type: "ORDER_PAID",
      title: "Nuevo pedido pagado",
      body: `Un pedido de ${soles(pedido.total)} quedó pagado.`,
      href: "/admin",
    });
  } catch (error) {
    console.error("avisarPedidoPagado:", error);
  }
}
