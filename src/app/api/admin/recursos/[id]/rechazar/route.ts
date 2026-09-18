import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        { error: "No tienes permisos para rechazar recursos." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    const rejectionReason = String(
      body.rejectionReason || ""
    ).trim();

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Debes indicar el motivo del rechazo." },
        { status: 400 }
      );
    }

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason,
      },
    });

    return NextResponse.json({
      message: "Recurso rechazado correctamente.",
      product: {
        id: updatedProduct.id,
        status: updatedProduct.status,
        rejectionReason: updatedProduct.rejectionReason,
      },
    });
  } catch (error) {
    console.error("ERROR RECHAZANDO RECURSO:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}