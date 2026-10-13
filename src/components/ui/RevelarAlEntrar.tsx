"use client";

import { useEffect } from "react";

/**
 * Aparición progresiva de las secciones al hacer scroll.
 *
 * Va montado una sola vez en el layout y trabaja sobre las
 * secciones que ya existen, en lugar de envolver cada una en
 * otro componente: así no hay que tocar catorce ficheros ni
 * mantener dos formas distintas de animar lo mismo.
 *
 * Decisiones que importan:
 *
 *   · La clase que oculta la pone este script. Si no llega a
 *     ejecutarse, no hay nada escondido. Al revés —ocultar en
 *     el HTML y revelar con JS— un fallo del script dejaría la
 *     página en blanco.
 *
 *   · Solo se prepara lo que está POR DEBAJO de la ventana. Lo
 *     que ya se ve al entrar no se toca: animarlo provocaría
 *     un parpadeo sobre contenido recién pintado, y la portada
 *     ya tiene su propia entrada con `rk-fade-up`.
 *
 *   · Cada sección se deja de observar en cuanto aparece, y no
 *     se vuelve a ocultar al subir: releer no debería costar
 *     otra animación.
 *
 *   · `prefers-reduced-motion` corta antes de tocar el DOM.
 */
export default function RevelarAlEntrar() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    /** Secciones preparadas que todavía no han aparecido. */
    const pendientes = new Set<Element>();

    const revelar = (el: Element) => {
      el.classList.add("rk-visto");
      pendientes.delete(el);
      observador.unobserve(el);
    };

    /**
     * Rescate de las secciones que el scroll se saltó.
     *
     * IntersectionObserver solo avisa cuando la intersección
     * CAMBIA. Una sección que estaba debajo de la ventana y de
     * pronto queda encima —ir al final de la página, volver
     * con el botón atrás, seguir un ancla, rodar la rueda
     * rápido— nunca llega a intersecar: su proporción pasa de
     * 0 a 0 y no se dispara ningún evento. Sin este barrido se
     * quedaría invisible para siempre, que es mucho peor que
     * no animarla.
     */
    const barrer = () => {
      for (const el of pendientes) {
        if (el.getBoundingClientRect().bottom <= 0) revelar(el);
      }

      if (pendientes.size === 0) desengancharScroll();
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) revelar(entrada.target);
        }

        barrer();
      },
      {
        /*
          El margen negativo abajo retrasa la aparición hasta
          que la sección asoma de verdad: sin él la animación
          termina antes de que el contenido esté a la vista y
          no se llega a percibir.
        */
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.15,
      }
    );

    /*
      El barrido también cuelga del scroll, limitado a un
      fotograma. Es una comprobación de unos pocos rectángulos
      que además se desengancha sola en cuanto no queda nada
      pendiente, así que no deja ningún coste de por vida.
    */
    let pedido = 0;

    const alHacerScroll = () => {
      if (pedido) return;

      pedido = requestAnimationFrame(() => {
        pedido = 0;
        barrer();
      });
    };

    const desengancharScroll = () =>
      window.removeEventListener("scroll", alHacerScroll);

    const alto = window.innerHeight;

    for (const seccion of document.querySelectorAll("main section")) {
      if (seccion.getBoundingClientRect().top < alto * 0.9) continue;

      seccion.classList.add("rk-revelar");
      pendientes.add(seccion);
      observador.observe(seccion);
    }

    if (pendientes.size === 0) return;

    window.addEventListener("scroll", alHacerScroll, { passive: true });

    return () => {
      observador.disconnect();
      desengancharScroll();

      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  return null;
}
