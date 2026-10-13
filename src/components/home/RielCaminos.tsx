"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Riel de «Más diseños» que avanza solo.
 *
 * Una tarjeta por vista en móvil, dos desde 640px y tres desde
 * 1024px (el ancho lo da el CSS de .rk-camino-riel > li). Pasa
 * a la siguiente cada 4,2 s, pero solo si el riel está a la
 * vista, nadie lo está tocando y no se pidió movimiento
 * reducido. Al tocar, arrastrar o usar la rueda se detiene 9 s;
 * con el ratón encima, mientras siga encima.
 *
 * Los puntos de debajo marcan la posición y llevan a cada
 * tarjeta; son decorativos para los lectores de pantalla, que
 * recorren el riel como una lista normal.
 */
export default function RielCaminos({ children }: { children: ReactNode }) {
  const riel = useRef<HTMLUListElement>(null);
  const total = Children.count(children);

  const [activo, setActivo] = useState(0);
  const [ultimo, setUltimo] = useState(total - 1);

  // Distancia entre dos tarjetas y posición actual, medidas del DOM.
  const medir = useCallback(() => {
    const ul = riel.current;
    if (!ul) return null;
    const items = ul.children;
    const paso =
      items.length > 1
        ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft
        : ul.clientWidth;
    const max = Math.max(0, Math.round((ul.scrollWidth - ul.clientWidth) / paso));
    const indice = Math.min(Math.round(ul.scrollLeft / paso), max);
    return { ul, paso, max, indice };
  }, []);

  const ir = useCallback(
    (i: number) => {
      const m = medir();
      m?.ul.scrollTo({ left: i * m.paso, behavior: "smooth" });
    },
    [medir]
  );

  useEffect(() => {
    const ul = riel.current;
    if (!ul) return;

    const pintar = () => {
      const m = medir();
      if (!m) return;
      setActivo(m.indice);
      setUltimo(m.max);
    };

    let pausado = false;
    let visible = false;
    let reanudar: number | undefined;

    const avanzar = () => {
      if (
        pausado ||
        !visible ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      const m = medir();
      if (!m) return;
      ir(m.indice + 1 > m.max ? 0 : m.indice + 1);
    };

    const pausar9s = () => {
      pausado = true;
      window.clearTimeout(reanudar);
      reanudar = window.setTimeout(() => {
        pausado = false;
      }, 9000);
    };
    const entrar = () => {
      pausado = true;
    };
    const salir = () => {
      pausado = false;
    };

    pintar();
    const reloj = window.setInterval(avanzar, 4200);

    ul.addEventListener("scroll", pintar, { passive: true });
    window.addEventListener("resize", pintar);
    for (const ev of ["pointerdown", "touchstart", "wheel"] as const) {
      ul.addEventListener(ev, pausar9s, { passive: true });
    }
    ul.addEventListener("mouseenter", entrar);
    ul.addEventListener("mouseleave", salir);

    let observador: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observador = new IntersectionObserver(
        (entradas) => {
          visible = entradas[0].isIntersecting;
        },
        { threshold: 0.4 }
      );
      observador.observe(ul);
    } else {
      visible = true;
    }

    return () => {
      window.clearInterval(reloj);
      window.clearTimeout(reanudar);
      observador?.disconnect();
      ul.removeEventListener("scroll", pintar);
      window.removeEventListener("resize", pintar);
      for (const ev of ["pointerdown", "touchstart", "wheel"] as const) {
        ul.removeEventListener(ev, pausar9s);
      }
      ul.removeEventListener("mouseenter", entrar);
      ul.removeEventListener("mouseleave", salir);
    };
  }, [medir, ir]);

  return (
    <>
      <ul
        ref={riel}
        className="rk-fade-up rk-enter-1 rk-camino-riel mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      <div className="rk-camino-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`rk-camino-dot${i === activo ? " is-on" : ""}`}
            style={i > ultimo ? { display: "none" } : undefined}
            onClick={() => ir(i)}
          />
        ))}
      </div>
    </>
  );
}
