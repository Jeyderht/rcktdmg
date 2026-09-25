import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import {
  publicarColeccion,
  rechazarColeccion,
} from "@/lib/colecciones-comerciales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Administración resuelve una colección en revisión.
 *
 * Una sola ruta para las dos salidas, porque son la misma
 * decisión tomada en sentidos opuestos: `accion` dice cuál.
 * Rechazar exige motivo; publicar exige que la colección siga
 * cumpliendo las condiciones, que se comprueban dentro.
 */
export async function POST(request: Request, contexto: Contexto) {
  try {
    const session = await getSession();

    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await contexto.params;

    const body = await request.json().catch(() => ({}));

    const resultado =
      body.accion === "rechazar"
        ? await rechazarColeccion(id, String(body.rejectionReason ?? ""))
        : body.accion === "publicar"
          ? await publicarColeccion(id)
          : null;

    if (!resultado) {
      return NextResponse.json(
        { error: 'Indica `accion`: "publicar" o "rechazar".' },
        { status: 400 }
      );
    }

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        body.accion === "rechazar"
          ? "Colección rechazada."
          : "Colección publicada.",
      coleccion: { id: resultado.id, slug: resultado.slug },
    });
  } catch (error) {
    console.error("POST admin colección:", error);

    return NextResponse.json(
      { error: "No se pudo completar." },
      { status: 500 }
    );
  }
}
