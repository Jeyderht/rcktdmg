import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fulfillPaidOrder } from "@/lib/orders";

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

    const body = await request.json();
    const orderId = String(body.orderId || "");

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
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (order.status === "PAID") {
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
