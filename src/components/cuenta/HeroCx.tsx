"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type DiapositivaCx = {
  id: string;
  imagen: string;
  titulo: string;
  /** Destino de «Ver recurso»: el de siempre (p. ej. /tienda/slug). */
  href: string;
  /** Línea bajo el título: categoría, precio… (solo datos reales). */
  detalle?: string | null;
};

const PASO_MS = 6000;

/**
 * Banner de los inicios (rk-cx-hero): portada de fondo, degradado y
 * viñeta para leer el texto, rótulo, título y botones. Con dos o más
 * portadas, hasta 4 miniaturas (aria-pressed) y una flecha cambian
 * la portada; la barra bajo la miniatura activa marca los 6 s antes
 * de pasar a la siguiente. Todo es estado local de presentación:
 * los botones los pone la página y llevan a donde llevaban.
 * Sin portadas, el banner queda con el degradado de los tokens.
 */
export default function HeroCx({
  rotulo,
  diapositivas,
  botones,
  tituloVacio,
  detalleVacio,
}: {
  rotulo: string;
  diapositivas: DiapositivaCx[];
  /** Botones según la portada visible (o sin portada). */
  botones: (actual: DiapositivaCx | null) => ReactNode;
  tituloVacio: string;
  detalleVacio?: string;
}) {
  const lista = diapositivas.slice(0, 4);
  const [i, setI] = useState(0);
  const [quieto, setQuieto] = useState(true);
  const actual = lista[i] ?? null;
  const varias = lista.length > 1;

  // Sin «reducir movimiento», pasa sola cada 6 s.
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setQuieto(consulta.matches);
    leer();
    consulta.addEventListener("change", leer);
    return () => consulta.removeEventListener("change", leer);
  }, []);

  useEffect(() => {
    if (!varias || quieto) return;
    const reloj = window.setTimeout(() => setI((n) => (n + 1) % lista.length), PASO_MS);
    return () => window.clearTimeout(reloj);
  }, [i, varias, quieto, lista.length]);

  return (
    <section className="rk-cx-hero" aria-roledescription="banner" aria-label={rotulo}>
      {actual ? (
        <Image
          key={actual.id}
          src={actual.imagen}
          alt=""
          fill
          priority
          className="rk-cx-hero-img"
          sizes="100vw"
        />
      ) : null}

      <div className="rk-cx-in">
        <div className="rk-cx-tx">
          <span className="rk-cx-tag">{rotulo}</span>
          <h2>{actual ? actual.titulo : tituloVacio}</h2>
          {(actual ? actual.detalle : detalleVacio) && (
            <p>{actual ? actual.detalle : detalleVacio}</p>
          )}
          <div className="rk-cx-hero-bt">{botones(actual)}</div>
        </div>

        {varias && (
          <div className="rk-cx-th" aria-label="Elegir portada">
            {lista.map((d, n) => (
              <button
                key={d.id}
                type="button"
                className="rk-cx-t"
                aria-pressed={n === i}
                aria-label={d.titulo}
                onClick={() => setI(n)}
              >
                <Image src={d.imagen} alt="" fill className="object-cover" sizes="96px" />
              </button>
            ))}
            <button
              type="button"
              className="rk-cx-ar"
              aria-label="Siguiente portada"
              onClick={() => setI((n) => (n + 1) % lista.length)}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
