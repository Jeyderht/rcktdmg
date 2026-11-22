import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { acreditarPedido, avisarPedidoPagado } from "@/lib/orders";
import { pagoAprobadoParaPedido } from "@/lib/pago-validado";
import { importesDePedidoValidos } from "@/lib/importes-pedido";

export async function POST(request: Request) {
  try {
    // Este endpoint es únicamente para desarrollo.
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          error:
            "El pago de prueba no está disponible en producción.",
        },
        { status: 403 }
      );
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud debe ser JSON válido." },
        { status: 400 }
      );
    }

    const orderId =
      body && typeof body === "object" && "orderId" in body &&
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        { error: "Falta el ID del pedido." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async tx => {
      // Serializa los pagos del comprador, incluso entre dos pedidos distintos.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, userId: session.userId },
        include: { items: true, payment: true },
      });
      if (!order) return { error: "Pedido no encontrado.", status: 404 } as const;
      if (order.payment && order.payment.provider !== "TEST") {
        return { error: "Este pedido pertenece a otra pasarela.", status: 409 } as const;
      }
      if (!importesDePedidoValidos(order.items, order.subtotal, order.discount, order.total)) {
        return { error: "Los importes del pedido son inconsistentes.", status: 409 } as const;
      }
      if (order.status === "PAID") {
        if (!pagoAprobadoParaPedido(order.payment, order.total)) {
          return { error: "El pedido no tiene un pago aprobado válido.", status: 409 } as const;
        }
        await acreditarPedido(tx, orderId);
        return { alreadyPaid: true, paymentId: order.payment?.id } as const;
      }
      if (order.status !== "PENDING") {
        return { error: "El pedido ya no está pendiente.", status: 409 } as const;
      }
      const owned = await tx.orderItem.findFirst({
        where: {
          productId: { in: order.items.map(item => item.productId) },
          order: { userId: session.userId, status: "PAID" },
        },
        select: { id: true },
      });
      if (owned) return { error: "Ya tienes un recurso de este pedido en tu biblioteca.", status: 409 } as const;

      const data = { transactionId: `TEST-${orderId}`, amount: order.total, status: "APPROVED" as const };
      const payment = order.payment
        ? await tx.payment.update({ where: { id: order.payment.id, provider: "TEST" }, data })
        : await tx.payment.create({ data: { ...data, provider: "TEST", orderId } });
      await acreditarPedido(tx, orderId);
      return { alreadyPaid: false, paymentId: payment.id } as const;
    }, { timeout: 30000 });

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    if (!result.alreadyPaid) await avisarPedidoPagado(orderId);
    return NextResponse.json({ success: true, orderId, status: "PAID", ...result });
  } catch (error) {
    if (error instanceof Error && "code" in error && ["P2002", "P2025"].includes(String(error.code))) {
      return NextResponse.json({ error: "Otra solicitud modificó este pedido. Actualiza la página." }, { status: 409 });
    }
    console.error("Error en pago de prueba:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el pago de prueba." },
      { status: 500 }
    );
  }
}
