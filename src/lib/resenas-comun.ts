/**
 * Reseñas: parte compartida con el navegador.
 *
 * No toca la base de datos: lo importan los componentes de
 * cliente de la ficha de producto y del panel de moderación.
 * Las funciones que leen o escriben están en
 * src/lib/resenas.ts, que reexporta todo esto.
 */

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;

/** Tope del comentario. Suficiente para explicarse, no para un ensayo. */
export const LARGO_COMENTARIO = 1000;

export const RESENAS_POR_PAGINA = 10;

export type EstadoResena = "PUBLISHED" | "HIDDEN";

/** Nota válida: entero entre 1 y 5. Nada de medias estrellas. */
export function notaValida(valor: unknown): valor is number {
  const n = Number(valor);

  return (
    Number.isInteger(n) && n >= NOTA_MINIMA && n <= NOTA_MAXIMA
  );
}

/** Comentario normalizado, o null si queda vacío. */
export function limpiarComentario(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  // Se respetan los saltos de línea; solo se colapsan los
  // espacios sobrantes y las líneas en blanco de más.
  const limpio = valor
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LARGO_COMENTARIO);

  return limpio || null;
}

/** Reseña tal y como viaja de la API al navegador. */
export type ResenaVista = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  autor: {
    /** Nombre público. Nunca el correo. */
    nombre: string;
    avatarUrl: string | null;
    /** Solo si tiene perfil público de creador. */
    username: string | null;
  };
  /** true si la reseña es de quien está mirando. */
  esMia: boolean;
};

export type ResumenValoracion = {
  /** Media de 1 a 5, o null si todavía no hay reseñas. */
  media: number | null;
  total: number;
  /** Cuántas reseñas hay de cada nota, de 1 a 5. */
  reparto: Record<1 | 2 | 3 | 4 | 5, number>;
};

export const REPARTO_VACIO: ResumenValoracion["reparto"] = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

/** "4,5" con una decimal, o null. */
export function formatearMedia(media: number | null): string | null {
  if (media === null) return null;

  return media.toFixed(1).replace(".", ",");
}
