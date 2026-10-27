/**
 * Dimensiones de una imagen de recurso, medidas en su ORIGINAL.
 *
 * Desde la marca de agua, lo que se guarda en la base es la URL de
 * la copia pública, que se reduce a 1080 px de ancho. Las medidas
 * que importan —las que se exigen a Eventos (1080 × 1920) y a
 * Corporativos (1080 × 1350), y las que filtran por formato real—
 * son las del archivo que subió el creador, que vive en el almacén
 * privado. Aquí se leen de ahí.
 *
 * Va aparte de dimensiones.ts a propósito: aquel lo importa código
 * de cliente (a través de lib/home) y este arrastra el almacén, que
 * solo puede vivir en el servidor.
 */

import { dimensionesDe, dimensionesDesdeUrl, type Dimensiones } from "@/lib/dimensiones";
import { esCopiaConMarca, leerOriginal } from "@/lib/storage/imagenes-recurso";

/** Basta la cabecera: los cuatro formatos declaran su tamaño al principio. */
const BYTES_CABECERA = 131072;

/**
 * Medidas reales de una imagen de recurso. Para una copia con marca
 * se leen del original privado; para una URL de antes de la marca,
 * de la propia URL, como hasta ahora. Null si no se pueden leer.
 */
export async function dimensionesDeImagenDeRecurso(
  url: string
): Promise<Dimensiones | null> {
  if (!esCopiaConMarca(url)) {
    return dimensionesDesdeUrl(url);
  }

  try {
    const original = await leerOriginal(url);

    if (!original) return null;

    if (Buffer.isBuffer(original.body)) {
      return dimensionesDe(original.body.subarray(0, BYTES_CABECERA));
    }

    const lector = original.body.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;

    while (total < BYTES_CABECERA) {
      const { done, value } = await lector.read();
      if (done) break;
      partes.push(value);
      total += value.byteLength;
    }

    await lector.cancel().catch(() => {});

    return dimensionesDe(Buffer.concat(partes));
  } catch {
    return null;
  }
}
