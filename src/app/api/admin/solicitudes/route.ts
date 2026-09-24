import { NextResponse } from "next/server";

import { requireRole } from "@/lib/session";
import { contarSolicitudes, listarSolicitudes } from "@/lib/solicitudes";

export const dynamic = "force-dynamic";

/**
 * Cola de solicitudes de creador. Solo administración.
 *
 * No existe ninguna versión pública de esta ruta: quién ha
 * pedido ser creador, con qué portafolio y por qué se rechazó
 * es información de la revisión, no del catálogo.
 */
export async function GET(request: Request) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const estado = searchParams.get("estado") ?? undefined;

    const [solicitudes, recuento] = await Promise.all([
      listarSolicitudes(estado),
      contarSolicitudes(),
    ]);

    return NextResponse.json({ solicitudes, recuento });
  } catch (error) {
    console.error("GET /api/admin/solicitudes:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las solicitudes." },
      { status: 500 }
    );
  }
}
