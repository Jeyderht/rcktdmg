import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

import type {
  PrivateObject,
  PutPrivateInput,
  PutPublicInput,
  PutResult,
  StorageAdapter,
} from "./types";

/**
 * Almacenamiento en disco: el comportamiento que el proyecto
 * ya tenía. Se mantiene para desarrollo y para que los
 * archivos subidos antes de la migración sigan funcionando.
 *
 *  - Público : public/<carpeta>/<archivo>  -> /<carpeta>/<archivo>
 *  - Privado : storage/<carpeta>/<archivo> -> /storage/<carpeta>/<archivo>
 *    (`products` para los archivos que se venden,
 *    `product-originals` para los originales de las imágenes)
 *
 * `storage/` queda fuera de `public/`, así que Next no lo
 * sirve: solo se lee desde el endpoint de descarga.
 */

const PRIVATE_PREFIX = "/storage/products/";

/** Formato antiguo que todavía existe en un producto real. */
const LEGACY_PREFIX = "/api/download-file/";

export function esRutaPrivadaLocal(ref: string) {
  return (
    ref.startsWith(PRIVATE_PREFIX) || ref.startsWith(LEGACY_PREFIX)
  );
}

/**
 * Extrae el nombre de archivo de una referencia local y
 * rechaza cualquier intento de salir del directorio.
 */
export function nombreDeArchivoLocal(ref: string): string | null {
  const bruto = ref.startsWith(LEGACY_PREFIX)
    ? ref.slice(LEGACY_PREFIX.length)
    : ref.slice(PRIVATE_PREFIX.length);

  let fileName: string;

  try {
    fileName = decodeURIComponent(bruto);
  } catch {
    return null;
  }

  if (
    !fileName ||
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\")
  ) {
    return null;
  }

  return fileName;
}

/** Carpetas privadas que se pueden leer o borrar por ruta. */
const CARPETAS_PRIVADAS = ["products", "product-originals"];

/**
 * Ruta en disco de `<carpeta>/<archivo>` dentro de storage/, o
 * null si la carpeta no es privada o el nombre intenta salir.
 */
function rutaPrivadaEnDisco(pathname: string): string | null {
  const [carpeta, archivo, ...resto] = pathname.split("/");

  if (
    resto.length > 0 ||
    !CARPETAS_PRIVADAS.includes(carpeta) ||
    !archivo ||
    archivo.includes("..") ||
    archivo.includes("\\")
  ) {
    return null;
  }

  return path.join(process.cwd(), "storage", carpeta, archivo);
}

export const localStorage: StorageAdapter = {
  driver: "local",

  async putPublic({
    folder,
    fileName,
    data,
  }: PutPublicInput): Promise<PutResult> {
    const directorio = path.join(process.cwd(), "public", folder);

    await mkdir(directorio, { recursive: true });
    await writeFile(path.join(directorio, fileName), data);

    return {
      url: `/${folder}/${fileName}`,
      pathname: `${folder}/${fileName}`,
    };
  },

  async putPrivate({
    folder = "products",
    fileName,
    data,
  }: PutPrivateInput): Promise<PutResult> {
    const directorio = path.join(process.cwd(), "storage", folder);

    await mkdir(directorio, { recursive: true });
    await writeFile(path.join(directorio, fileName), data);

    return {
      url: `/storage/${folder}/${fileName}`,
      pathname: `${folder}/${fileName}`,
    };
  },

  async getPrivate(ref: string): Promise<PrivateObject | null> {
    if (!esRutaPrivadaLocal(ref)) {
      return null;
    }

    const fileName = nombreDeArchivoLocal(ref);

    if (!fileName) {
      return null;
    }

    const filePath = path.join(
      process.cwd(),
      "storage",
      "products",
      fileName
    );

    try {
      const info = await stat(filePath);

      return {
        body: await readFile(filePath),
        size: info.size,
        contentType: null,
      };
    } catch {
      return null;
    }
  },

  async getPrivateByPath(pathname: string): Promise<PrivateObject | null> {
    const filePath = rutaPrivadaEnDisco(pathname);

    if (!filePath) {
      return null;
    }

    try {
      const info = await stat(filePath);

      return {
        body: await readFile(filePath),
        size: info.size,
        contentType: null,
      };
    } catch {
      return null;
    }
  },

  async deletePrivateByPath(pathname: string): Promise<void> {
    const filePath = rutaPrivadaEnDisco(pathname);

    if (!filePath) {
      return;
    }

    try {
      await unlink(filePath);
    } catch {
      // Si ya no existe, no hay nada que hacer.
    }
  },

  async deleteObject(url: string): Promise<void> {
    // Solo se borran archivos dentro de las carpetas conocidas.
    const relativo = url.startsWith("/") ? url.slice(1) : url;

    if (relativo.includes("..")) {
      return;
    }

    const destino = esRutaPrivadaLocal(url)
      ? path.join(
          process.cwd(),
          "storage",
          "products",
          nombreDeArchivoLocal(url) ?? ""
        )
      : path.join(process.cwd(), "public", relativo);

    try {
      await unlink(destino);
    } catch {
      // Si ya no existe, no hay nada que hacer.
    }
  },
};
