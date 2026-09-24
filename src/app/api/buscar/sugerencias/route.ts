import { NextResponse } from "next/server";

import { obtenerSugerencias, terminosDestacados } from "@/lib/busqueda";

export const dynamic = "force-dynamic";

/**
 * Sugerencias del buscador.
 *
 * Ruta pública: solo expone recursos publicados, categorías
 * con recursos, etiquetas en uso y creadores aprobados. Nada
 * de esto es información privada.
 *
 * Sin texto devuelve los términos destacados, que es lo que
 * se enseña al abrir el buscador antes de escribir.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const consulta = (searchParams.get("q") ?? "").trim();

    if (!consulta) {
      return NextResponse.json({
        sugerencias: [],
        destacados: await terminosDestacados(),
      });
    }

    return NextResponse.json({
      sugerencias: await obtenerSugerencias(consulta),
      destacados: [],
    });
  } catch (error) {
    console.error("GET /api/buscar/sugerencias:", error);

    // El buscador debe seguir funcionando sin sugerencias.
    return NextResponse.json({ sugerencias: [], destacados: [] });
  }
}
