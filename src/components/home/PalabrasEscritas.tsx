"use client";

import { useEffect, useState } from "react";

type Fase = "listo" | "sale" | "inicio" | "arrastra";

/**
 * Palabras clave que se «dibujan» con el puntero, como en una
 * herramienta de diseño: el puntero arrastra un marco desde la
 * esquina de arriba a la izquierda hasta el tamaño del texto, y
 * la palabra se va descubriendo con él. Luego el marco se suelta,
 * la palabra se va y entra la siguiente.
 *
 * El ancho lo fija la palabra más larga (una copia invisible), así
 * el titular no salta. Con prefers-reduced-motion se queda la
 * primera palabra, quieta y sin marco.
 */
export default function PalabrasEscritas({
  palabras,
}: {
  palabras: string[];
}) {
  const [indice, setIndice] = useState(0);
  const [fase, setFase] = useState<Fase>("listo");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const relojes: ReturnType<typeof setTimeout>[] = [];
    const luego = (ms: number, fn: () => void) =>
      relojes.push(setTimeout(fn, ms));

    let i = 0;

    const ciclo = () => {
      setFase("sale");
      luego(850, () => {
        i = (i + 1) % palabras.length;
        setIndice(i);
        setFase("inicio");
      });
      luego(1150, () => setFase("arrastra"));
      luego(2900, () => setFase("listo"));
      luego(5400, ciclo);
    };

    luego(2600, ciclo);
    return () => relojes.forEach(clearTimeout);
  }, [palabras]);

  const larga = palabras.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="rk-hc-escribe" data-fase={fase}>
      <span className="rk-hc-escribe-fantasma">{larga}</span>
      <span className="rk-hc-escribe-zona">
        <span className="rk-hc-escribe-texto">
          <span className="rk-hc-palabra">{palabras[indice]}</span>

          {/* Marco que el puntero arrastra hasta el tamaño del texto */}
          <span className="rk-hc-marco">
            <i />
            <i />
            <i />
            <i />
            <svg className="rk-hc-cursor" viewBox="0 0 24 24">
              <path d="M3 3 L19 10 L12 12 L10 19 Z" />
            </svg>
          </span>
        </span>
      </span>
    </span>
  );
}
