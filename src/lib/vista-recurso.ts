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

/**
 * Quién mira. Lo único que decide si se ve todo es `haySesion`;
 * `userId` y `esAdmin` solo sirven para la etiqueta «Solo
 * registrados», que ven el creador (en lo suyo) y la administración.
 */
export type Visor = {
  haySesion: boolean;
  userId: string | null;
  esAdmin: boolean;
};

/**
 * El visitante sin sesión. Es el valor por defecto de todo lo que
 * acepta un visor opcional: si alguien olvida pasarlo, se oculta
 * en lugar de enseñar de más.
 */
export const VISOR_ANONIMO: Visor = {
  haySesion: false,
  userId: null,
  esAdmin: false,
};

/**
 * Visor de los paneles (creador y administración), que siempre van
 * con sesión: ven todo. Sin etiqueta «Solo registrados», que es
 * cosa de las tarjetas públicas.
 */
export const VISOR_CON_SESION: Visor = {
  haySesion: true,
  userId: null,
  esAdmin: false,
};

/** Lo mínimo que hace falta saber del recurso para decidir. */
export type RecursoConVistaPrevia = {
  previewLibre: boolean;
  miniaturaBloqueada: string | null;
};

/** Campos que hay que pedir a Prisma para poder decidir. */
export const SELECCION_VISTA_PREVIA = {
  creatorId: true,
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

/** Lo que una tarjeta necesita saber para pintarse bloqueada. */
export type BloqueoTarjeta = {
  /** Data URI desenfocado, o null: entonces, fondo neutro. */
  miniatura: string | null;
};

/**
 * Recurso solo para registrados que el servidor ya pinta CON sesión:
 * la imagen real viene, y entra con la transición de desbloqueo
 * (ImagenDesbloqueada), desde la miniatura si la hay.
 */
export type Desbloqueo = {
  miniatura: string | null;
};

/** El desbloqueo de un recurso para este visor, o null si no aplica. */
export function desbloqueoDe(
  recurso: RecursoConVistaPrevia,
  haySesion: boolean
): Desbloqueo | null {
  if (recurso.previewLibre || !haySesion) return null;

  return {
    miniatura: esMiniaturaValida(recurso.miniaturaBloqueada)
      ? recurso.miniaturaBloqueada
      : null,
  };
}

/**
 * Portada y primera imagen de una tarjeta, ya filtradas para este
 * visor. Si está bloqueada, las dos van a null y solo viaja
 * `bloqueo`; `soloRegistrados` es la etiqueta para el creador
 * dueño y la administración.
 */
export function imagenesDeTarjeta<I extends { url: string }>(
  recurso: RecursoConVistaPrevia & { creatorId: string },
  coverUrl: string | null,
  image: I | null,
  visor: Visor
): {
  coverUrl: string | null;
  image: I | null;
  bloqueo: BloqueoTarjeta | null;
  desbloqueo: Desbloqueo | null;
  soloRegistrados: boolean;
} {
  const visible = imagenVisible(recurso, coverUrl, visor.haySesion);

  return {
    coverUrl: visible.url,
    image: visible.bloqueada ? null : image,
    bloqueo: visible.bloqueada ? { miniatura: visible.miniatura } : null,
    desbloqueo: desbloqueoDe(recurso, visor.haySesion),
    soloRegistrados:
      !recurso.previewLibre &&
      (visor.esAdmin ||
        (visor.userId !== null && visor.userId === recurso.creatorId)),
  };
}
