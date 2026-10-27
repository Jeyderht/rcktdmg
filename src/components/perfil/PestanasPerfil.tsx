"use client";

import { useEffect, useRef } from "react";

/**
 * Barra de pestañas de categorías del perfil.
 *
 * Si no caben, se desplaza en horizontal por dentro (rk-tabs ya
 * lleva overflow-x). Al cargar, deja a la vista la pestaña activa:
 * con ?categoria= de una que queda fuera, sin esto se vería otra.
 */
export default function PestanasPerfil({
  children,
}: {
  children: React.ReactNode;
}) {
  const barra = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = barra.current;
    const activa = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !activa) return;

    // Posición de la pestaña dentro de la barra (offsetLeft mediría
    // desde .rk-hero, que es el ancestro posicionado).
    const caja = nav.getBoundingClientRect();
    const tab = activa.getBoundingClientRect();

    if (tab.left < caja.left || tab.right > caja.right) {
      nav.scrollLeft +=
        tab.left - caja.left - (caja.width - tab.width) / 2;
    }
  }, []);

  return (
    <nav
      ref={barra}
      className="rk-tabs rk-tabs-track"
      aria-label="Categorías del creador"
    >
      {children}
    </nav>
  );
}
