import { TAG_PACK } from "@/lib/catalogo";

/**
 * Etiquetas de recurso: parte compartida.
 *
 * Este módulo NO toca la base de datos a propósito. Lo
 * importan también componentes de cliente (el selector de
 * etiquetas del Creator Studio), y arrastrar Prisma hasta el
 * navegador rompería la compilación.
 *
 * Las funciones que consultan o escriben viven en
 * src/lib/tags.ts, que reexporta todo esto.
 *
 * Todo pasa por aquí: normalización, alta, sincronización y
 * la lista de etiquetas protegidas. El objetivo es que no
 * existan dos etiquetas que signifiquen lo mismo ("Redes
 * Sociales", "redes sociales", "Redes  Sociales") y que
 * ninguna ruta pueda romper una etiqueta estructural.
 */

/** Longitud máxima del nombre visible de una etiqueta. */
export const LARGO_MAXIMO_TAG = 40;

/** Tope de etiquetas por recurso, para que la ficha respire. */
export const MAXIMO_TAGS_POR_RECURSO = 15;

/**
 * Etiquetas que el sistema usa como estructura, no como
 * descripción.
 *
 * `pack` decide qué recursos son packs en la tienda, en el
 * filtro, en la ficha y en el panel de administración. Si
 * alguien la renombra o la borra, los packs desaparecen del
 * catálogo sin ningún error visible. Por eso no se gestiona
 * como una etiqueta normal.
 *
 * Quien necesite marcar o desmarcar un pack debe usar el
 * interruptor del formulario de recurso, que pasa por
 * `aplicarEtiquetaPack` en src/lib/producto-metadata.ts.
 */
export const TAGS_PROTEGIDOS: readonly string[] = [TAG_PACK];

export function esTagProtegido(slug: string): boolean {
  return TAGS_PROTEGIDOS.includes(slug.toLowerCase());
}

/**
 * Slug canónico de una etiqueta.
 *
 * Quita acentos y signos para que "Diseño Gráfico" y
 * "diseno grafico" acaben en el mismo sitio. El slug es la
 * identidad real de la etiqueta; el nombre es solo su
 * presentación.
 */
export function slugificarTag(valor: string): string {
  return valor
    .normalize("NFD")
    // Marcas diacríticas: la tilde de "ó", la virgulilla de "ñ".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Nombre visible: sin espacios de sobra, con su longitud acotada. */
export function normalizarNombreTag(valor: string): string {
  return valor.trim().replace(/\s+/g, " ").slice(0, LARGO_MAXIMO_TAG);
}

export type TagNormalizado = { nombre: string; slug: string };

/**
 * Limpia una lista de nombres escritos por una persona.
 *
 * Descarta los vacíos, los que no dejan slug (solo signos) y
 * los repetidos, conservando el orden en que se escribieron.
 */
export function normalizarListaTags(
  valores: unknown
): TagNormalizado[] {
  if (!Array.isArray(valores)) return [];

  const vistos = new Set<string>();
  const salida: TagNormalizado[] = [];

  for (const crudo of valores) {
    if (typeof crudo !== "string") continue;

    const nombre = normalizarNombreTag(crudo);
    const slug = slugificarTag(nombre);

    if (!nombre || !slug) continue;
    if (vistos.has(slug)) continue;

    vistos.add(slug);
    salida.push({ nombre, slug });

    if (salida.length >= MAXIMO_TAGS_POR_RECURSO) break;
  }

  return salida;
}

/** Etiquetas visibles de un recurso, sin las estructurales. */
export function tagsVisibles<T extends { slug: string }>(
  etiquetas: T[]
): T[] {
  return etiquetas.filter((t) => !esTagProtegido(t.slug));
}
