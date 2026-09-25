import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { enviarColeccionARevision } from "@/lib/colecciones-comerciales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * El creador manda su colección a revisión.
 *
 * Hermana de /api/creadores/productos/[id]/enviar-revision: el
 * mismo gesto y el mismo resultado, para que quien conozca una
 * entienda la otra. Toda la comprobación está en la librería;
 * aquí solo se resuelve quién llama.
 */
export async function POST(_request: Request, contexto: Contexto) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const { id } = await contexto.params;

    const resultado = await enviarColeccionARevision(id, {
      userId: session.userId,
      role: String(session.role ?? ""),
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Colección enviada a revisión.",
      coleccion: { id: resultado.id, slug: resultado.slug },
    });
  } catch (error) {
    console.error("POST enviar-revision colección:", error);

    return NextResponse.json(
      { error: "No se pudo enviar a revisión." },
      { status: 500 }
    );
  }
}
