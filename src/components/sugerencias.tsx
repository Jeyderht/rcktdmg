"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileText,
  Folder,
  Tag as TagIcon,
  TrendingUp,
  User,
} from "lucide-react";

/**
 * Sugerencias de búsqueda: datos y presentación.
 *
 * Lo usan el buscador grande de la tienda y el campo del
 * navbar, que tienen aspectos distintos a propósito. Compartir
 * el hook y la lista evita que las dos versiones se separen
 * con el tiempo y se comporten distinto.
 */

export type Sugerencia = {
  tipo: "recurso" | "categoria" | "etiqueta" | "creador";
  etiqueta: string;
  detalle?: string;
  href: string;
};

export type Destacado = { etiqueta: string; href: string };

export type Opcion = Sugerencia | Destacado;

export const MINIMO_SUGERENCIA = 2;

const ESPERA_MS = 220;

const ICONOS = {
  recurso: FileText,
  categoria: Folder,
  etiqueta: TagIcon,
  creador: User,
} as const;

const ROTULOS = {
  recurso: "Recurso",
  categoria: "Categoría",
  etiqueta: "Etiqueta",
  creador: "Creador",
} as const;

export function esSugerencia(opcion: Opcion): opcion is Sugerencia {
  return "tipo" in opcion;
}

/**
 * Consulta las sugerencias del texto escrito.
 *
 * Una petición por pausa de escritura, no por tecla: sin eso,
 * teclear "restaurante" lanzaría once peticiones y la
 * penúltima podría contestar después de la última y pisarla.
 * Al desmontar o al cambiar el texto se aborta la anterior.
 */
export function useSugerencias(texto: string, activo: boolean) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [destacados, setDestacados] = useState<Destacado[]>([]);

  useEffect(() => {
    if (!activo) return;

    const consulta = texto.trim();

    if (consulta.length > 0 && consulta.length < MINIMO_SUGERENCIA) {
      setSugerencias([]);
      return;
    }

    const control = new AbortController();

    const temporizador = setTimeout(async () => {
      try {
        const respuesta = await fetch(
          `/api/buscar/sugerencias?q=${encodeURIComponent(consulta)}`,
          { signal: control.signal }
        );

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        setSugerencias(datos.sugerencias ?? []);
        setDestacados(datos.destacados ?? []);
      } catch {
        /* Cancelada o red caída: el buscador sigue funcionando. */
      }
    }, ESPERA_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [texto, activo]);

  const opciones: Opcion[] =
    texto.trim().length >= MINIMO_SUGERENCIA ? sugerencias : destacados;

  return { opciones, hayTexto: texto.trim().length >= MINIMO_SUGERENCIA };
}

/** Lista desplegable de sugerencias. */
export function ListaSugerencias({
  id,
  opciones,
  activo,
  hayTexto,
  onElegir,
  onResaltar,
  className = "",
}: {
  id: string;
  opciones: Opcion[];
  activo: number;
  hayTexto: boolean;
  onElegir: () => void;
  onResaltar: (indice: number) => void;
  className?: string;
}) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Sugerencias de búsqueda"
      className={`rk-glass-strong rk-float absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[22rem] overflow-y-auto rounded-rk-md py-1.5 ${className}`}
    >
      {!hayTexto && (
        <li className="px-4 pb-1 pt-1.5">
          <p className="rk-kicker">Populares ahora</p>
        </li>
      )}

      {opciones.map((opcion, indice) => {
        const Icono = esSugerencia(opcion)
          ? ICONOS[opcion.tipo]
          : TrendingUp;

        return (
          <li key={`${opcion.href}-${indice}`} role="none">
            <Link
              id={`${id}-${indice}`}
              role="option"
              aria-selected={indice === activo}
              href={opcion.href}
              onClick={onElegir}
              onMouseEnter={() => onResaltar(indice)}
              className={`flex min-h-[2.75rem] items-center gap-3 px-4 py-2 text-sm transition-colors duration-fast ease-rk ${
                indice === activo ? "bg-ink/[0.06]" : ""
              }`}
            >
              <Icono
                size={15}
                aria-hidden
                className="shrink-0 text-ink/45"
              />

              <span className="min-w-0 flex-1 truncate">
                {opcion.etiqueta}
              </span>

              {esSugerencia(opcion) && (
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink/40">
                  {opcion.detalle ?? ROTULOS[opcion.tipo]}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Navegación con teclado sobre una lista de sugerencias.
 *
 * Devuelve el manejador de teclas y el índice resaltado.
 */
export function useTecladoSugerencias(
  opciones: Opcion[],
  cerrar: () => void,
  ir: (href: string) => void
) {
  const [activo, setActivo] = useState(-1);

  // Al cambiar las opciones, la selección anterior ya no vale.
  useEffect(() => {
    setActivo(-1);
  }, [opciones]);

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      cerrar();
      return;
    }

    if (opciones.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActivo((previo) => (previo + 1) % opciones.length);
      return;
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActivo((previo) =>
        previo <= 0 ? opciones.length - 1 : previo - 1
      );
      return;
    }

    // Con una sugerencia elegida, Enter va a ella y no busca.
    if (evento.key === "Enter" && activo >= 0) {
      evento.preventDefault();
      cerrar();
      ir(opciones[activo].href);
    }
  }

  return { activo, setActivo, alTeclear };
}
