import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fulfillPaidOrder } from "@/lib/orders";
import { sincronizarLicenciasDePedido } from "@/lib/licencias";

export const runtime = "nodejs";

/**
 * Webhook de la pasarela de pago.
 *
 * El estado del pedido NUNCA se confirma desde el frontend:
 * solo este webhook (o el pago de prueba en desarrollo)
 * puede marcar un pedido como pagado.
 */
export async function POST(request: Request) {
  try {
    // Verificación opcional por token compartido. Si
    // CULQI_WEBHOOK_SECRET está configurado, se exige.
    const webhookSecret = process.env.CULQI_WEBHOOK_SECRET;

    if (webhookSecret) {
      const provided =
        request.headers.get("x-rcktdmg-webhook-secret") ||
        request.headers.get("x-culqi-signature");

      if (provided !== webhookSecret) {
        console.warn(
          "Webhook Culqi rechazado: firma no válida."
        );

        return NextResponse.json(
          { error: "Firma no válida." },
          { status: 401 }
        );
      }
    }

    const body = await request.json();

    const event = body?.event;

    if (!event) {
      return NextResponse.json(
        { error: "Evento no recibido." },
        { status: 400 }
      );
    }

    const orderData = event?.data;

    const culqiOrderId =
      orderData?.id ||
      orderData?.order_id ||
      orderData?.object_id;

    if (!culqiOrderId) {
      return NextResponse.json(
        { success: true, message: "Evento recibido sin orden." },
        { status: 200 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        transactionId: String(culqiOrderId),
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!payment) {
      console.warn(
        "No se encontró Payment para la transacción:",
        culqiOrderId
      );

      // Se responde 200 para que la pasarela no reintente
      // indefinidamente un evento que no nos corresponde.
      return NextResponse.json(
        { success: true, message: "Evento recibido." },
        { status: 200 }
      );
    }

    const status = String(orderData?.status || "");

    if (status === "paid") {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "APPROVED",
        },
      });

      // Order -> PAID, ganancias del creador y descargas.
      // Es idempotente ante reintentos del webhook.
      await fulfillPaidOrder(payment.orderId);

      console.log("Pedido marcado como PAID:", payment.orderId);
    }

    if (status === "expired" || status === "canceled") {
      await prisma.$transaction([
        prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "DECLINED",
          },
        }),

        prisma.order.update({
          where: {
            id: payment.orderId,
          },
          data: {
            status: "CANCELED",
          },
        }),
      ]);

      /*
        Un pedido cancelado retira sus licencias. Hoy solo
        llega aquí desde un pago expirado o cancelado, que
        nunca llegó a otorgar ninguna; pero dejarlo atado
        aquí evita que un pago anulado tras cobrarse deje
        licencias vivas.
      */
      await sincronizarLicenciasDePedido(payment.orderId);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando webhook Culqi:", error);

    return NextResponse.json(
      { error: "Error procesando webhook." },
      { status: 500 }
    );
  }
}
