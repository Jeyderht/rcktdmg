/**
 * Qué puede ver un usuario de las imágenes de un recurso.
 *
 * Es la ÚNICA decisión sobre «vista previa libre» frente a «solo
 * para registrados», y se toma en el servidor. El cliente nunca
 * decide: recibe ya filtrado lo que puede enseñar. Un recurso
 * bloqueado no lleva su URL real en las props, ni en el HTML, ni
 * en el JSON de las APIs, ni en og:image.
 *
 *   - Con sesión (cualquier rol): todo.
 *   - Sin sesión y recurso libre (`previewLibre`): todo.
 *   - Sin sesión y recurso solo para registrados: solo la
 *     miniatura desenfocada (`miniaturaBloqueada`, un data URI sin
 *     URL ni archivo), o nada si todavía no existe.
 *
 * Las páginas públicas se pintan en el servidor en cada petición
 * (ninguna es estática), así que cada visitante recibe su versión.
 * Si alguna pasara a estática o con ISR, serviría la misma a todos:
 * tendría que dejar de usar esto o dejar de ser estática.
 */

/** Lo mínimo que hace falta saber del recurso para decidir. */
export type RecursoConVistaPrevia = {
  previewLibre: boolean;
  miniaturaBloqueada: string | null;
};

/** Campos que hay que pedir a Prisma para poder decidir. */
export const SELECCION_VISTA_PREVIA = {
  previewLibre: true,
  miniaturaBloqueada: true,
} as const;

/**
 * true si a este visitante hay que enseñarle el recurso bloqueado.
 * `haySesion` es lo único que cuenta del visitante: con sesión,
 * sea del rol que sea, se ve todo.
 */
export function vistaPreviaBloqueada(
  recurso: Pick<RecursoConVistaPrevia, "previewLibre">,
  haySesion: boolean
): boolean {
  return !haySesion && !recurso.previewLibre;
}

/**
 * Lo que se le puede dar al cliente en lugar de una imagen real.
 * Si no hay bloqueo, `url` es la misma; si lo hay, `url` es null y
 * solo viaja la miniatura desenfocada (o nada).
 */
export type ImagenVisible = {
  url: string | null;
  bloqueada: boolean;
  /** Data URI desenfocado; solo cuando está bloqueada. */
  miniatura: string | null;
};

/** Filtra UNA imagen del recurso según quién mira. */
export function imagenVisible(
  recurso: RecursoConVistaPrevia,
  url: string | null | undefined,
  haySesion: boolean
): ImagenVisible {
  if (vistaPreviaBloqueada(recurso, haySesion)) {
    return {
      url: null,
      bloqueada: true,
      miniatura: esMiniaturaValida(recurso.miniaturaBloqueada)
        ? recurso.miniaturaBloqueada
        : null,
    };
  }

  return { url: url ?? null, bloqueada: false, miniatura: null };
}

/*
  La miniatura tiene que ser un data URI de imagen y pequeño. Si
  por error se guardara otra cosa (una URL, un archivo grande), no
  se envía: es la última barrera para que un recurso bloqueado no
  acabe sirviendo píxeles reales.
*/
const TOPE_MINIATURA = 4096;

function esMiniaturaValida(valor: string | null): valor is string {
  return (
    typeof valor === "string" &&
    valor.length <= TOPE_MINIATURA &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(valor)
  );
}
