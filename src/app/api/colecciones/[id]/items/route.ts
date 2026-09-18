import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session || typeof session.userId !== "string") {
    return null;
  }

  return session.userId;
}

// AGREGAR PRODUCTO A COLECCIÓN
export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { id: collectionId } = await context.params;

    if (!collectionId) {
      return NextResponse.json(
        { error: "Falta la colección." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const productId = String(body.productId || "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el producto." },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 }
      );
    }

    const item = await prisma.collectionItem.upsert({
      where: {
        collectionId_productId: {
          collectionId,
          productId,
        },
      },
      create: {
        collectionId,
        productId,
      },
      update: {},
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            coverUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error(
      "Error agregando producto a colección:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo agregar el producto a la colección.",
      },
      { status: 500 }
    );
  }
}

// QUITAR PRODUCTO DE COLECCIÓN
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { id: collectionId } = await context.params;

    if (!collectionId) {
      return NextResponse.json(
        { error: "Falta la colección." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const productId = String(body.productId || "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el producto." },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    await prisma.collectionItem.delete({
      where: {
        collectionId_productId: {
          collectionId,
          productId,
        },
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Error eliminando producto de colección:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el producto de la colección.",
      },
      { status: 500 }
    );
  }
}