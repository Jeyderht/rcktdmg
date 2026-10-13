"use client";

import { useEffect, useRef } from "react";

/**
 * Separador entre secciones del inicio: la línea con nodos
 * cuadrados en las puntas del separador del pie, sin isotipo.
 *
 * Se dibuja de izquierda a derecha al entrar en pantalla. La
 * clase que lo esconde (`rk-sec-js` en <html>) la pone este
 * mismo efecto, y cada separador se observa a sí mismo: si el
 * script no llega a ejecutarse, la línea se ve entera; y uno
 * que aparezca después (navegando dentro del sitio) también se
 * revela. Con movimiento reducido el CSS lo deja quieto y
 * visible.
 */
export default function SeparadorSeccion() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("rk-sec-js");

    const observador = new IntersectionObserver(
      (entradas, o) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("is-in");
            o.unobserve(entrada.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );

    observador.observe(el);

    return () => observador.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="rk-separador rk-sec-sep">
      <span className="rk-separador-linea" />
    </div>
  );
}
