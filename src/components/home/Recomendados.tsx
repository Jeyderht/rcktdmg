import { paraUsuario } from "@/lib/recomendaciones";
import { getSession } from "@/lib/session";

/**
 * Recomendaciones de la home (pestaña «Para ti» del catálogo).
 *
 * El texto depende de si hay historial real: con compras o
 * favoritos dice que es según lo que ha comprado y guardado;
 * sin ellos dice lo que de verdad está mostrando —lo mejor
 * valorado y más guardado—, en lugar de fingir una
 * personalización que no existe.
 *
 * Devuelve null si no hay recursos que mostrar: entonces la
 * pestaña no se pinta.
 */
export async function datosRecomendados() {
  const session = await getSession();

  return paraUsuario(session?.userId ?? null, 5);
}
