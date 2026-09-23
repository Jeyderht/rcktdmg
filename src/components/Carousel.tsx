"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carrusel horizontal del marketplace.
 *
 * En móvil se desliza con el dedo y engancha en cada tarjeta
 * (scroll-snap nativo, sin librerías). En escritorio aparecen
 * dos flechas de vidrio que solo se muestran cuando hay algo
 * hacia ese lado.
 *
 * El desbordamiento vive dentro del riel, nunca en la página.
 */
export default function Carousel({
  children,
  etiqueta,
}: {
  children: React.ReactNode;
  /** Nombre accesible del grupo, p. ej. "Packs destacados". */
  etiqueta: string;
}) {
  const riel = useRef<HTMLDivElement>(null);

  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(false);

  const revisar = useCallback(() => {
    const nodo = riel.current;

    if (!nodo) return;

    const margen = 8;

    setPuedeIzquierda(nodo.scrollLeft > margen);

    setPuedeDerecha(
      nodo.scrollLeft + nodo.clientWidth < nodo.scrollWidth - margen
    );
  }, []);

  useEffect(() => {
    const nodo = riel.current;

    if (!nodo) return;

    revisar();

    nodo.addEventListener("scroll", revisar, { passive: true });
    window.addEventListener("resize", revisar);

    return () => {
      nodo.removeEventListener("scroll", revisar);
      window.removeEventListener("resize", revisar);
    };
  }, [revisar, children]);

  function desplazar(direccion: -1 | 1) {
    const nodo = riel.current;

    if (!nodo) return;

    // Se avanza algo menos de una pantalla para no perder el hilo.
    nodo.scrollBy({
      left: direccion * nodo.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={riel}
        role="group"
        aria-label={etiqueta}
        className="rk-rail -mx-4 px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {children}
      </div>

      {/* Controles: vidrio sobre el contenido, nunca sobre la
          imagen en sí. Se ocultan en móvil, donde se desliza. */}
      {puedeIzquierda && (
        <button
          type="button"
          onClick={() => desplazar(-1)}
          aria-label={`Ver anteriores de ${etiqueta}`}
          className="rk-press rk-glass-strong absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-rk sm:flex"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {puedeDerecha && (
        <button
          type="button"
          onClick={() => desplazar(1)}
          aria-label={`Ver siguientes de ${etiqueta}`}
          className="rk-press rk-glass-strong absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-rk sm:flex"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
