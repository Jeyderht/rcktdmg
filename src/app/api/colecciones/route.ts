import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

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

// LISTAR COLECCIONES
export async function GET() {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const collections = await prisma.collection.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                coverUrl: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      collections,
    });
  } catch (error) {
    console.error("Error obteniendo colecciones:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las colecciones." },
      { status: 500 }
    );
  }
}

// CREAR COLECCIÓN
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

    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la colección es obligatorio." },
        { status: 400 }
      );
    }

    if (name.length > 80) {
      return NextResponse.json(
        {
          error:
            "El nombre de la colección no puede superar los 80 caracteres.",
        },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        userId,
        name,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                coverUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error("Error creando colección:", error);

    return NextResponse.json(
      { error: "No se pudo crear la colección." },
      { status: 500 }
    );
  }
}

// ELIMINAR COLECCIÓN
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

    const collectionId = String(body.collectionId || "").trim();

    if (!collectionId) {
      return NextResponse.json(
        { error: "Falta el ID de la colección." },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    await prisma.collection.delete({
      where: {
        id: collectionId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error eliminando colección:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la colección." },
      { status: 500 }
    );
  }
}

// EDITAR COLECCIÓN
export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const collectionId = String(body.collectionId || "").trim();
    const name = String(body.name || "").trim();

    /*
      Esta ruta atiende dos cambios distintos, y cada uno puede
      llegar solo: renombrar la colección y publicarla o volver
      a hacerla privada. Se valida únicamente lo que llega.
    */
    const cambiaNombre = body.name !== undefined;
    const cambiaVisibilidad = typeof body.isPublic === "boolean";

    if (!collectionId) {
      return NextResponse.json(
        { error: "Falta el ID de la colección." },
        { status: 400 }
      );
    }

    if (!cambiaNombre && !cambiaVisibilidad) {
      return NextResponse.json(
        { error: "No hay nada que actualizar." },
        { status: 400 }
      );
    }

    if (cambiaNombre && !name) {
      return NextResponse.json(
        { error: "El nombre de la colección es obligatorio." },
        { status: 400 }
      );
    }

    if (cambiaNombre && name.length > 80) {
      return NextResponse.json(
        {
          error:
            "El nombre de la colección no puede superar los 80 caracteres.",
        },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    const updatedCollection = await prisma.collection.update({
      where: {
        id: collectionId,
      },
      data: {
        ...(cambiaNombre ? { name } : {}),
        ...(cambiaVisibilidad ? { isPublic: body.isPublic } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                coverUrl: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
    });
  } catch (error) {
    console.error("Error editando colección:", error);

    return NextResponse.json(
      { error: "No se pudo editar la colección." },
      { status: 500 }
    );
  }
}
