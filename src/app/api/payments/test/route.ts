import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fulfillPaidOrder } from "@/lib/orders";
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

    // El pedido debe pertenecer al usuario autenticado.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.userId,
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discount: true,
        items: { select: { price: true, quantity: true } },
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
      // Esta ruta solo puede confirmar pagos de prueba. No
      // presentar una transacción de otra pasarela como simulada.
      if (order.payment?.provider !== "TEST") {
        return NextResponse.json(
          { error: "Este pedido pertenece a otra pasarela de pago." },
          { status: 409 }
        );
      }

      // No declarar éxito si un registro antiguo fue marcado PAID
      // sin un pago aprobado y coincidente.
      if (
        !pagoAprobadoParaPedido(order.payment, order.total) ||
        !importesDePedidoValidos(
          order.items,
          order.subtotal,
          order.discount,
          order.total
        )
      ) {
        return NextResponse.json(
          { error: "El pedido no tiene un pago aprobado válido o sus importes son inconsistentes." },
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

    // Comprobar el pedido ANTES de marcar un pago de prueba
    // como aprobado. Un pedido corrupto no debe dejar un
    // registro APPROVED aunque luego falle su acreditación.
    if (!importesDePedidoValidos(
      order.items,
      order.subtotal,
      order.discount,
      order.total
    )) {
      return NextResponse.json(
        { error: "El pedido contiene importes inconsistentes." },
        { status: 409 }
      );
    }

    // Nunca sobrescribir un pago real aunque otra solicitud lo
    // haya registrado entre la lectura del pedido y esta escritura.
    // La condición provider=TEST se comprueba en la propia BD.
    const transactionId = `TEST-${order.id}-${Date.now()}`;
    const payment = await prisma.$transaction(async (tx) => {
      const existente = await tx.payment.findUnique({
        where: { orderId: order.id },
        select: { id: true, provider: true },
      });

      if (existente) {
        if (existente.provider !== "TEST") {
          throw new Error("PAYMENT_PROVIDER_CONFLICT");
        }
        const actualizado = await tx.payment.updateMany({
          where: { id: existente.id, orderId: order.id, provider: "TEST" },
          data: {
            transactionId,
            amount: order.total,
            status: "APPROVED",
          },
        });
        if (actualizado.count !== 1) {
          throw new Error("PAYMENT_PROVIDER_CONFLICT");
        }
        return { id: existente.id };
      }

      // Si otra pasarela inserta primero, el índice único de
      // orderId rechaza la creación; nunca se reemplaza su pago.
      return tx.payment.create({
        data: {
          orderId: order.id,
          provider: "TEST",
          transactionId,
          amount: order.total,
          status: "APPROVED",
        },
        select: { id: true },
      });
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
    if (
      error instanceof Error &&
      (error.message === "PAYMENT_PROVIDER_CONFLICT" ||
        ("code" in error && error.code === "P2002"))
    ) {
      return NextResponse.json(
        { error: "El pedido ya tiene un pago registrado por otra solicitud." },
        { status: 409 }
      );
    }

    console.error("Error en pago de prueba:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el pago de prueba." },
      { status: 500 }
    );
  }
}
