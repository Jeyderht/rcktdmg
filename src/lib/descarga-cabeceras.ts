/**
 * Cabecera segura para descargar archivos con nombres Unicode.
 * Evita inyección de cabeceras y conserva tildes mediante RFC 5987.
 */
export function disposicionDescarga(filename: string): string {
  const seguro = filename.replace(/[\r\n\x00-\x1f\x7f"\\/]/g, "_");
  const ascii = seguro.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(seguro)}`;
}
