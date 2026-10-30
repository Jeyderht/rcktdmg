/**
 * Foto de perfil del cliente: los 12 avatares de la casa y los
 * límites de la foto propia. Sin dependencias de servidor: lo usan
 * el diálogo (navegador) y las rutas (servidor).
 */

/** Los avatares viven en public/avatars/avatar-01..12.svg. */
export const AVATARES = Array.from({ length: 12 }, (_, i) => {
  const numero = String(i + 1).padStart(2, "0");

  return { id: `avatar-${numero}`, src: `/avatars/avatar-${numero}.svg` };
});

/** La ruta pública de un avatar de la casa, o null si el id no es uno de ellos. */
export function rutaDeAvatar(id: unknown): string | null {
  return AVATARES.find((a) => a.id === id)?.src ?? null;
}

/** Foto propia del cliente: máximo 2 MB. */
export const MAX_FOTO_CLIENTE = 2 * 1024 * 1024;

/** Tipos admitidos para la foto propia. */
export const TIPOS_FOTO_CLIENTE = ["image/jpeg", "image/png", "image/webp"] as const;

export type TipoFotoCliente = (typeof TIPOS_FOTO_CLIENTE)[number];

/**
 * El tipo REAL de una imagen por sus primeros bytes, no por lo que
 * declara el navegador: JPG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A)
 * o WebP («RIFF» … «WEBP»). null si no es ninguno de los tres.
 */
export function tipoFotoPorFirma(bytes: Uint8Array): TipoFotoCliente | null {
  const es = (inicio: number, firma: number[]) =>
    firma.every((b, i) => bytes[inicio + i] === b);

  if (es(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (es(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (es(0, [0x52, 0x49, 0x46, 0x46]) && es(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";

  return null;
}
