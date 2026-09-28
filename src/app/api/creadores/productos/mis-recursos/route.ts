import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Obtener la sesión
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    // Verificar JWT
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha expirado." },
        { status: 401 }
      );
    }

    const userId = session.userId as string;

    // Verificar que sea creador
    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a estos recursos." },
        { status: 403 }
      );
    }

    /*
      Se piden columnas concretas, no el recurso entero.

      Antes esto era un `include`, que en Prisma significa
      "todas las columnas de Product más la relación". Traía
      `fileUrl` —la referencia al almacén privado—, la
      descripción completa de cada recurso y el resto de campos
      que este panel no pinta. Ahora viaja solo lo que se
      enseña.

      `fileUrl` sigue sin salir hacia el navegador: para
      descargar se usa /api/downloads/[id], que comprueba la
      compra.
    */
    const products = await prisma.product.findMany({
      where: {
        creatorId: userId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        price: true,
        accessType: true,
        status: true,
        coverUrl: true,
        /* Medidas reales: el selector de colecciones las enseña. */
        coverWidth: true,
        coverHeight: true,
        /* Con ella, el panel enseña cada recurso en su marco. */
        pieceType: true,
        rejectionReason: true,
        previewUrl: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            /* El slug identifica el tipo de pieza sin adivinar por el nombre. */
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Preparar respuesta
    const formattedProducts = products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      accessType: product.accessType,
      status: product.status,
      coverUrl: product.coverUrl,
      coverWidth: product.coverWidth,
      coverHeight: product.coverHeight,
      pieceType: product.pieceType,
      rejectionReason: product.rejectionReason,
      previewUrl: product.previewUrl,
      category: product.category
        ? {
          name: product.category.name,
          slug: product.category.slug,
        }
        : null,
      createdAt: product.createdAt.toISOString(),
    }));

    return NextResponse.json({
      products: formattedProducts,
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO RECURSOS DEL CREADOR:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}


