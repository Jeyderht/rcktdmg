/**
 * Separador entre secciones del inicio: la línea con nodos
 * cuadrados en las puntas del separador del pie, sin isotipo.
 */
export default function SeparadorSeccion() {
  return (
    <div aria-hidden className="rk-separador rk-sec-sep">
      <span className="rk-separador-linea" />
    </div>
  );
}
