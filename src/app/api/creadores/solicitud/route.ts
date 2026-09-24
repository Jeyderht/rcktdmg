import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { enviarSolicitud, solicitudDe } from "@/lib/solicitudes";

export const dynamic = "force-dynamic";

/**
 * Solicitud propia para convertirse en creador.
 *
 * SEGURIDAD: el `userId` sale siempre de la sesión firmada.
 * El cuerpo de la petición solo aporta los datos del perfil
 * solicitado; `role`, `status`, fechas y revisor no se leen de
 * ahí ni aunque vengan, porque `enviarSolicitud` solo toma los
 * campos que conoce.
 */

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const solicitud = await solicitudDe(session.userId);

    return NextResponse.json({
      solicitud,
      rol: session.role,
    });
  } catch (error) {
    console.error("GET /api/creadores/solicitud:", error);

    return NextResponse.json(
      { error: "No se pudo cargar tu solicitud." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para solicitar ser creador." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const resultado = await enviarSolicitud(
      session.userId,
      body as Record<string, unknown>
    );

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json(
      { success: true, id: resultado.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/creadores/solicitud:", error);

    return NextResponse.json(
      { error: "No se pudo enviar la solicitud." },
      { status: 500 }
    );
  }
}
