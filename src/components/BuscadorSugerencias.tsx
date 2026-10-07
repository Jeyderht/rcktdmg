"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  ListaSugerencias,
  useSugerencias,
  useTecladoSugerencias,
} from "@/components/sugerencias";
import { IconoBuscar } from "@/components/iconos";

/**
 * Buscador de la tienda, con sugerencias.
 *
 * Envuelve un <form> normal que apunta a /tienda: si el
 * JavaScript no ha cargado, escribir y pulsar Enter sigue
 * buscando igual. Las sugerencias son una ayuda encima, no el
 * mecanismo. Todo lo que aparece sale de la base de datos.
 */
export default function BuscadorSugerencias({
  valorInicial = "",
  ocultos = {},
  placeholder = "Buscar recursos...",
  className = "",
  idInput,
}: {
  valorInicial?: string;
  /** Id del campo, para que la cabecera pueda enfocarlo. */
  idInput?: string;
  /** Filtros que deben viajar con la búsqueda. */
  ocultos?: Record<string, string | undefined>;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const listaId = useId();

  const [texto, setTexto] = useState(valorInicial);
  const [abierto, setAbierto] = useState(false);

  const contenedor = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // La URL puede cambiar por detrás (botón atrás del navegador).
  useEffect(() => {
    setTexto(valorInicial);
  }, [valorInicial]);

  const { opciones, hayTexto } = useSugerencias(texto, abierto);

  const { activo, setActivo, alTeclear } = useTecladoSugerencias(
    opciones,
    () => setAbierto(false),
    (href) => router.push(href)
  );

  useEffect(() => {
    if (!abierto) return;

    function alPulsar(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", alPulsar);

    return () => document.removeEventListener("mousedown", alPulsar);
  }, [abierto]);

  const hayLista = abierto && opciones.length > 0;

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      {/*
        El formulario ES la superficie: el borde, el fondo y el
        desenfoque viven aquí, no en el campo. Antes los llevaba
        el input y el botón se posaba encima, que es lo que
        producía el aspecto de caja con un botón pegado.
      */}
      <form
        action="/tienda"
        method="GET"
        autoComplete="off"
        role="search"
        className="rk-buscador"
      >
        {Object.entries(ocultos).map(([clave, valor]) =>
          valor ? (
            <input key={clave} type="hidden" name={clave} value={valor} />
          ) : null
        )}

        <IconoBuscar
          size={18}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45"
        />

        <input
          ref={entrada}
          id={idInput}
          type="search"
          name="q"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alTeclear}
          placeholder={placeholder}
          aria-label="Buscar recursos"
          role="combobox"
          aria-expanded={hayLista}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={
            activo >= 0 ? `${listaId}-${activo}` : undefined
          }
          spellCheck={false}
          className="rk-buscador-campo"
        />

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {texto && (
            <button
              type="button"
              onClick={() => {
                setTexto("");
                entrada.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="rk-icon-button rk-press rk-touch"
            >
              <X size={15} aria-hidden />
            </button>
          )}

          <button
            type="submit"
            className="rk-buscador-accion"
          >
            Buscar
          </button>
        </div>
      </form>

      {hayLista && (
        <ListaSugerencias
          id={listaId}
          opciones={opciones}
          activo={activo}
          hayTexto={hayTexto}
          onElegir={() => setAbierto(false)}
          onResaltar={setActivo}
        />
      )}
    </div>
  );
}
