/**
 * Límites de las imágenes de perfil del creador (avatar y portada),
 * que compartían sus dos rutas de subida.
 */

/** Tamaño máximo: 8 MB. */
export const MAX_IMAGEN_PERFIL = 8 * 1024 * 1024;

/** Tipos admitidos y la extensión con la que se guardan. */
export const TIPOS_IMAGEN_PERFIL: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
