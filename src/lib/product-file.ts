import { stat } from "fs/promises";
import path from "path";
import { head } from "@vercel/blob";

import { esReferenciaBlob } from "@/lib/storage";

/**
 * Datos técnicos reales del archivo de un recurso.
 *
 * Todo sale del archivo que existe en disco: no se inventa
 * ningún valor. Si el archivo no está disponible, se devuelve
 * null y la interfaz simplemente no muestra ese dato.
 */
export type ProductFileInfo = {
  /** Extensión en mayúsculas, p. ej. "ZIP". */
  format: string | null;
  /** Tamaño legible, p. ej. "12.4 MB". */
  size: string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];

  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Resuelve el nombre de archivo guardado a partir de fileUrl.
 * Acepta los dos formatos históricos y rechaza cualquier
 * intento de salirse del directorio de almacenamiento.
 */
function resolveStoredFileName(fileUrl: string): string | null {
  let fileName = "";

  if (fileUrl.startsWith("/api/download-file/")) {
    fileName = decodeURIComponent(
      fileUrl.replace("/api/download-file/", "")
    );
  } else if (fileUrl.startsWith("/storage/products/")) {
    fileName = decodeURIComponent(
      fileUrl.replace("/storage/products/", "")
    );
  } else {
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

export async function getProductFileInfo(
  fileUrl: string | null
): Promise<ProductFileInfo> {
  const empty: ProductFileInfo = { format: null, size: null };

  if (!fileUrl) {
    return empty;
  }

  // Archivo ya migrado al almacén privado: el tamaño real lo
  // da la metadata del objeto, sin descargarlo ni exponerlo.
  if (esReferenciaBlob(fileUrl)) {
    const nombreRemoto = decodeURIComponent(
      new URL(fileUrl).pathname.split("/").pop() || ""
    );

    const formatoRemoto =
      path.extname(nombreRemoto).replace(".", "").toUpperCase() ||
      null;

    try {
      const meta = await head(fileUrl, {
        token: process.env.BLOB_FILES_READ_WRITE_TOKEN,
      });

      return {
        format: formatoRemoto,
        size: formatBytes(meta.size),
      };
    } catch {
      return { format: formatoRemoto, size: null };
    }
  }

  const fileName = resolveStoredFileName(fileUrl);

  if (!fileName) {
    return empty;
  }

  const extension = path.extname(fileName).replace(".", "");

  const format = extension ? extension.toUpperCase() : null;

  try {
    const stats = await stat(
      path.join(process.cwd(), "storage", "products", fileName)
    );

    return {
      format,
      size: formatBytes(stats.size),
    };
  } catch {
    // El archivo no está en disco: se muestra solo el
    // formato, que sí se conoce por la extensión.
    return { format, size: null };
  }
}
