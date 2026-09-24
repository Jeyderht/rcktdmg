import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

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
// LISTAR FAVORITOS
export async function GET() {
  try {
   const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            coverUrl: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      favorites,
    });
  } catch (error) {
    console.error("Error obteniendo favoritos:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los favoritos." },
      { status: 500 }
    );
  }
}

// AGREGAR FAVORITO
export async function POST(request: Request) {
  try {
   const userId = await getAuthenticatedUser();

  if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
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

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        creatorId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 }
      );
    }

    /*
      Se mira antes de guardar si ya estaba: el upsert de
      abajo no distingue "creado" de "ya existía", y sin esa
      diferencia volver a pulsar el corazón le mandaría al
      creador otro aviso por el mismo favorito.
    */
    const yaEraFavorito = await prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      select: { createdAt: true },
    });

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_productId: {
        userId,
          productId,
        },
      },
      create: {
       userId,
        productId,
      },
      update: {},
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Nadie necesita un aviso por guardarse su propio recurso.
    if (!yaEraFavorito && product.creatorId !== userId) {
      await crearNotificacion({
        userId: product.creatorId,
        type: "FAVORITE",
        title: "Nuevo favorito",
        body: `Alguien guardó ${product.name}.`,
        href: `/tienda/${product.slug}`,
      });
    }

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error("Error agregando favorito:", error);

    return NextResponse.json(
      { error: "No se pudo agregar el favorito." },
      { status: 500 }
    );
  }
}

// ELIMINAR FAVORITO
export async function DELETE(request: Request) {
  try {
   const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
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

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
         userId,
          productId,
        },
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "El producto no está en favoritos." },
        { status: 404 }
      );
    }

    await prisma.favorite.delete({
      where: {
        userId_productId: {
        userId,
          productId,
        },
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error eliminando favorito:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el favorito." },
      { status: 500 }
    );
  }
}