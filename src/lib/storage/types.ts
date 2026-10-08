/**
 * Tipos compartidos del almacenamiento de RcktX.
 *
 * Hay dos destinos y nunca se mezclan:
 *
 *  - PÚBLICO  (rcktdmg-media): imágenes de producto, avatares
 *    y portadas. Se sirven por URL directa.
 *
 *  - PRIVADO  (rcktdmg-files): los archivos que se venden.
 *    No tienen URL pública: solo se leen desde el servidor
 *    después de comprobar la compra.
 */

export type StorageDriver = "local" | "blob";

/** Carpetas públicas. Coinciden con las rutas actuales. */
export type PublicFolder =
  | "product-images"
  | "creator-avatars"
  | "creator-covers";

export type PutPublicInput = {
  folder: PublicFolder;
  /** Nombre final del archivo, ya saneado por el endpoint. */
  fileName: string;
  data: Buffer;
  contentType?: string;
};

export type PutPrivateInput = {
  fileName: string;
  data: Buffer;
  contentType?: string;
};

export type PutResult = {
  /** Lo que se guarda en la base de datos. */
  url: string;
  /** Ruta dentro del almacén. */
  pathname: string;
};

/** Lectura de un archivo privado, ya autorizada. */
export type PrivateObject = {
  body: Buffer | ReadableStream<Uint8Array>;
  size: number | null;
  contentType: string | null;
};

export interface StorageAdapter {
  readonly driver: StorageDriver;
  putPublic(input: PutPublicInput): Promise<PutResult>;
  putPrivate(input: PutPrivateInput): Promise<PutResult>;
  /** `ref` es lo que se guardó en `fileUrl`. */
  getPrivate(ref: string): Promise<PrivateObject | null>;
  deleteObject(url: string): Promise<void>;
}
