import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { expandirPack } from "@/lib/packs";
import { expandirColeccion } from "@/lib/colecciones-comerciales";

/**
 * Una línea del carrito.
 *
 * Lleva "productId" o "packId", nunca los dos. Los carritos
 * que ya están guardados en el navegador solo traen
 * "productId", y siguen funcionando igual.
 */
type OrderItemInput = {
  productId?: string;
  packId?: string;
  collectionId?: string;
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
        productId: item.productId ? String(item.productId) : "",
        packId: item.packId ? String(item.packId) : "",
        collectionId: item.collectionId ? String(item.collectionId) : "",
        quantity: Number(item.quantity),
      }))
      .filter((item) => {
        /*
          Una línea es de UNA cosa: un recurso suelto, un pack
          o una colección. Nunca de dos, nunca de ninguna.
        */
        const cuantos =
          Number(Boolean(item.productId)) +
          Number(Boolean(item.packId)) +
          Number(Boolean(item.collectionId));

        return (
          cuantos === 1 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
        );
      });

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: "Los productos enviados no son válidos." },
        { status: 400 }
      );
    }

    /*
      Los productos sueltos se resuelven por su precio; los
      packs se EXPANDEN en una línea por recurso incluido, con
      el precio del pack repartido entre ellas.

      De este modo la tabla OrderItem sigue conteniendo una
      línea por recurso y todo lo que cuelga de ella —la
      descarga, la licencia y la comisión del creador— funciona
      sin cambio alguno.
    */
    const productIds = cleanItems
      .filter((item) => item.productId)
      .map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        status: "PUBLISHED",
      },
    });

    if (products.length !== productIds.length) {
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

    type LineaPedido = {
      productId: string;
      price: Prisma.Decimal;
      quantity: number;
      commissionRate: Prisma.Decimal;
      platformFee: Prisma.Decimal;
      creatorAmount: Prisma.Decimal;
      packId: string | null;
      commercialCollectionId: string | null;
    };

    /** Calcula comisión y ganancia de una línea ya valorada. */
    function componer(
      productId: string,
      price: Prisma.Decimal,
      quantity: number,
      packId: string | null,
      commercialCollectionId: string | null = null
    ): LineaPedido {
      const lineTotal = price.mul(quantity);

      const platformFee = lineTotal
        .mul(CREATOR_COMMISSION_RATE)
        .div(100);

      subtotal = subtotal.add(lineTotal);

      return {
        productId,
        price,
        quantity,
        commissionRate: CREATOR_COMMISSION_RATE,
        platformFee,
        creatorAmount: lineTotal.sub(platformFee),
        packId,
        commercialCollectionId,
      };
    }

    const orderItems: LineaPedido[] = [];

    for (const item of cleanItems) {
      if (item.packId) {
        const expandido = await expandirPack(item.packId);

        if (!expandido.ok) {
          return NextResponse.json(
            { error: expandido.error },
            { status: 400 }
          );
        }

        for (const linea of expandido.lineas) {
          orderItems.push(
            componer(
              linea.productId,
              linea.price,
              item.quantity,
              linea.packId
            )
          );
        }

        continue;
      }

      if (item.collectionId) {
        /*
          Una colección se cobra UNA vez y se reparte entre
          sus recursos, igual que un pack. El precio, el
          estado y el contenido los determina el servidor:
          aquí solo llega el id.
        */
        const expandida = await expandirColeccion(item.collectionId);

        if (!expandida.ok) {
          return NextResponse.json(
            { error: expandida.error },
            { status: 400 }
          );
        }

        for (const linea of expandida.lineas) {
          orderItems.push(
            componer(
              linea.productId,
              linea.price,
              item.quantity,
              null,
              linea.collectionId
            )
          );
        }

        continue;
      }

      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: "Uno o más productos ya no están disponibles." },
          { status: 400 }
        );
      }

      orderItems.push(
        componer(product.id, product.price, item.quantity, null)
      );
    }

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