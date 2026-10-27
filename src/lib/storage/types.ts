/**
 * Tipos compartidos del almacenamiento de RcktX.
 *
 * Hay dos destinos y nunca se mezclan:
 *
 *  - PÚBLICO  (rcktdmg-media): imágenes de producto, avatares
 *    y portadas. Se sirven por URL directa.
 *
 *  - PRIVADO  (rcktdmg-files): los archivos que se venden y
 *    los originales de las imágenes de recurso, sin marca de
 *    agua. No tienen URL pública: solo se leen desde el
 *    servidor después de comprobar quién los pide.
 */

export type StorageDriver = "local" | "blob";

/**
 * Carpetas públicas. Coinciden con las rutas actuales.
 * `product-previews` guarda las copias con marca de agua de las
 * imágenes de recurso; `product-images`, las de antes de la
 * marca, que el relleno irá convirtiendo.
 */
export type PublicFolder =
  | "product-images"
  | "product-previews"
  | "creator-avatars"
  | "creator-covers";

/**
 * Carpetas privadas: `products` para los archivos que se venden
 * y `product-originals` para los originales de las imágenes.
 */
export type PrivateFolder = "products" | "product-originals";

export type PutPublicInput = {
  folder: PublicFolder;
  /** Nombre final del archivo, ya saneado por el endpoint. */
  fileName: string;
  data: Buffer;
  contentType?: string;
};

export type PutPrivateInput = {
  /** `products` si no se indica, como hasta ahora. */
  folder?: PrivateFolder;
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
  /**
   * Lectura y borrado privados por ruta dentro del almacén
   * (`<carpeta>/<archivo>`), para lo que no guarda su URL en la
   * base: los originales de las imágenes se localizan por el
   * nombre de su copia pública.
   */
  getPrivateByPath(pathname: string): Promise<PrivateObject | null>;
  deletePrivateByPath(pathname: string): Promise<void>;
  deleteObject(url: string): Promise<void>;
}
