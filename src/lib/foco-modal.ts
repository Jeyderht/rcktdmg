"use client";

import { useEffect, useRef } from "react";

/**
 * Lo que puede recibir el foco dentro de un diálogo.
 *
 * `:not([disabled])` y `tabindex="-1"` quedan fuera a
 * propósito: un control apagado o retirado del orden de
 * tabulación no debe recibir el foco al abrir ni atrapar el
 * recorrido.
 */
const ENFOCABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(ENFOCABLE)].filter((e) => {
    /* Un elemento oculto existe en el DOM pero no se puede usar. */
    if (e.hasAttribute("aria-hidden")) return false;
    const caja = e.getBoundingClientRect();
    return caja.width > 0 || caja.height > 0;
  });
}

/**
 * Encierra el foco dentro de un diálogo mientras está abierto.
 *
 * Qué resuelve, en orden:
 *
 *  1. Al abrir, el foco entra en el panel. Antes se quedaba en
 *     `body`: quien navega con teclado abría la hoja y seguía
 *     tabulando por la página de DETRÁS, sin saberlo.
 *  2. Mientras está abierto, Tab y Shift+Tab dan la vuelta
 *     dentro del panel en vez de escaparse al contenido.
 *  3. Escape cierra.
 *  4. Al cerrar, el foco vuelve EXACTAMENTE al elemento que
 *     abrió el diálogo, que es donde el usuario estaba.
 *
 * Sin `setTimeout`. El efecto corre después de que React haya
 * montado el panel, así que el nodo ya existe cuando se le pide
 * el foco; esperar un tiempo arbitrario solo escondería una
 * carrera en lugar de evitarla.
 *
 * @param abierto Si el diálogo está visible.
 * @param cerrar  Qué hacer cuando se pulsa Escape.
 * @returns La `ref` que hay que poner en el panel del diálogo.
 */
export function useFocoModal(abierto: boolean, cerrar: () => void) {
  const panel = useRef<HTMLDivElement | null>(null);
  /* Quién tenía el foco justo antes de abrir. */
  const disparador = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    const caja = panel.current;
    if (!caja) return;

    disparador.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    /*
      El foco entra en el primer control del panel. Si no
      hubiera ninguno —una hoja solo con texto—, lo recibe el
      propio panel, que para eso lleva `tabIndex={-1}`.
    */
    const primeros = enfocables(caja);
    (primeros[0] ?? caja).focus();

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      const lista = enfocables(caja as HTMLElement);
      if (lista.length === 0) {
        /* Nada que recorrer: el foco se queda donde está. */
        evento.preventDefault();
        return;
      }

      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;

      /*
        El salto solo se fuerza en los extremos. En medio del
        recorrido manda el navegador, que conoce el orden real
        mejor que cualquier lista que se construya a mano.
      */
      if (evento.shiftKey) {
        if (actual === primero || !caja?.contains(actual)) {
          evento.preventDefault();
          ultimo.focus();
        }
        return;
      }

      if (actual === ultimo || !caja?.contains(actual)) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsar, true);

    return () => {
      document.removeEventListener("keydown", alPulsar, true);

      /*
        De vuelta al botón que lo abrió. Se comprueba que siga
        en el documento: si la propia acción del diálogo lo
        desmontó, forzar el foco sobre un nodo huérfano lo
        mandaría a `body` y se perdería igual.
      */
      const vuelta = disparador.current;
      if (vuelta && document.contains(vuelta)) vuelta.focus();
      disparador.current = null;
    };
  }, [abierto, cerrar]);

  return panel;
}
