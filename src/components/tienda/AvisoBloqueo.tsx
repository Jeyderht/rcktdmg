import Link from "next/link";
import { Lock } from "lucide-react";

import { conDestino } from "@/lib/redireccion";

/**
 * Aviso de una tarjeta bloqueada: candado, «Vista previa para
 * miembros» y «Regístrate gratis», sobre la miniatura oscurecida.
 *
 * Es una capa aparte que no recibe clics salvo en su botón
 * (pointer-events, §77), así que el resto de la tarjeta se comporta
 * como siempre. Tiene que ir FUERA del enlace o botón de la tarjeta:
 * un enlace dentro de otro enlace o de un botón es HTML inválido.
 *
 * El tamaño lo decide el ancho de la propia tarjeta (container query,
 * §77): completa desde 150 px y compacta por debajo, como en las
 * 3 columnas de un móvil.
 */
export default function AvisoBloqueo({
  ficha,
  filasAbajo = 0,
}: {
  /** Ruta de la ficha: el registro vuelve a ella. */
  ficha: string;
  /** Filas de píldoras al pie del marco (precio, pack): el aviso no las tapa. */
  filasAbajo?: 0 | 1 | 2;
}) {
  return (
    <div className="rk-bloqueo-aviso" data-filas-abajo={filasAbajo}>
      <div className="rk-bloqueo-contenido">
        {/*
          Un div y un <p>, no spans: la hoja de la galería oculta los
          span.rk-glass-on-image, y este aviso tiene que verse ahí.
        */}
        <div className="rk-glass-on-image rk-bloqueo-candado">
          <Lock aria-hidden />
        </div>

        <p className="rk-bloqueo-texto">Vista previa para miembros</p>

        <Link
          href={conDestino("/registro", ficha)}
          className="rk-btn rk-btn-primary rk-btn-compact rk-bloqueo-boton"
        >
          Regístrate gratis
        </Link>
      </div>
    </div>
  );
}
