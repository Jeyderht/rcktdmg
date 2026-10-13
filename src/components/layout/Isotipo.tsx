/**
 * Isotipo de RcktX: solo el cohete, sin el cuadro negro.
 *
 * Es una máscara de /marketing/cohete.svg pintada con el color
 * del texto (currentColor): sale blanco en el tema oscuro y
 * negro en el claro sin tener dos archivos. Decorativo: el
 * nombre accesible lo pone el enlace o el título que lo rodea.
 * El tamaño se da con clases (p. ej. "h-5 w-5").
 */
export default function Isotipo({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`rk-isotipo ${className}`} />;
}
