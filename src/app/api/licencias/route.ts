import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { obtenerLicencia, obtenerLicencias } from "@/lib/licencias";

export const dynamic = "force-dynamic";

/**
 * Licencias del usuario que ha iniciado sesión.
 *
 * SEGURIDAD: el titular sale SIEMPRE de la sesión firmada y va
 * dentro del WHERE de la consulta. No hay ningún parámetro que
 * permita pedir las licencias de otra persona, ni por id ni
 * por código: pedir una que no es tuya devuelve 404, igual que
 * una que no existe.
 *
 *   GET /api/licencias        → todas las propias
 *   GET /api/licencias?id=…   → una concreta (id o código)
 */
export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const id = (searchParams.get("id") ?? "").trim();

    if (id) {
      const licencia = await obtenerLicencia(session.userId, id);

      if (!licencia) {
        return NextResponse.json(
          { error: "Licencia no encontrada." },
          { status: 404 }
        );
      }

      return NextResponse.json({ licencia });
    }

    const licencias = await obtenerLicencias(session.userId);

    return NextResponse.json({
      licencias,
      total: licencias.length,
      vigentes: licencias.filter((l) => l.status === "ACTIVE").length,
    });
  } catch (error) {
    console.error("GET /api/licencias:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las licencias." },
      { status: 500 }
    );
  }
}
