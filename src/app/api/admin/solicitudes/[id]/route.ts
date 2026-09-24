import { NextResponse } from "next/server";

import { requireRole } from "@/lib/session";
import { aprobarSolicitud, rechazarSolicitud } from "@/lib/solicitudes";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Aprueba o rechaza una solicitud de creador.
 *
 * Una sola ruta con dos acciones explícitas en lugar de dos
 * endpoints: la decisión es la misma operación con distinto
 * resultado, y así el estado no se puede escribir a mano
 * enviando `status` en el cuerpo.
 */
export async function PATCH(request: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { id } = await contexto.params;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const accion = String(body.accion ?? "");

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json(
        { error: "Indica si apruebas o rechazas la solicitud." },
        { status: 400 }
      );
    }

    const resultado =
      accion === "aprobar"
        ? await aprobarSolicitud(id, session.userId)
        : await rechazarSolicitud(id, session.userId, body.motivo);

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({ success: true, id: resultado.id });
  } catch (error) {
    console.error("PATCH /api/admin/solicitudes/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo revisar la solicitud." },
      { status: 500 }
    );
  }
}
