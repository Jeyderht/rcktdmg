"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";

import {
  LARGO_MAXIMO_TAG,
  MAXIMO_TAGS_POR_RECURSO,
  normalizarNombreTag,
  slugificarTag,
} from "@/lib/tags-comun";

type Sugerida = { name: string; slug: string; recursos: number };

/**
 * Selector de etiquetas del Creator Studio.
 *
 * Escribe, busca entre las que ya existen y crea la etiqueta
 * solo si no encuentra ninguna. Reutilizar tiene preferencia
 * sobre crear: cada etiqueta nueva que significa lo mismo que
 * otra parte el catálogo en dos.
 *
 * La comparación se hace por slug, igual que en el servidor,
 * de modo que "Navidad" y "navidad" se reconocen como la
 * misma antes incluso de enviar el formulario.
 */
export default function TagsInput({
  valor,
  onChange,
  disabled = false,
}: {
  valor: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const listaId = useId();

  const [texto, setTexto] = useState("");
  const [sugeridas, setSugeridas] = useState<Sugerida[]>([]);
  const [abierto, setAbierto] = useState(false);

  const contenedor = useRef<HTMLDivElement>(null);

  const slugsPuestos = new Set(valor.map(slugificarTag));

  const lleno = valor.length >= MAXIMO_TAGS_POR_RECURSO;

  useEffect(() => {
    const consulta = texto.trim();

    if (consulta.length < 1) {
      setSugeridas([]);
      return;
    }

    const control = new AbortController();

    const temporizador = setTimeout(async () => {
      try {
        const respuesta = await fetch(
          `/api/tags?q=${encodeURIComponent(consulta)}&limite=8`,
          { signal: control.signal }
        );

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        setSugeridas(datos.tags ?? []);
      } catch {
        /* Cancelada: se deja la lista como estaba. */
      }
    }, 200);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [texto]);

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

  function anadir(nombre: string) {
    const limpio = normalizarNombreTag(nombre);
    const slug = slugificarTag(limpio);

    if (!limpio || !slug || lleno) return;

    // Ya puesta: no se duplica, solo se limpia el campo.
    if (!slugsPuestos.has(slug)) {
      onChange([...valor, limpio]);
    }

    setTexto("");
    setAbierto(false);
  }

  function quitar(nombre: string) {
    onChange(valor.filter((t) => t !== nombre));
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    // Enter y coma cierran la etiqueta que se está escribiendo.
    if (evento.key === "Enter" || evento.key === ",") {
      evento.preventDefault();
      anadir(texto);
      return;
    }

    if (evento.key === "Escape") {
      setAbierto(false);
      return;
    }

    // Retroceso con el campo vacío quita la última.
    if (evento.key === "Backspace" && !texto && valor.length > 0) {
      quitar(valor[valor.length - 1]);
    }
  }

  const noPuestas = sugeridas.filter(
    (s) => !slugsPuestos.has(s.slug)
  );

  const slugEscrito = slugificarTag(texto);

  const puedeCrear =
    slugEscrito.length > 0 &&
    !slugsPuestos.has(slugEscrito) &&
    !noPuestas.some((s) => s.slug === slugEscrito) &&
    !lleno;

  return (
    <div ref={contenedor} className="relative">
      {/* SELECCIONADAS */}
      {valor.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {valor.map((tag) => (
            <li key={tag}>
              <span className="rk-chip rk-chip-active" style={{ paddingRight: 6 }}>
                {tag}

                <button
                  type="button"
                  onClick={() => quitar(tag)}
                  disabled={disabled}
                  aria-label={`Quitar etiqueta ${tag}`}
                  className="rk-press flex h-6 w-6 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-40"
                >
                  <X size={13} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <TagIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45"
        />

        <input
          type="text"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alTeclear}
          disabled={disabled || lleno}
          maxLength={LARGO_MAXIMO_TAG}
          placeholder={
            lleno
              ? `Máximo ${MAXIMO_TAGS_POR_RECURSO} etiquetas`
              : "Escribe y pulsa Enter"
          }
          aria-label="Añadir etiqueta"
          // Sin role explícito, un <input> es textbox y no
          // admite aria-expanded.
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          autoComplete="off"
          className="rk-input !pl-11"
        />
      </div>

      <p className="mt-1.5 text-xs text-ink/50">
        {valor.length} de {MAXIMO_TAGS_POR_RECURSO}. Ayudan a que
        te encuentren en la búsqueda.
      </p>

      {abierto && (noPuestas.length > 0 || puedeCrear) && (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Etiquetas sugeridas"
          className="rk-card-elevated absolute left-0 right-0 top-[calc(100%-0.5rem)] z-40 max-h-56 overflow-y-auto rounded-rk-md py-1.5"
        >
          {noPuestas.map((sugerida) => (
            <li key={sugerida.slug} role="none">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => anadir(sugerida.name)}
                className="flex min-h-[2.75rem] w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors duration-fast ease-rk hover:bg-ink/[0.06]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {sugerida.name}
                </span>

                <span className="shrink-0 text-[11px] tabular-nums text-ink/40">
                  {sugerida.recursos}
                </span>
              </button>
            </li>
          ))}

          {puedeCrear && (
            <li role="none">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => anadir(texto)}
                className="flex min-h-[2.75rem] w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors duration-fast ease-rk hover:bg-ink/[0.06]"
              >
                <Plus size={14} aria-hidden className="shrink-0 text-ink/45" />

                <span className="min-w-0 flex-1 truncate">
                  Crear{" "}
                  <span className="font-semibold">
                    {normalizarNombreTag(texto)}
                  </span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
