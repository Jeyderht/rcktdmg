import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { paraUsuario } from "@/lib/recomendaciones";

export const dynamic = "force-dynamic";

/**
 * Recomendaciones para la sesión actual.
 *
 * Existe solo porque /mi-cuenta es un componente de cliente y
 * no puede consultar la base directamente. La home y la ficha
 * de producto son Server Components y llaman a la librería sin
 * pasar por aquí: no se duplica el camino sin motivo.
 *
 * SEGURIDAD
 *
 * El usuario sale de la sesión; no hay parámetro para pedir
 * las de otra persona. La respuesta contiene ÚNICAMENTE
 * recursos publicados —los mismos que cualquiera puede ver en
 * la tienda— y nunca las señales que se usaron para ordenar:
 * ni compras, ni favoritos, ni puntuaciones.
 */
export async function GET() {
  try {
    const session = await getSession();

    const bloque = await paraUsuario(session?.userId ?? null, 5);

    return NextResponse.json({ bloque });
  } catch (error) {
    console.error("GET /api/recomendaciones:", error);

    // Sin recomendaciones la página sigue siendo usable.
    return NextResponse.json({ bloque: null });
  }
}
