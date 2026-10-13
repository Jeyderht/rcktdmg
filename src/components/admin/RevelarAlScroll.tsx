"use client";

import { useEffect } from "react";

/**
 * Entrada al hacer scroll del Dashboard del admin.
 *
 * Tarjetas y filas aparecen con fundido y subida, escalonadas
 * 70 ms; el anillo de Pedidos dibuja sus arcos y las líneas de
 * la gráfica se trazan de izquierda a derecha. Las cifras las
 * anima CifraAnimada.
 *
 * - `rk-js` va a <html> solo sin movimiento reducido; sin él no
 *   se esconde nada.
 * - Solo se prepara lo que está POR DEBAJO de la ventana al
 *   cargar: lo que ya se ve no se oculta para volver a entrar
 *   (sería un parpadeo sobre contenido ya pintado).
 * - Solo cambia clases y el trazo de los arcos; no toca el
 *   contenido ni los datos.
 */

const SELECTOR =
  ".rk-mn-barra,.rk-ing,.rk-pl,.rk-k2c,.rk-pl-tarjeta,.rk-pl-it,.rk-pl-ret,.rk-k2-dona,.rk-k2-ley li,.rk-k2,.rk-k2-tabs,.rk-k2-graf,.rk-k3,.rk-k3-nota";

/* Las filas suben menos que las tarjetas. */
const FILAS = ".rk-k2-ley li,.rk-k3,.rk-k2,.rk-pl-it";

export default function RevelarAlScroll() {
  useEffect(() => {
    const vista = document.querySelector<HTMLElement>(".rk-mn-pagina");
    if (!vista || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alto = window.innerHeight;
    const debajo = (el: Element) => el.getBoundingClientRect().top >= alto;

    document.documentElement.classList.add("rk-js");

    // Las líneas de la gráfica que ya se ven quedan trazadas; las
    // de abajo se trazan al aparecer.
    const lineas = Array.from(vista.querySelectorAll<HTMLElement>(".rk-k2-lin"));
    for (const l of lineas) if (!debajo(l)) l.classList.add("on");

    // Arcos del anillo: parten en 0 y se dibujan al aparecer.
    const arcos = Array.from(
      vista.querySelectorAll<SVGCircleElement>(".rk-k2-anillo circle:not(:first-child)")
    ).filter(debajo);
    const trazo = new Map<SVGCircleElement, string>();
    for (const c of arcos) {
      trazo.set(c, c.getAttribute("stroke-dasharray") ?? "");
      c.setAttribute("stroke-dasharray", "0 100");
    }

    const items = Array.from(vista.querySelectorAll<HTMLElement>(SELECTOR)).filter(debajo);
    for (const el of items) {
      el.classList.add("rk-rv");
      if (el.matches(FILAS)) el.classList.add("rk-rv-h");
    }

    const esperas: number[] = [];
    const io = new IntersectionObserver(
      (entradas) => {
        let n = 0;
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;

          // Anillo y gráfica: se dibujan un poco después de aparecer.
          if (el.matches(".rk-k2-anillo")) {
            for (const c of el.querySelectorAll<SVGCircleElement>("circle")) {
              const final = trazo.get(c);
              if (final) {
                esperas.push(window.setTimeout(() => c.setAttribute("stroke-dasharray", final), 250));
              }
            }
            continue;
          }
          if (el.matches(".rk-k2-lin")) {
            esperas.push(window.setTimeout(() => el.classList.add("on"), 300));
            continue;
          }

          el.style.setProperty("--d", `${n++ * 70}ms`);
          requestAnimationFrame(() => el.classList.add("on"));
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    for (const el of items) io.observe(el);
    for (const l of lineas) if (debajo(l)) io.observe(l);
    for (const a of new Set(arcos.map((c) => c.closest(".rk-k2-anillo")))) {
      if (a) io.observe(a);
    }

    return () => {
      io.disconnect();
      for (const t of esperas) window.clearTimeout(t);
    };
  }, []);

  return null;
}
