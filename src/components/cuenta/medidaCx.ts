import { medidaExigidaPara, type TipoPieza } from "@/lib/tipos-publicacion";

/**
 * Categoría y medida de un recurso para las tarjetas de los inicios.
 *
 * Solo presentación: la regla de qué medida lleva cada categoría es
 * la de `medidaExigidaPara`, la misma que valida al subir y que usa
 * la tarjeta de la tienda. Aquí solo se traduce a lo que se pinta:
 * nombre, «1080 × 1920» y la proporción CSS del marco.
 */

/** Orden de las filas por categoría (Eventos → Corporativos → …). */
export const ORDEN_CATEGORIAS = ["eventos", "corporativos", "social-media", "general", "plantillas"];

const NOMBRES: Record<string, string> = {
  eventos: "Eventos",
  corporativos: "Corporativos",
  "social-media": "Social Media",
  general: "General",
  plantillas: "Plantillas",
};

export type CategoriaRecurso = {
  /** Slug real de la categoría del recurso. */
  slug: string | null;
  pieza?: TipoPieza | null;
  /** Medidas reales de la portada, si el recurso las guarda: mandan. */
  ancho?: number | null;
  alto?: number | null;
};

export function nombreCategoria(slug: string | null | undefined): string {
  if (!slug) return "Sin categoría";
  return NOMBRES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export type MedidaCx = {
  nombre: string;
  /** «1080 × 1920» o «Medida libre». */
  medida: string;
  /** Proporción CSS del marco; null: la de la propia imagen. */
  proporcion: string | null;
};

export function medidaCx({ slug, pieza, ancho, alto }: CategoriaRecurso): MedidaCx {
  const exigida = medidaExigidaPara(slug, pieza ?? null);
  const reales = ancho && alto ? { ancho, alto } : null;
  const usada = reales ?? (exigida ? { ancho: exigida.ancho, alto: exigida.alto } : null);

  return {
    nombre: nombreCategoria(slug),
    medida: usada ? `${usada.ancho} × ${usada.alto}` : "Medida libre",
    proporcion: usada ? `${usada.ancho} / ${usada.alto}` : null,
  };
}

/** Posición de una categoría en el orden de las filas. */
export function ordenCategoria(slug: string | null): number {
  const i = slug ? ORDEN_CATEGORIAS.indexOf(slug) : -1;
  return i === -1 ? ORDEN_CATEGORIAS.length : i;
}
