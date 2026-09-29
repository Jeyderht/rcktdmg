import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { revisarPortadaDelRecurso } from "@/lib/portada-exigida";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha expirado." },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para publicar recursos." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    if (product.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: "El recurso no está pendiente de revisión." },
        { status: 400 }
      );
    }

    /*
      Se vuelve a comprobar la portada antes de publicar.

      Para llegar aquí el recurso ya pasó por revisión, donde
      se comprobó lo mismo; pero entre una cosa y otra pudo
      cambiarse la portada, y sobre todo hay recursos que
      quedaron en PENDING_REVIEW antes de que esta regla
      existiera. Publicar es la puerta que deja el recurso a la
      vista de todos: conviene que sea la más estricta.
    */
    const problemaPortada = await revisarPortadaDelRecurso(id);

    if (problemaPortada) {
      return NextResponse.json(
        { error: problemaPortada },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        status: "PUBLISHED",
      },
    });

    /*
      Un solo aviso por publicación: la ruta ya rechaza arriba
      cualquier recurso que no esté en PENDING_REVIEW, así que
      pulsar "publicar" dos veces devuelve 400 la segunda y no
      llega hasta aquí.
    */
    await crearNotificacion({
      userId: product.creatorId,
      type: "PRODUCT_PUBLISHED",
      title: "Recurso publicado",
      body: `${product.name} ya está visible en la tienda.`,
      href: `/tienda/${product.slug}`,
    });

    return NextResponse.json({
      message: "Recurso publicado correctamente.",
      product: {
        id: updatedProduct.id,
        status: updatedProduct.status,
      },
    });
  } catch (error) {
    console.error("ERROR PUBLICANDO RECURSO:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}