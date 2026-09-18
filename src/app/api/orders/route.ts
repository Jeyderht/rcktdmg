import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type OrderItemInput = {
  productId: string;
  quantity: number;
};

const CREATOR_COMMISSION_RATE = new Prisma.Decimal("20.00");

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para realizar una compra." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const items = body.items as OrderItemInput[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const cleanItems = items
      .map((item) => ({
        productId: String(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter(
        (item) =>
          item.productId &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      );

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: "Los productos enviados no son válidos." },
        { status: 400 }
      );
    }

    const productIds = cleanItems.map(
      (item) => item.productId
    );

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        status: "PUBLISHED",
      },
    });

    if (products.length !== cleanItems.length) {
      return NextResponse.json(
        {
          error:
            "Uno o más productos ya no están disponibles.",
        },
        { status: 400 }
      );
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    let subtotal = new Prisma.Decimal("0");

    const orderItems = cleanItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Producto no encontrado.");
      }

      const price = product.price;

      // Importe total de esta línea
      const lineTotal = price.mul(item.quantity);

      // Comisión de RCKTDMG: 20%
      const platformFee = lineTotal
        .mul(CREATOR_COMMISSION_RATE)
        .div(100);

      // Ganancia del creador: 80%
      const creatorAmount = lineTotal.sub(platformFee);

      subtotal = subtotal.add(lineTotal);

      return {
        productId: product.id,
        price: product.price,
        quantity: item.quantity,
        commissionRate: CREATOR_COMMISSION_RATE,
        platformFee,
        creatorAmount,
      };
    });

    const order = await prisma.order.create({
      data: {
        userId: session.userId,
        subtotal,
        discount: new Prisma.Decimal("0"),
        total: subtotal,
        status: "PENDING",

        items: {
          create: orderItems,
        },
      },

      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,

        order: {
          id: order.id,
          subtotal: Number(order.subtotal),
          discount: Number(order.discount),
          total: Number(order.total),
          status: order.status,

          items: order.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            price: Number(item.price),
            quantity: item.quantity,

            commissionRate: Number(
              item.commissionRate
            ),

            platformFee: Number(
              item.platformFee
            ),

            creatorAmount: Number(
              item.creatorAmount
            ),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando pedido:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el pedido.",
      },
      { status: 500 }
    );
  }
}