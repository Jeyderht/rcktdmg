import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  crearNotificaciones,
  notificarAdmins,
} from "@/lib/notificaciones";
import { otorgarLicenciasDePedido } from "@/lib/licencias";

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
  /*
    Las notificaciones se emiten DESPUÉS de la transacción y
    solo si el pedido acaba de pasar a pagado.

    Fuera de la transacción porque un fallo al avisar no debe
    deshacer un cobro ya confirmado; y solo en la transición
    porque esta función es idempotente a propósito: la llaman
    el pago de prueba y el webhook de la pasarela, que puede
    reintentar. Sin esa condición, cada reintento repetiría
    los avisos de una compra que ya estaba avisada.
  */
  const resultado = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Pedido no encontrado: ${orderId}`);
    }

    // Ganancias del creador y comisión de la plataforma.
    for (const item of order.items) {
      const { platformFee, creatorAmount } =
        calculateLineAmounts(item.price, item.quantity);

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

    // ¿Este pedido acaba de pasar a pagado, o ya lo estaba?
    const yaEstabaPagado = order.status === "PAID";

    const updatedOrder =
      yaEstabaPagado
        ? order
        : await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              status: "PAID",
            },
            include: {
              items: true,
            },
          });

    // Descargas: una por producto, sin duplicar si el
    // webhook llega más de una vez.
    for (const item of order.items) {
      const existingDownload = await tx.download.findUnique({
        where: {
          userId_productId_orderId: {
            userId: order.userId,
            productId: item.productId,
            orderId: order.id,
          },
        },
      });

      if (!existingDownload) {
        /*
          Se anota qué versión estaba vigente al comprar.

          Es un dato histórico, no lo que se entrega: la
          descarga sirve siempre la versión vigente. Sirve
          para poder decir "compraste la 1.0, ahora hay una
          2.0". Un recurso sin versiones deja esto en null,
          igual que las 18 descargas anteriores a esta etapa.
        */
        const vigente = await tx.productVersion.findFirst({
          where: { productId: item.productId, isCurrent: true },
          select: { id: true },
        });

        await tx.download.create({
          data: {
            userId: order.userId,
            productId: item.productId,
            orderId: order.id,
            status: "ACTIVE",
            downloadCount: 0,
            versionId: vigente?.id ?? null,
          },
        });
      }
    }

    return { order: updatedOrder, yaEstabaPagado };
  });

  /*
    Las licencias se otorgan SIEMPRE, no solo en la
    transición, y a propósito: es idempotente por el índice
    único sobre orderItemId, así que un reintento no duplica
    nada. A cambio, un pedido que quedó pagado antes de que
    existieran las licencias las recibe la próxima vez que
    pase por aquí, en lugar de quedarse sin ellas para
    siempre.
  */
  await otorgarLicenciasDePedido(resultado.order.id);

  if (!resultado.yaEstabaPagado) {
    await avisarPedidoPagado(resultado.order.id);
  }

  return resultado.order;
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
async function avisarPedidoPagado(orderId: string) {
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
