import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { fulfillPaidOrder } from "@/lib/orders";
import { sincronizarLicenciasDePedido } from "@/lib/licencias";

export const runtime = "nodejs";


/*
  Comparación en tiempo constante: una comparación normal
  se corta en el primer byte distinto, y ese tiempo delata
  cuánto se acertó de la firma.
*/
function firmaValida(recibida: string, esperada: string) {
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * Webhook de la pasarela de pago.
 *
 * El estado del pedido NUNCA se confirma desde el frontend:
 * solo este webhook (o el pago de prueba en desarrollo)
 * puede marcar un pedido como pagado.
 *
 * Y este webhook solo acepta eventos si hay una pasarela
 * conectada, es decir, si CULQI_WEBHOOK_SECRET está puesta
 * y la firma del evento coincide. Sin eso responde 503 y no
 * toca ningún pedido.
 */
export async function POST(request: Request) {
  try {
    /*
      Este webhook es el único camino por el que un pedido
      llega a PAID en producción, así que va cerrado por
      defecto: sin secreto configurado no hay pasarela
      conectada y no se acepta ningún evento.

      Antes la comprobación era opcional —solo se exigía la
      firma si CULQI_WEBHOOK_SECRET estaba puesta—, y esa
      variable no existe mientras no haya pasarela. Con ella
      vacía cualquiera podía marcar un pedido como pagado
      con un POST sin sesión: basta el transactionId, que el
      propio comprador recibe en /api/mis-compras.
    */
    const webhookSecret = process.env.CULQI_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn(
        "Webhook de pago rechazado: no hay pasarela conectada."
      );

      return NextResponse.json(
        { error: "No hay ninguna pasarela de pago conectada." },
        { status: 503 }
      );
    }

    const provided =
      request.headers.get("x-rcktdmg-webhook-secret") ||
      request.headers.get("x-culqi-signature");

    if (!provided || !firmaValida(provided, webhookSecret)) {
      console.warn("Webhook de pago rechazado: firma no válida.");

      return NextResponse.json(
        { error: "Firma no válida." },
        { status: 401 }
      );
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
