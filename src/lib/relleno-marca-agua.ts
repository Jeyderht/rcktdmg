/**
 * Qué imágenes de recurso faltan por pasar a copia con marca de agua.
 *
 * Es la parte pura del relleno (scripts/rellenar-marca-agua.ts): sin
 * base ni almacén, para que el modo prueba y la ejecución cuenten
 * exactamente lo mismo.
 */

import { esCopiaConMarca } from "@/lib/storage/imagenes-recurso";

export type FilaRelleno = {
  id: string;
  coverUrl: string | null;
  previewUrl: string | null;
  images: { id: string; url: string }[];
};

/** Un sitio de la base que apunta a la imagen. */
export type UsoImagen =
  | { tipo: "portada" | "vistaPrevia"; productId: string }
  | { tipo: "galeria"; productId: string; imageId: string };

export type ImagenPendiente = { url: string; usos: UsoImagen[] };

export type PlanRelleno = {
  /** Una entrada por URL: la misma imagen en dos campos da una sola copia. */
  pendientes: ImagenPendiente[];
  /** Campos que ya apuntan a una copia con marca. */
  yaConMarca: number;
};

export function planificarRelleno(filas: FilaRelleno[]): PlanRelleno {
  const porUrl = new Map<string, UsoImagen[]>();
  let yaConMarca = 0;

  const anotar = (url: string | null, uso: UsoImagen) => {
    if (!url) return;

    if (esCopiaConMarca(url)) {
      yaConMarca += 1;
      return;
    }

    porUrl.set(url, [...(porUrl.get(url) ?? []), uso]);
  };

  for (const fila of filas) {
    anotar(fila.coverUrl, { tipo: "portada", productId: fila.id });
    anotar(fila.previewUrl, { tipo: "vistaPrevia", productId: fila.id });

    for (const imagen of fila.images) {
      anotar(imagen.url, {
        tipo: "galeria",
        productId: fila.id,
        imageId: imagen.id,
      });
    }
  }

  return {
    pendientes: [...porUrl].map(([url, usos]) => ({ url, usos })),
    yaConMarca,
  };
}
