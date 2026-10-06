"use client";

import { FileDown } from "lucide-react";

/**
 * «Guía de requisitos para creadores RCKTDMG», en PDF.
 *
 * ══════════ POR QUÉ ASÍ Y NO CON UN PDF DE VERDAD ══════════
 *
 * Generar el PDF en el servidor pedía una librería nueva y, lo
 * que es peor, una SEGUNDA copia de las reglas: alguien
 * tendría que mantener la maqueta del PDF al día cada vez que
 * cambiara un límite, y el día que se olvidara habría una guía
 * oficial mintiendo.
 *
 * Esta página YA es la guía. El navegador la convierte en PDF
 * él solo, con los estilos de impresión de globals.css, y lo
 * que sale es exactamente lo que valida el sistema, porque es
 * la misma página. Cero dependencias y cero riesgo de que la
 * documentación se desvíe del código.
 *
 * En el diálogo que se abre, «Guardar como PDF» es el destino
 * por defecto en Chrome, Edge y Safari.
 */
export default function BotonGuia() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rk-btn rk-btn-line"
    >
      <FileDown size={15} aria-hidden />
      Descargar la guía
    </button>
  );
}
