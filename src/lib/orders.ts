import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
  return prisma.$transaction(async (tx) => {
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

    const updatedOrder =
      order.status === "PAID"
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
        await tx.download.create({
          data: {
            userId: order.userId,
            productId: item.productId,
            orderId: order.id,
            status: "ACTIVE",
            downloadCount: 0,
          },
        });
      }
    }

    return updatedOrder;
  });
}
