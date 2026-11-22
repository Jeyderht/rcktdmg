import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fulfillPaidOrder } from "@/lib/orders";
import { pagoAprobadoParaPedido } from "@/lib/pago-validado";

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

    // El pedido debe pertenecer al usuario autenticado.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.userId,
      },
      select: {
        id: true,
        total: true,
        status: true,
        payment: { select: { provider: true, status: true, amount: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (order.status === "PAID") {
      // No declarar éxito si un registro antiguo fue marcado PAID
      // sin un pago aprobado y coincidente.
      if (!pagoAprobadoParaPedido(order.payment, order.total)) {
        return NextResponse.json(
          { error: "El pedido no tiene un pago aprobado válido." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        orderId: order.id,
        status: "PAID",
      });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Este pedido ya no está pendiente." },
        { status: 400 }
      );
    }

    // Nunca reemplazar una transacción de una pasarela real con
    // una transacción de prueba, aunque se esté ejecutando localmente.
    if (order.payment && order.payment.provider !== "TEST") {
      return NextResponse.json(
        { error: "Este pedido pertenece a otra pasarela de pago." },
        { status: 409 }
      );
    }

    const payment = await prisma.payment.upsert({
      where: {
        orderId: order.id,
      },
      update: {
        provider: "TEST",
        transactionId: `TEST-${order.id}-${Date.now()}`,
        amount: order.total,
        status: "APPROVED",
      },
      create: {
        orderId: order.id,
        provider: "TEST",
        transactionId: `TEST-${order.id}-${Date.now()}`,
        amount: order.total,
        status: "APPROVED",
      },
    });

    // Order -> PAID, ganancias del creador y descargas.
    const paidOrder = await fulfillPaidOrder(order.id);

    return NextResponse.json({
      success: true,
      orderId: paidOrder.id,
      paymentId: payment.id,
      status: "PAID",
    });
  } catch (error) {
    console.error("Error en pago de prueba:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el pago de prueba." },
      { status: 500 }
    );
  }
}
