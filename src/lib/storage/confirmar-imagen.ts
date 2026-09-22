import { head } from "@vercel/blob";

import { tokenPublico, HOST_BLOB_PUBLICO } from "./blob";
import {
  REGLAS,
  pathnameValido,
  tipoDesdePathname,
  type TipoImagen,
} from "./imagenes";

export type ImagenConfirmada = {
  url: string;
  pathname: string;
  size: number;
  contentType: string | null;
};

export type ErrorConfirmacion = {
  error: string;
  status: number;
};

/**
 * Comprueba en el servidor una imagen que el navegador acaba
 * de subir directamente al almacén público.
 *
 * Es el contrapeso de la subida directa: como el archivo no
 * pasó por el servidor, aquí se verifica contra el almacén que
 * el objeto existe de verdad y que cumple las mismas reglas que
 * se firmaron. Solo después se guarda la URL en la base.
 *
 * Devuelve el objeto confirmado o el error con su código.
 */
export async function confirmarImagenSubida({
  tipoEsperado,
  blobUrl,
  userId,
}: {
  tipoEsperado: TipoImagen;
  blobUrl: unknown;
  userId: string;
}): Promise<ImagenConfirmada | ErrorConfirmacion> {
  if (typeof blobUrl !== "string" || !blobUrl) {
    return { error: "Falta la URL de la imagen.", status: 400 };
  }

  let url: URL;

  try {
    url = new URL(blobUrl);
  } catch {
    return { error: "La URL de la imagen no es válida.", status: 400 };
  }

  // Solo el almacén público y solo por HTTPS.
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(`.${HOST_BLOB_PUBLICO}`)
  ) {
    return {
      error: "La imagen no pertenece al almacén público.",
      status: 400,
    };
  }

  const pathname = decodeURIComponent(url.pathname).replace(
    /^\//,
    ""
  );

  const tipo = tipoDesdePathname(pathname);

  if (!tipo || tipo !== tipoEsperado) {
    return {
      error: "La imagen no está en la carpeta que corresponde.",
      status: 400,
    };
  }

  // Misma comprobación de propiedad que al firmar el permiso.
  if (!pathnameValido(tipo, pathname, userId)) {
    return { error: "Ruta de imagen no permitida.", status: 403 };
  }

  const regla = REGLAS[tipo];

  let meta;

  try {
    meta = await head(blobUrl, { token: tokenPublico() });
  } catch {
    return {
      error: "La imagen no existe en el almacén.",
      status: 404,
    };
  }

  if (!meta) {
    return {
      error: "La imagen no existe en el almacén.",
      status: 404,
    };
  }

  if (meta.size === 0) {
    return { error: "La imagen está vacía.", status: 400 };
  }

  if (meta.size > regla.maxBytes) {
    return { error: regla.etiqueta, status: 400 };
  }

  if (
    meta.contentType &&
    !Object.keys(regla.tiposMime).includes(meta.contentType)
  ) {
    return {
      error: "Formato no permitido. Usa JPG, PNG o WEBP.",
      status: 400,
    };
  }

  return {
    url: blobUrl,
    pathname,
    size: meta.size,
    contentType: meta.contentType ?? null,
  };
}

export function esErrorDeConfirmacion(
  valor: ImagenConfirmada | ErrorConfirmacion
): valor is ErrorConfirmacion {
  return "error" in valor;
}
