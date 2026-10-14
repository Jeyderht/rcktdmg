"use client";

import { useEffect, useRef, useState } from "react";

const ESCRIBIR_MS = 70;
const BORRAR_MS = 35;
const PAUSA_MS = 1500;
const ENTRE_FRASES_MS = 350;
const MAXIMO_FRASES = 6;

/**
 * Sugerencias que se escriben solas en el buscador vacío.
 *
 * Es una capa decorativa (aria-hidden, sin eventos) encima del
 * campo, no su placeholder: el input conserva su aria-label y su
 * placeholder estático, que es lo que leen los lectores de
 * pantalla y lo que se ve sin JavaScript. Mientras la capa está
 * visible, el placeholder real se vuelve transparente
 * (data-placeholder-animado en la caja).
 *
 * Va dentro de la caja del buscador (.rk-buscador) y busca el
 * campo en ella, así que sirve igual en el formulario del hero
 * que en BuscadorSugerencias. Se calla al enfocar o escribir y
 * vuelve con el campo vacío y sin foco; se pausa con la pestaña
 * oculta o fuera de pantalla. Con «reducir movimiento», una
 * frase fija. Sin frases, no hace nada.
 *
 * Las frases salen de los términos destacados reales
 * (terminosDestacados en lib/busqueda), los mismos de
 * «Populares ahora».
 */
export default function PlaceholderAnimado({ frases }: { frases: string[] }) {
  const capa = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [texto, setTexto] = useState("");

  const lista = frases
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAXIMO_FRASES);
  const clave = lista.join("|");

  useEffect(() => {
    const el = capa.current;
    const caja = el?.parentElement;
    const campo = caja?.querySelector<HTMLInputElement>("input[type=search]");

    if (!el || !caja || !campo || !clave) return;

    const frasesActivas = clave.split("|");
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Mismos márgenes que el texto del campo: no tapa icono ni botón.
    const encajar = () => {
      const estilo = getComputedStyle(campo);
      el.style.left = estilo.paddingLeft;
      el.style.right = estilo.paddingRight;
      el.style.fontSize = estilo.fontSize;
    };

    let enPantalla = true;
    let temporizador: number | undefined;
    let indice = 0;
    let letras = 0;
    let borrando = false;

    const puedeVerse = () => !campo.value && document.activeElement !== campo;

    const mostrar = (si: boolean) => {
      setVisible(si);
      if (si) caja.setAttribute("data-placeholder-animado", "");
      else caja.removeAttribute("data-placeholder-animado");
    };

    const paso = () => {
      window.clearTimeout(temporizador);

      const si = puedeVerse();
      mostrar(si);

      if (!si) return;

      if (reducido) {
        setTexto(frasesActivas[0]);
        return;
      }

      // Pausa: pestaña oculta o fuera de pantalla.
      if (document.hidden || !enPantalla) return;

      const frase = frasesActivas[indice];

      if (!borrando) {
        letras += 1;
        setTexto(frase.slice(0, letras));

        if (letras >= frase.length) {
          borrando = true;
          temporizador = window.setTimeout(paso, PAUSA_MS);
          return;
        }

        temporizador = window.setTimeout(paso, ESCRIBIR_MS);
        return;
      }

      letras -= 1;
      setTexto(frase.slice(0, letras));

      if (letras <= 0) {
        borrando = false;
        indice = (indice + 1) % frasesActivas.length;
        temporizador = window.setTimeout(paso, ENTRE_FRASES_MS);
        return;
      }

      temporizador = window.setTimeout(paso, BORRAR_MS);
    };

    const reiniciar = () => {
      if (!campo.value) {
        letras = 0;
        borrando = false;
      }
      paso();
    };

    const observador = new IntersectionObserver(([entrada]) => {
      enPantalla = entrada.isIntersecting;
      paso();
    });
    observador.observe(caja);

    encajar();
    window.addEventListener("resize", encajar);
    campo.addEventListener("focus", paso);
    campo.addEventListener("blur", reiniciar);
    campo.addEventListener("input", reiniciar);
    document.addEventListener("visibilitychange", paso);

    paso();

    return () => {
      window.clearTimeout(temporizador);
      observador.disconnect();
      window.removeEventListener("resize", encajar);
      campo.removeEventListener("focus", paso);
      campo.removeEventListener("blur", reiniciar);
      campo.removeEventListener("input", reiniciar);
      document.removeEventListener("visibilitychange", paso);
      caja.removeAttribute("data-placeholder-animado");
    };
  }, [clave]);

  return (
    <span ref={capa} aria-hidden="true" className="rk-ph-animado" hidden={!visible}>
      <span className="rk-ph-animado-texto">Buscar {texto}</span>
      <i className="rk-ph-animado-cursor" />
    </span>
  );
}
