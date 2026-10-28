/**
 * Versión limpia: la parte que también usa el navegador. Va aparte
 * de imagen-limpia.ts, que consulta la base y solo vive en el
 * servidor.
 */

/** Prefijo de la ruta que sirve el original sin marca. */
export const RUTA_VERSION_LIMPIA = "/api/imagenes/limpia/";

/** true si la URL es de la versión limpia (se sirve sin optimizar). */
export function esUrlVersionLimpia(url: string): boolean {
  return url.startsWith(RUTA_VERSION_LIMPIA);
}
