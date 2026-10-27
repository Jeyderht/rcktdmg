import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { cambiarVistaPrevia } from "@/lib/vista-previa-cambio";
import { esErrorCambio, leerPeticion } from "@/lib/vista-previa-permisos";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Interruptor «Vista previa libre» de un recurso.
 *
 *   PATCH { previewLibre: boolean }
 *
 * El creador solo en sus recursos; la administración en cualquiera;
 * un cliente o un visitante recibe 403. La comprobación vive en el
 * servidor (vista-previa-permisos.ts), no en la interfaz.
 */
export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);

  const peticion = leerPeticion({ ids: [id], previewLibre: cuerpo?.previewLibre }, 1);

  if (esErrorCambio(peticion)) {
    return NextResponse.json({ error: peticion.error }, { status: peticion.status });
  }

  const resultado = await cambiarVistaPrevia(await getSession(), peticion);

  if (esErrorCambio(resultado)) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  if (resultado.actualizados === 0) {
    return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ previewLibre: resultado.previewLibre });
}
