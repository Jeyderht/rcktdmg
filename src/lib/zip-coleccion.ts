import { Readable } from "node:stream";
import yazl from "yazl";

import { prisma } from "@/lib/prisma";
import { getPrivate } from "@/lib/storage";

/**
 * ZIP de una colección, armado en el momento.
 *
 * Solo se usa cuando el creador NO subió un archivo propio.
 * Si lo subió, se entrega el suyo y esto no llega a ejecutarse:
 * un ZIP hecho a mano por quien vende sus piezas casi siempre
 * está mejor ordenado que uno automático.
 *
 * TODO ocurre en el servidor. Los archivos se leen del almacén
 * privado con las credenciales del servidor y se escriben
 * directamente en la respuesta. Ninguna URL privada, ni del
 * almacén ni interna, sale hacia el navegador en ningún
 * momento.
 *
 * ══════════ POR QUÉ HAY LÍMITES ══════════
 *
 * Una colección admite hasta 60 recursos y un recurso hasta
 * 100 MB: 6 GB en el peor caso. Comprimir eso al vuelo no cabe
 * en el tiempo ni en la memoria de una función, y a medio
 * camino el navegador se encuentra con un archivo cortado que
 * parece válido y no lo es.
 *
 * Por eso se miden los archivos ANTES de escribir un solo byte
 * y, si no caben, se responde con un error claro en vez de
 * empezar algo que no se va a poder terminar. La descarga
 * recurso a recurso sigue estando ahí, y para ese caso es la
 * buena.
 */

/** Cuántas piezas se aceptan en un ZIP automático. */
export const MAXIMO_PIEZAS_ZIP = 25;

/** Cuánto puede pesar el conjunto, sumado. */
export const MAXIMO_BYTES_ZIP = 120 * 1024 * 1024;

export type PiezaDeColeccion = {
  orden: number;
  nombre: string;
  ref: string;
  formato: string | null;
  bytes: number;
};

export type PreparacionZip =
  | { ok: true; piezas: PiezaDeColeccion[]; bytes: number }
  | { ok: false; estado: number; error: string };

/** Megas con un decimal, para los mensajes. */
function enMegas(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Nombre seguro para una entrada del ZIP.
 *
 * Un nombre de recurso lo escribe su creador, así que aquí se
 * trata como texto ajeno: fuera barras, dos puntos, controles
 * y cualquier cosa que pudiera interpretarse como una ruta al
 * descomprimir. El número delante conserva el orden de la
 * colección incluso en los programas que listan alfabéticamente.
 */
export function nombreDeEntrada(
  orden: number,
  nombre: string,
  formato: string | null
): string {
  const limpio = nombre
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const base = limpio || `recurso-${orden}`;

  const extension = (formato || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 8);

  return `${String(orden).padStart(2, "0")} - ${base}${
    extension ? `.${extension}` : ""
  }`;
}

/**
 * Mide la colección y decide si puede comprimirse.
 *
 * Abre cada archivo solo para leer su tamaño y cierra el
 * cuerpo inmediatamente: nada se descarga todavía. Si algo no
 * cuadra —una pieza sin archivo, un archivo que ya no está—
 * se dice cuál, porque el creador puede arreglarlo.
 */
export async function prepararZipDeColeccion(
  collectionId: string
): Promise<PreparacionZip> {
  const items = await prisma.commercialCollectionItem.findMany({
    where: { collectionId },
    orderBy: { sortOrder: "asc" },
    select: {
      sortOrder: true,
      product: { select: { name: true, fileUrl: true, fileFormat: true } },
    },
  });

  if (items.length === 0) {
    return {
      ok: false,
      estado: 404,
      error: "La colección no tiene recursos.",
    };
  }

  const sinArchivo = items.filter((i) => !i.product.fileUrl);

  if (sinArchivo.length) {
    return {
      ok: false,
      estado: 409,
      error: `No se puede armar el ZIP: ${sinArchivo.length} recurso(s) de la colección no tienen archivo descargable.`,
    };
  }

  if (items.length > MAXIMO_PIEZAS_ZIP) {
    return {
      ok: false,
      estado: 413,
      error: `La colección tiene ${items.length} recursos y el ZIP automático admite hasta ${MAXIMO_PIEZAS_ZIP}. Descárgalos uno a uno desde Mis descargas.`,
    };
  }

  const piezas: PiezaDeColeccion[] = [];

  let bytes = 0;

  for (const [indice, item] of items.entries()) {
    const ref = item.product.fileUrl as string;

    const objeto = await getPrivate(ref);

    if (!objeto) {
      return {
        ok: false,
        estado: 409,
        error: `No se pudo leer el archivo de «${item.product.name}».`,
      };
    }

    /*
      Solo interesaba el tamaño. El cuerpo se cierra aquí
      mismo para no dejar abiertas tantas conexiones como
      piezas tenga la colección.
    */
    if (objeto.body instanceof ReadableStream) {
      await objeto.body.cancel().catch(() => {});
    }

    if (objeto.size === null) {
      return {
        ok: false,
        estado: 409,
        error: `No se conoce el tamaño del archivo de «${item.product.name}», así que no se puede comprobar si el ZIP cabe.`,
      };
    }

    bytes += objeto.size;

    if (bytes > MAXIMO_BYTES_ZIP) {
      return {
        ok: false,
        estado: 413,
        error: `El conjunto supera ${enMegas(
          MAXIMO_BYTES_ZIP
        )} y el ZIP automático no lo puede armar. Descarga los recursos uno a uno desde Mis descargas.`,
      };
    }

    piezas.push({
      orden: indice + 1,
      nombre: item.product.name,
      ref,
      formato: item.product.fileFormat,
      bytes: objeto.size,
    });
  }

  return { ok: true, piezas, bytes };
}

/**
 * Arma el ZIP y lo devuelve como cuerpo de respuesta.
 *
 * Las piezas se añaden EN ORDEN y de una en una: se lee la
 * siguiente solo cuando la anterior ya está escrita, así que
 * en memoria nunca hay más de un archivo. El límite de arriba
 * garantiza además que el total es razonable.
 *
 * Si una pieza falla a mitad, el ZIP se aborta en vez de
 * terminarlo incompleto: más vale una descarga fallida que un
 * archivo que se abre y está a medias.
 */
export function comprimirColeccion(
  piezas: PiezaDeColeccion[]
): ReadableStream<Uint8Array> {
  const zip = new yazl.ZipFile();

  /*
    `outputStream` viene declarado como el interfaz mínimo de
    lectura de Node, que no incluye `destroy`. En tiempo de
    ejecución es un Readable completo, y se necesita poder
    abortarlo si una pieza falla a mitad.
  */
  const salida = zip.outputStream as unknown as Readable;

  void (async () => {
    try {
      for (const pieza of piezas) {
        const objeto = await getPrivate(pieza.ref);

        if (!objeto) {
          throw new Error(`Archivo no disponible: ${pieza.nombre}`);
        }

        const contenido =
          objeto.body instanceof ReadableStream
            ? Buffer.from(
                await new Response(objeto.body).arrayBuffer()
              )
            : objeto.body;

        zip.addBuffer(contenido, nombreDeEntrada(
          pieza.orden,
          pieza.nombre,
          pieza.formato
        ));
      }

      zip.end();
    } catch (error) {
      console.error("Armando el ZIP de la colección:", error);

      salida.destroy(
        error instanceof Error ? error : new Error("Fallo al armar el ZIP")
      );
    }
  })();

  return Readable.toWeb(salida) as ReadableStream<Uint8Array>;
}
