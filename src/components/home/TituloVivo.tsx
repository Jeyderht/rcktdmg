"use client";

import { Fragment, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Título que entra letra a letra y reacciona al puntero.
 *
 * Las letras se parten al renderizar (también en el servidor),
 * así que el texto ya está antes de hidratar. El efecto solo
 * añade `rk-listo` cuando el título entra en pantalla y, con
 * puntero, eleva y agranda las letras cercanas con `transform`.
 * Con movimiento reducido no hace ninguna de las dos cosas.
 *
 * El texto accesible va completo en `aria-label`; las letras
 * quedan ocultas a los lectores de pantalla.
 */
export default function TituloVivo({
  texto,
  className = "",
}: {
  texto: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const titulo = ref.current;
    if (!titulo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letras = Array.from(
      titulo.querySelectorAll<HTMLElement>(".rk-let")
    );

    let observador: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window) {
      observador = new IntersectionObserver(
        (entradas, o) => {
          if (entradas.some((e) => e.isIntersecting)) {
            titulo.classList.add("rk-listo");
            o.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      observador.observe(titulo);
    } else {
      titulo.classList.add("rk-listo");
    }

    // Cada letra se eleva y crece según lo cerca que pase el puntero.
    const mover = (e: PointerEvent) => {
      for (const letra of letras) {
        const r = letra.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const f = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 110);

        letra.style.transform = f
          ? `translateY(${(-f * 14).toFixed(1)}px) scale(${(1 + f * 0.22).toFixed(3)})`
          : "";
      }
    };

    const soltar = () => {
      for (const letra of letras) letra.style.transform = "";
    };

    let espera: number | undefined;
    const alTerminarToque = () => {
      window.clearTimeout(espera);
      espera = window.setTimeout(soltar, 250);
    };

    titulo.addEventListener("pointermove", mover);
    titulo.addEventListener("pointerleave", soltar);
    titulo.addEventListener("pointercancel", soltar);
    titulo.addEventListener("touchend", alTerminarToque, { passive: true });

    return () => {
      observador?.disconnect();
      window.clearTimeout(espera);
      titulo.removeEventListener("pointermove", mover);
      titulo.removeEventListener("pointerleave", soltar);
      titulo.removeEventListener("pointercancel", soltar);
      titulo.removeEventListener("touchend", alTerminarToque);
    };
  }, []);

  const palabras = texto.split(" ");
  let indice = 0;

  return (
    <h2 ref={ref} className={`rk-titulo-vivo ${className}`} aria-label={texto}>
      {palabras.map((palabra, k) => (
        <Fragment key={k}>
          <span className="rk-pal" aria-hidden="true">
            {Array.from(palabra).map((letra) => {
              const i = indice++;
              return (
                <span
                  key={i}
                  className="rk-let"
                  style={{ "--i": i } as CSSProperties}
                >
                  {letra}
                </span>
              );
            })}
          </span>
          {k < palabras.length - 1 && " "}
        </Fragment>
      ))}
    </h2>
  );
}
