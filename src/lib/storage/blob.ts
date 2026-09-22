import { del, get, put } from "@vercel/blob";

import type {
  PrivateObject,
  PutPrivateInput,
  PutPublicInput,
  PutResult,
  StorageAdapter,
} from "./types";

/**
 * Vercel Blob, con dos almacenes separados:
 *
 *  - rcktdmg-media : access "public". Imágenes, avatares y
 *    portadas. Devuelve una URL de CDN que se guarda tal cual
 *    en coverUrl / previewUrl / avatarUrl.
 *
 *  - rcktdmg-files : access "private". Los archivos que se
 *    venden. No tienen URL pública: se leen con get() desde el
 *    servidor y solo después de validar la compra.
 *
 * Cada almacén tiene su propio token. Nunca se escribe un
 * token en el código ni se imprime en los registros.
 */

export const HOST_BLOB_PUBLICO = "public.blob.vercel-storage.com";

export function tokenPublico() {
  // Nombre que crea Vercel para el store público rcktdmg-media.
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error(
      "Falta BLOB_READ_WRITE_TOKEN para el almacén público."
    );
  }

  return token;
}

export function tokenPrivado() {
  const token = process.env.BLOB_FILES_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error(
      "Falta BLOB_FILES_READ_WRITE_TOKEN para el almacén privado."
    );
  }

  return token;
}

/** Una referencia privada de Blob es una URL del almacén. */
export function esReferenciaBlob(ref: string) {
  return (
    ref.startsWith("https://") &&
    ref.includes(".blob.vercel-storage.com")
  );
}

export const blobStorage: StorageAdapter = {
  driver: "blob",

  async putPublic({
    folder,
    fileName,
    data,
    contentType,
  }: PutPublicInput): Promise<PutResult> {
    const pathname = `${folder}/${fileName}`;

    const resultado = await put(pathname, data, {
      access: "public",
      token: tokenPublico(),
      contentType,
      // El nombre ya es único: no se añade sufijo para que la
      // URL sea estable y predecible dentro del almacén.
      addRandomSuffix: false,
    });

    return { url: resultado.url, pathname };
  },

  async putPrivate({
    fileName,
    data,
    contentType,
  }: PutPrivateInput): Promise<PutResult> {
    const pathname = `products/${fileName}`;

    const resultado = await put(pathname, data, {
      access: "private",
      token: tokenPrivado(),
      contentType,
      addRandomSuffix: false,
    });

    return { url: resultado.url, pathname };
  },

  async getPrivate(ref: string): Promise<PrivateObject | null> {
    if (!esReferenciaBlob(ref)) {
      return null;
    }

    const resultado = await get(ref, {
      access: "private",
      token: tokenPrivado(),
    });

    // El 304 no trae cuerpo: aquí siempre se pide completo.
    if (!resultado || resultado.statusCode !== 200) {
      return null;
    }

    return {
      body: resultado.stream,
      size: resultado.blob.size ?? null,
      contentType: resultado.blob.contentType ?? null,
    };
  },

  async deleteObject(url: string): Promise<void> {
    if (!esReferenciaBlob(url)) {
      return;
    }

    // El almacén se deduce de la propia URL del objeto.
    const token = url.includes(HOST_BLOB_PUBLICO)
      ? tokenPublico()
      : tokenPrivado();

    await del(url, { token });
  },
};
