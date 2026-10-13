"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Cifra con odómetro que rueda cuando cambia.
 *
 * La primera vez se pinta ya en su valor. Si cambia a un texto del
 * mismo largo, cada dígito sube o baja por su tira hasta el nuevo
 * (escalonado 70 ms por columna); si cambia el largo, las tiras
 * se rehacen desde 0 y suben. Con movimiento reducido el CSS
 * quita la transición. El texto real va para lectores de pantalla.
 */
export default function Odometro({ texto }: { texto: string }) {
  // Largo con el que están armadas las tiras. Si el texto llega con
  // otro largo, se pintan en 0 un par de fotogramas y luego suben.
  const [largo, setLargo] = useState(texto.length);
  const desdeCero = largo !== texto.length;

  useEffect(() => {
    if (!desdeCero) return;
    let marco = requestAnimationFrame(() => {
      marco = requestAnimationFrame(() => setLargo(texto.length));
    });
    return () => cancelAnimationFrame(marco);
  }, [desdeCero, texto.length]);

  let columna = 0;

  return (
    <>
      <span className="sr-only">{texto}</span>
      <span className="rk-num" aria-hidden="true" key={texto.length}>
        {Array.from(texto).map((c, i) => {
          if (!/\d/.test(c)) {
            return (
              <span key={i} className="rk-num-c">
                {c === " " ? " " : c}
              </span>
            );
          }
          const k = columna++;
          return (
            <span key={i} className="rk-dig">
              <span
                className="rk-dig-tira"
                style={
                  {
                    "--d": desdeCero ? 0 : c,
                    transitionDelay: `${k * 70}ms`,
                  } as CSSProperties
                }
              >
                {"0123456789".split("").map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </>
  );
}
