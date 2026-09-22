import type { PublicFolder } from "./types";

/**
 * Reglas de las imágenes públicas, en un solo sitio.
 *
 * Las usan dos piezas que deben coincidir siempre:
 *
 *   1. /api/uploads/imagenes/client-token, que firma el permiso
 *      de subida directa al almacén.
 *   2. Los endpoints que confirman la subida y guardan la URL.
 *
 * Si las reglas vivieran duplicadas, un cambio en una mitad
 * abriría un hueco en la otra.
 */

export type TipoImagen =
  | "product-image"
  | "creator-avatar"
  | "creator-cover";

type ReglaImagen = {
  folder: PublicFolder;
  /** Mismo límite que tenía la subida por servidor. */
  maxBytes: number;
  /** MIME permitido -> extensión con la que se guarda. */
  tiposMime: Record<string, string>;
  /**
   * true cuando el archivo pertenece a un usuario concreto:
   * el nombre debe empezar por su id, que es como se comprueba
   * la propiedad del recurso.
   */
  conPrefijoDeUsuario: boolean;
  etiqueta: string;
};

export const REGLAS: Record<TipoImagen, ReglaImagen> = {
  "product-image": {
    folder: "product-images",
    maxBytes: 10 * 1024 * 1024,
    tiposMime: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
    conPrefijoDeUsuario: false,
    etiqueta: "La imagen no puede superar los 10 MB.",
  },

  "creator-avatar": {
    folder: "creator-avatars",
    maxBytes: 8 * 1024 * 1024,
    tiposMime: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
    conPrefijoDeUsuario: true,
    etiqueta: "La foto de perfil no puede superar los 8 MB.",
  },

  "creator-cover": {
    folder: "creator-covers",
    maxBytes: 8 * 1024 * 1024,
    tiposMime: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
    conPrefijoDeUsuario: true,
    etiqueta: "La portada no puede superar los 8 MB.",
  },
};

export const TIPOS_IMAGEN = Object.keys(REGLAS) as TipoImagen[];

export function esTipoImagen(valor: unknown): valor is TipoImagen {
  return (
    typeof valor === "string" &&
    (TIPOS_IMAGEN as string[]).includes(valor)
  );
}

/** Extensiones aceptadas, derivadas de los MIME permitidos. */
export function extensionesDe(tipo: TipoImagen) {
  return Array.from(
    new Set(Object.values(REGLAS[tipo].tiposMime))
  );
}

/**
 * Comprueba que la ruta propuesta por el navegador es una de
 * las que este usuario puede escribir.
 *
 *   product-images/<uuid>.<ext>
 *   creator-avatars/<idUsuario>-<uuid>.<ext>
 *   creator-covers/<idUsuario>-<uuid>.<ext>
 *
 * El id del usuario en el nombre es lo que impide que un
 * creador pise el avatar de otro.
 */
export function pathnameValido(
  tipo: TipoImagen,
  pathname: string,
  userId: string
) {
  const regla = REGLAS[tipo];

  const extensiones = extensionesDe(tipo).join("|");

  const nombre = regla.conPrefijoDeUsuario
    ? `${escaparRegex(userId)}-[0-9a-f-]{36}`
    : "[0-9a-f-]{36}";

  const patron = new RegExp(
    `^${regla.folder}/${nombre}\\.(${extensiones})$`,
    "i"
  );

  return patron.test(pathname);
}

/** El tipo se deduce de la carpeta: no se acepta otra. */
export function tipoDesdePathname(
  pathname: string
): TipoImagen | null {
  for (const tipo of TIPOS_IMAGEN) {
    if (pathname.startsWith(`${REGLAS[tipo].folder}/`)) {
      return tipo;
    }
  }

  return null;
}

function escaparRegex(valor: string) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
