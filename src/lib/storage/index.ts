import {
  HOST_BLOB_PUBLICO,
  blobStorage,
  esReferenciaBlob,
} from "./blob";
import { esRutaPrivadaLocal, localStorage } from "./local";
import type {
  PrivateObject,
  PutPrivateInput,
  PutPublicInput,
  PutResult,
  StorageAdapter,
  StorageDriver,
} from "./types";

export type {
  PrivateObject,
  PutPrivateInput,
  PutPublicInput,
  PutResult,
  StorageDriver,
};

export { esReferenciaBlob, esRutaPrivadaLocal };

/**
 * Elige el almacén.
 *
 * `STORAGE_DRIVER` manda. Si no está definida, se usa disco en
 * desarrollo y Vercel Blob en producción, que es donde el
 * sistema de archivos es efímero.
 */
export function driverActual(): StorageDriver {
  const configurado = process.env.STORAGE_DRIVER;

  if (configurado === "local" || configurado === "blob") {
    return configurado;
  }

  return process.env.NODE_ENV === "production" ? "blob" : "local";
}

function adaptador(): StorageAdapter {
  return driverActual() === "blob" ? blobStorage : localStorage;
}

export function putPublic(
  input: PutPublicInput
): Promise<PutResult> {
  return adaptador().putPublic(input);
}

export function putPrivate(
  input: PutPrivateInput
): Promise<PutResult> {
  return adaptador().putPrivate(input);
}

/**
 * Lee un archivo privado ya autorizado.
 *
 * No mira el driver activo sino la forma de la referencia: así
 * los archivos subidos antes de la migración se siguen
 * entregando desde disco aunque el driver ya sea Blob.
 */
export function getPrivate(
  ref: string
): Promise<PrivateObject | null> {
  if (esReferenciaBlob(ref)) {
    return blobStorage.getPrivate(ref);
  }

  if (esRutaPrivadaLocal(ref)) {
    return localStorage.getPrivate(ref);
  }

  return Promise.resolve(null);
}

/** Igual que la lectura: el destino lo decide la referencia. */
export function deleteObject(url: string): Promise<void> {
  if (esReferenciaBlob(url)) {
    return blobStorage.deleteObject(url);
  }

  return localStorage.deleteObject(url);
}

export type ResultadoOlvido = "borrado" | "omitido" | "fallo";

/**
 * Borra el objeto de Blob que un registro acaba de dejar de
 * referenciar, después de que la base de datos ya se haya
 * actualizado.
 *
 * El orden importa: primero la base, luego el almacén. Si se
 * hiciera al revés y fallara la escritura, quedaría un registro
 * apuntando a un objeto ya borrado, que es un error visible
 * para el usuario. Así, en el peor caso, queda un objeto
 * huérfano: cuesta unos céntimos y no rompe nada.
 *
 * Por eso nunca lanza: informa del resultado y sigue.
 *
 * Solo toca Vercel Blob. Las rutas locales y las heredadas se
 * omiten a propósito, porque se conservan como respaldo.
 */
export async function olvidarObjeto(
  url: string | null | undefined,
  almacen: "publico" | "privado"
): Promise<ResultadoOlvido> {
  if (!url || !esReferenciaBlob(url)) {
    return "omitido";
  }

  // Salvaguarda: no se borra nada fuera del almacén esperado.
  const esPublico = url.includes(HOST_BLOB_PUBLICO);

  if (
    (almacen === "publico" && !esPublico) ||
    (almacen === "privado" && esPublico)
  ) {
    console.error(
      "No se borró el objeto: no pertenece al almacén esperado."
    );

    return "omitido";
  }

  try {
    await blobStorage.deleteObject(url);
    return "borrado";
  } catch (error) {
    // Un objeto que ya no existe no es un problema.
    console.error(
      "No se pudo borrar el objeto anterior en Blob:",
      error instanceof Error ? error.message : error
    );

    return "fallo";
  }
}
