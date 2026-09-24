/**
 * Versiones de recurso: parte compartida con el navegador.
 *
 * No toca la base de datos: lo importan el formulario del
 * Creator Studio y el historial de la ficha pública. Las
 * funciones que leen o escriben están en src/lib/versiones.ts.
 */

export const LARGO_VERSION = 20;
export const LARGO_CHANGELOG = 1000;

/**
 * Normaliza un número de versión.
 *
 * Acepta lo que la gente escribe de verdad —"1.0", "v2", "2.1.3"—
 * y lo deja en una forma canónica sin la "v", para que "v1.0" y
 * "1.0" no acaben siendo dos versiones distintas del mismo
 * recurso.
 *
 * Devuelve null si no es un número de versión reconocible.
 */
export function normalizarVersion(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  const limpio = valor
    .trim()
    .toLowerCase()
    .replace(/^v\.?\s*/, "")
    .slice(0, LARGO_VERSION);

  // Entre uno y cuatro grupos de dígitos separados por puntos,
  // con un sufijo opcional tipo "-beta".
  if (!/^\d+(\.\d+){0,3}(-[a-z0-9.]{1,10})?$/.test(limpio)) {
    return null;
  }

  return limpio;
}

/** Cómo se muestra: siempre con la "v" delante. */
export function mostrarVersion(version: string): string {
  return `v${version}`;
}

/**
 * Compara dos versiones numéricamente.
 *
 * "10.0" es posterior a "9.0", que ordenado como texto saldría
 * al revés. El sufijo (-beta) desempata al final.
 */
export function compararVersiones(a: string, b: string): number {
  const partes = (v: string) =>
    v.split("-")[0].split(".").map((n) => Number(n) || 0);

  const pa = partes(a);
  const pb = partes(b);

  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;

    if (da !== db) return da - db;
  }

  return a.localeCompare(b);
}

export function limpiarChangelog(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  const limpio = valor
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LARGO_CHANGELOG);

  return limpio || null;
}

/**
 * Versión tal y como viaja al navegador.
 *
 * NO lleva `fileUrl`: esa referencia apunta al almacén privado
 * y no tiene por qué salir del servidor ni siquiera hacia el
 * creador, que ya tiene el archivo. La descarga la sirve
 * /api/downloads/[id] tras comprobar compra y licencia.
 */
export type VersionVista = {
  id: string;
  version: string;
  fileFormat: string | null;
  changelog: string | null;
  isCurrent: boolean;
  createdAt: string;
};
