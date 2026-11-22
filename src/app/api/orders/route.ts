import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { expandirPack } from "@/lib/packs";
import { expandirColeccion } from "@/lib/colecciones-comerciales";
import { yaAdquiridos } from "@/lib/adquisiciones";

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud debe ser JSON válido." },
        { status: 400 }
      );
    }

    const items =
      body && typeof body === "object" && "items" in body
        ? body.items
        : undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    // Los recursos digitales se adquieren una sola vez por pedido.
    // Limitar el tamaño también evita carritos abusivos y expansiones
    // innecesarias de packs/colecciones.
    if (items.length > 50) {
      return NextResponse.json(
        { error: "El carrito supera el máximo de 50 artículos." },
        { status: 400 }
      );
    }

    const cleanItems = (items as unknown[])
      .map((raw) => {
        const item = raw && typeof raw === "object"
          ? raw as Record<string, unknown>
          : {};
        return {
          productId: typeof item.productId === "string" ? item.productId.trim() : "",
          packId: typeof item.packId === "string" ? item.packId.trim() : "",
          collectionId: typeof item.collectionId === "string" ? item.collectionId.trim() : "",
          quantity: item.quantity,
        };
      })
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
          item.quantity === 1
        );
      });

    // No aceptar carritos parcialmente inválidos: nunca crear un
    // pedido cobrando menos artículos de los que envió el cliente.
    if (cleanItems.length !== items.length) {
      return NextResponse.json(
        { error: "El carrito contiene artículos o cantidades inválidas." },
        { status: 400 }
      );
    }

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: "Los productos enviados no son válidos." },
        { status: 400 }
      );
    }

    // Evitar dos líneas para el mismo recurso, pack o colección.
    // Un pedido duplicado podría generar dos licencias y cobrar dos veces.
    const claves = cleanItems.map((item) =>
      item.productId
        ? `product:${item.productId}`
        : item.packId
          ? `pack:${item.packId}`
          : `collection:${item.collectionId}`
    );

    if (new Set(claves).size !== claves.length) {
      return NextResponse.json(
        { error: "El carrito contiene artículos duplicados." },
        { status: 400 }
      );
    }

    /*
      NADA SE COMPRA DOS VECES.

      Un recurso digital no se agota ni se gasta: pagarlo otra
      vez no le da nada nuevo a quien ya lo tiene, y sí le
      genera una segunda licencia y una segunda descarga que
      después hay que explicar. Se corta aquí, antes de crear
      el pedido, porque es el último punto por el que pasan
      todos los caminos —carrito, botón de compra directa y
      cualquier cliente que llame a la API a mano—.

      Solo se rechaza lo que YA es suyo; el resto del carrito
      se dice con nombre y apellidos para que la interfaz
      pueda retirarlo sin adivinar.
    */
    const repetidos = await yaAdquiridos(session.userId, {
      productIds: cleanItems
        .filter((item) => item.productId)
        .map((item) => item.productId),
      packIds: cleanItems
        .filter((item) => item.packId)
        .map((item) => item.packId as string),
      collectionIds: cleanItems
        .filter((item) => item.collectionId)
        .map((item) => item.collectionId as string),
    });

    if (
      repetidos.productos.length ||
      repetidos.packs.length ||
      repetidos.colecciones.length
    ) {
      return NextResponse.json(
        {
          error:
            repetidos.colecciones.length && !repetidos.productos.length
              ? "Ya adquiriste esta colección."
              : "Ya adquiriste uno de estos recursos.",
          yaAdquiridos: repetidos,
        },
        { status: 409 }
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

    // Un carrito pequeño puede expandirse a cientos de archivos.
    // Mantener un límite también evita transacciones enormes y
    // solicitudes abusivas al combinar packs y colecciones.
    if (orderItems.length > 200) {
      return NextResponse.json(
        { error: "El pedido supera el máximo de 200 recursos digitales." },
        { status: 400 }
      );
    }

    // Los packs y las colecciones pueden incluir el mismo recurso.
    // No cobrar dos veces ni generar licencias duplicadas tras expandir.
    const recursosExpandidos = orderItems.map((item) => item.productId);
    if (new Set(recursosExpandidos).size !== recursosExpandidos.length) {
      return NextResponse.json(
        { error: "El carrito incluye recursos repetidos entre productos, packs o colecciones." },
        { status: 409 }
      );
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "No hay recursos disponibles para comprar." },
        { status: 400 }
      );
    }

    // Un pack o una colección puede contener recursos que el usuario
    // ya compró por separado. Verificar los IDs expandidos, no solo
    // los IDs originales del carrito, antes de cobrar.
    const yaComprados = await prisma.orderItem.findMany({
      where: {
        productId: { in: recursosExpandidos },
        order: { userId: session.userId, status: "PAID" },
      },
      select: { productId: true },
    });

    if (yaComprados.length > 0) {
      return NextResponse.json(
        {
          error: "Algunos recursos del carrito ya están en tu biblioteca.",
          yaAdquiridos: {
            productos: [...new Set(yaComprados.map((item) => item.productId))],
            packs: [],
            colecciones: [],
          },
        },
        { status: 409 }
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