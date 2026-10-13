"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Cifra del Dashboard con odómetro.
 *
 * Al entrar en pantalla cada dígito sube por su tira 0–9 hasta
 * su valor, escalonado. Lo hace React (no se reescribe el DOM a
 * mano), así que una cifra nueva del servidor se pinta bien.
 *
 * No se anima: con movimiento reducido, lo que ya estaba a la
 * vista al cargar (sería un parpadeo) ni lo que no tiene
 * dígitos («—»). El texto real va siempre para lectores de
 * pantalla.
 */
export default function CifraAnimada({ texto }: { texto: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fase, setFase] = useState<"quieta" | "cero" | "valor">("quieta");

  useEffect(() => {
    const el = ref.current;
    if (!el || !/\d/.test(texto) || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    let marco = 0;
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setFase("cero");
        // Dos fotogramas: primero las tiras en 0, luego en su dígito.
        marco = requestAnimationFrame(() => {
          marco = requestAnimationFrame(() => setFase("valor"));
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(marco);
    };
  }, [texto]);

  if (fase === "quieta") {
    return <span ref={ref}>{texto}</span>;
  }

  let digito = 0;

  return (
    <span ref={ref}>
      <span className="sr-only">{texto}</span>
      <span className="rk-num" aria-hidden="true">
        {Array.from(texto).map((c, i) => {
          if (!/\d/.test(c)) {
            return (
              <span key={i} className="rk-num-c">
                {c === " " ? " " : c}
              </span>
            );
          }
          const k = digito++;
          return (
            <span key={i} className="rk-dig">
              <span
                className="rk-dig-tira"
                style={
                  {
                    "--d": fase === "valor" ? c : 0,
                    transitionDelay: `${120 + k * 80}ms`,
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
    </span>
  );
}
