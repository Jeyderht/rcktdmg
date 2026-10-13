"use client";

import { useRef, type TouchEvent } from "react";

/**
 * Deslizar con el dedo.
 *
 * Un solo sitio para todo lo que se pasa: stories, carruseles
 * y galerías. Devuelve los tres manejadores listos para
 * repartir sobre el elemento que se quiere hacer deslizable.
 *
 * Tres decisiones que evitan los problemas de siempre:
 *
 * 1. NO cancela el gesto. No se llama a `preventDefault` ni se
 *    pone `touch-action: none`, así que la página sigue
 *    haciendo scroll vertical con normalidad y el navegador
 *    conserva su gesto de volver atrás.
 *
 * 2. Un gesto MÁS VERTICAL QUE HORIZONTAL no es un swipe, es
 *    un scroll. Se descarta comparando los dos recorridos,
 *    no adivinando.
 *
 * 3. Un roce no es un gesto. Por debajo del umbral no pasa
 *    nada, que es lo que permite que un botón dentro del
 *    área siga siendo pulsable: el toque corto no mueve
 *    nada y el `click` llega a su destino.
 *
 * Con dos dedos —un zoom— se abandona sin más.
 */
export type ManejadoresSwipe = {
  onTouchStart: (evento: TouchEvent) => void;
  onTouchMove: (evento: TouchEvent) => void;
  onTouchEnd: (evento: TouchEvent) => void;
};

/**
 * Distancia mínima, en píxeles, para que cuente como swipe.
 *
 * 48 px es aproximadamente la yema de un dedo: por debajo no
 * se distingue de la imprecisión de un toque.
 */
export const UMBRAL_SWIPE = 48;

export function useSwipe({
  alIzquierda,
  alDerecha,
  umbral = UMBRAL_SWIPE,
  activo = true,
}: {
  /** Dedo hacia la izquierda: normalmente, "siguiente". */
  alIzquierda?: () => void;
  /** Dedo hacia la derecha: normalmente, "anterior". */
  alDerecha?: () => void;
  umbral?: number;
  /** Con `false` los manejadores no hacen nada. */
  activo?: boolean;
}): ManejadoresSwipe {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const valido = useRef(false);

  function onTouchStart(evento: TouchEvent) {
    if (!activo || evento.touches.length !== 1) {
      inicio.current = null;
      valido.current = false;
      return;
    }

    const t = evento.touches[0];

    inicio.current = { x: t.clientX, y: t.clientY };
    valido.current = true;
  }

  function onTouchMove(evento: TouchEvent) {
    // Un segundo dedo convierte el gesto en otra cosa (zoom).
    if (evento.touches.length !== 1) valido.current = false;
  }

  function onTouchEnd(evento: TouchEvent) {
    const desde = inicio.current;

    inicio.current = null;

    if (!activo || !valido.current || !desde) return;

    valido.current = false;

    const t = evento.changedTouches[0];

    if (!t) return;

    const dx = t.clientX - desde.x;
    const dy = t.clientY - desde.y;

    // Más vertical que horizontal: la persona estaba haciendo scroll.
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) < umbral) return;

    if (dx < 0) alIzquierda?.();
    else alDerecha?.();
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default useSwipe;
