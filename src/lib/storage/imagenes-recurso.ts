import { randomUUID } from "node:crypto";

import { generarCopiaConMarca } from "@/lib/marca-agua";

import { blobStorage, esReferenciaBlob } from "./blob";
import { driverActual } from "./index";
import { localStorage } from "./local";
import type { PrivateObject, StorageAdapter } from "./types";

/**
 * Imágenes de recurso (portada y galería) con marca de agua.
 *
 * Cada imagen se guarda dos veces, con el mismo identificador:
 *
 *   privado  product-originals/<id>      el original, sin marca
 *   público  product-previews/<id>.jpg   la copia con marca
 *
 * En la base solo se guarda la URL de la copia. El original no
 * necesita campo propio: se localiza por el <id> de su copia. Y
 * la carpeta dice el estado de cada imagen: una URL que sigue en
 * product-images/ es de antes de la marca y está pendiente del
 * relleno.
 */

const CARPETA_COPIAS = "product-previews";
const CARPETA_ORIGINALES = "product-originals";

const PATRON_COPIA = new RegExp(
  `(?:^|/)${CARPETA_COPIAS}/([0-9a-f-]{36})\\.jpg$`,
  "i"
);

/** El <id> de una copia con marca, o null si la URL no es una. */
export function idDeCopia(url: string | null | undefined): string | null {
  if (!url) return null;

  let ruta: string;

  try {
    // Las de Blob son absolutas; las locales, /product-previews/….
    ruta = decodeURIComponent(new URL(url, "http://local").pathname);
  } catch {
    return null;
  }

  return PATRON_COPIA.exec(ruta)?.[1] ?? null;
}

/** true si la URL ya es una copia con marca de agua. */
export function esCopiaConMarca(url: string | null | undefined): boolean {
  return idDeCopia(url) !== null;
}

/*
  El original vive en el mismo almacén que su copia: una copia
  de Blob tiene su original en el Blob privado, y una local, en
  storage/. Así no depende del driver activo.
*/
function almacenDeLaCopia(url: string): StorageAdapter {
  return esReferenciaBlob(url) ? blobStorage : localStorage;
}

export type ImagenGuardada = {
  /** URL pública de la copia con marca: lo único que va a la base. */
  url: string;
  /** Medidas de la copia (a lo sumo 1080 px de ancho). */
  width: number;
  height: number;
};

/**
 * Guarda el original en privado y su copia con marca en público.
 *
 * Primero el original: si la copia fallara después, se borra
 * para no dejar un original sin copia que nadie referencia.
 */
export async function guardarImagenDeRecurso(
  original: Buffer,
  contentType?: string
): Promise<ImagenGuardada> {
  const copia = await generarCopiaConMarca(original);

  const id = randomUUID();
  const almacen = driverActual() === "blob" ? blobStorage : localStorage;
  const rutaOriginal = `${CARPETA_ORIGINALES}/${id}`;

  await almacen.putPrivate({
    folder: CARPETA_ORIGINALES,
    fileName: id,
    data: original,
    contentType,
  });

  try {
    const publicada = await almacen.putPublic({
      folder: CARPETA_COPIAS,
      fileName: `${id}.jpg`,
      data: copia.data,
      contentType: copia.contentType,
    });

    return { url: publicada.url, width: copia.width, height: copia.height };
  } catch (error) {
    await almacen.deletePrivateByPath(rutaOriginal).catch(() => {});
    throw error;
  }
}

/**
 * Lee el original sin marca de una copia. Solo para la versión
 * limpia, después de comprobar quién la pide: aquí no se
 * comprueba nada.
 */
export async function leerOriginal(
  urlCopia: string
): Promise<PrivateObject | null> {
  const id = idDeCopia(urlCopia);

  if (!id) return null;

  return almacenDeLaCopia(urlCopia).getPrivateByPath(
    `${CARPETA_ORIGINALES}/${id}`
  );
}

/**
 * Borra la copia pública y su original privado, cuando la
 * imagen deja de usarse. Como olvidarObjeto, nunca lanza: un
 * objeto que no se pudo borrar queda huérfano, sin romper nada.
 */
export async function borrarImagenDeRecurso(
  urlCopia: string | null | undefined
): Promise<void> {
  const id = idDeCopia(urlCopia);

  if (!urlCopia || !id) return;

  const almacen = almacenDeLaCopia(urlCopia);

  await Promise.all([
    almacen.deleteObject(urlCopia),
    almacen.deletePrivateByPath(`${CARPETA_ORIGINALES}/${id}`),
  ]).catch((error) => {
    console.error(
      "No se pudo borrar la imagen del recurso:",
      error instanceof Error ? error.message : error
    );
  });
}
