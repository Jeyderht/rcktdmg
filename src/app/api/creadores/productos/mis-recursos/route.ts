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
    const role = session.role as string;

    // Verificar que sea creador
    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a estos recursos." },
        { status: 403 }
      );
    }

    // Buscar recursos del creador
    const products = await prisma.product.findMany({
      where: {
        creatorId: userId,
      },
      include: {
        category: {
          select: {
            name: true,
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
            slug: product.slug,name: product.name,
      description: product.description,
      price: product.price.toString(),
      accessType: product.accessType,
      status: product.status,
      coverUrl: product.coverUrl,
      rejectionReason: product.rejectionReason,
      previewUrl: product.previewUrl,
      fileUrl: product.fileUrl,
      category: product.category
        ? {
          name: product.category.name,
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


