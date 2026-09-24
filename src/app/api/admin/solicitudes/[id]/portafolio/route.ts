import { NextResponse } from "next/server";
import path from "node:path";

import { requireRole } from "@/lib/session";
import { archivoDePortafolio } from "@/lib/solicitudes";
import { getPrivate } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Entrega el archivo de portafolio de una solicitud.
 *
 * El portafolio vive en el almacén PRIVADO y su URL no sale
 * nunca hacia el navegador: el archivo se sirve desde aquí,
 * por streaming, después de comprobar el rol. Es el mismo
 * patrón que /api/downloads/[id] para los archivos vendidos.
 *
 * Solo ADMIN. Ni el propio solicitante lo descarga por esta
 * vía: él ya tiene su archivo.
 */
export async function GET(_req: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { id } = await contexto.params;

    const ref = await archivoDePortafolio(id);

    if (!ref) {
      return NextResponse.json(
        { error: "Esta solicitud no tiene archivo de portafolio." },
        { status: 404 }
      );
    }

    const objeto = await getPrivate(ref);

    if (!objeto) {
      return NextResponse.json(
        { error: "El archivo ya no está disponible." },
        { status: 404 }
      );
    }

    const nombre = path.basename(new URL(ref, "http://x").pathname);

    return new NextResponse(objeto.body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET portafolio:", error);

    return NextResponse.json(
      { error: "No se pudo abrir el portafolio." },
      { status: 500 }
    );
  }
}
