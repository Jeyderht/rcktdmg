import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { cambiarVistaPrevia, type ResultadoCambio } from "@/lib/vista-previa-cambio";
import { esErrorCambio, leerPeticion } from "@/lib/vista-previa-permisos";

export const dynamic = "force-dynamic";

/**
 * Acción masiva de la administración: «vista previa libre» o «solo
 * registrados» en varios recursos a la vez.
 *
 *   POST { ids: string[], previewLibre: boolean }
 *
 * Solo ADMIN. Como mucho MAX_RECURSOS_POR_CAMBIO por operación.
 * Devuelve el resumen: cuántos cambiaron y qué ids no existían.
 */
export async function POST(request: Request) {
  const session = await getSession();

  // La acción masiva es solo de administración, también para creadores.
  if (session?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo la administración puede cambiar varios recursos a la vez." },
      { status: 403 }
    );
  }

  const peticion = leerPeticion(await request.json().catch(() => null));

  if (esErrorCambio(peticion)) {
    return NextResponse.json({ error: peticion.error }, { status: peticion.status });
  }

  const resultado = await cambiarVistaPrevia(session, peticion);

  if (esErrorCambio(resultado)) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json(resultado satisfies ResultadoCambio);
}
