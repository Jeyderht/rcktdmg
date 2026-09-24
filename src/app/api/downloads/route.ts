import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
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

    const downloads = await prisma.download.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverUrl: true,
            description: true,
            /*
              fileUrl NO se devuelve: es la referencia al
              almacén privado y el cliente no la necesita para
              nada —descarga por /api/downloads/[id], que
              comprueba sesión, pedido y licencia—. La página
              nunca la usó; solo viajaba por la red sin motivo.
            */
          },
        },
        order: {
          select: {
            id: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        order: {
          createdAt: "desc",
        },
      },
    });

    return NextResponse.json({
      downloads,
    });
  } catch (error) {
    console.error("Error obteniendo descargas:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las descargas." },
      { status: 500 }
    );
  }
}