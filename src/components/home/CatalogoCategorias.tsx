"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Heart,
  Layers,
  LayoutGrid,
  Library,
} from "lucide-react";

export type ClaveCategoriaInicio = "eventos" | "general" | "colecciones" | "packs";
export type ClavePestanaInicio = "recientes" | "populares" | "packs";

/** Una categoría con sus pestañas ya renderizadas en el servidor. */
export type CategoriaInicio = {
  clave: ClaveCategoriaInicio;
  nombre: string;
  descripcion: string;
  href: string;
  pestanas: { clave: ClavePestanaInicio; nombre: string; contenido: ReactNode }[];
};

const ICONO_CATEGORIA = {
  eventos: CalendarDays,
  general: LayoutGrid,
  colecciones: Library,
  packs: Layers,
} as const;

const ICONO_PESTANA = { recientes: Clock, populares: Heart, packs: Layers } as const;

const SALIDA_MS = 200;
const HUECO_MS = 200;
const ENTRADA_MS = 300;

/** Flechas, Inicio y Fin en un tablist: devuelve el índice nuevo o null. */
function teclaTablist(evento: KeyboardEvent, actual: number, total: number) {
  const siguiente: Record<string, number> = {
    ArrowRight: (actual + 1) % total,
    ArrowLeft: (actual - 1 + total) % total,
    Home: 0,
    End: total - 1,
  };

  if (!(evento.key in siguiente)) return null;

  evento.preventDefault();
  return siguiente[evento.key];
}

/**
 * Catálogo por categoría del inicio.
 *
 * Riel de categorías con el estilo del interruptor Admin /
 * Studio unido (tinta, segmento activo en perla); la elegida
 * lleva icono y nombre y las demás solo icono. Debajo, un panel
 * con las pestañas (subrayado lavanda que se desliza), la
 * descripción de la categoría y las tarjetas, ya renderizadas
 * en el servidor con ProductCard / ColeccionCard.
 *
 * Al cambiar de categoría el ancho de los botones se anima
 * (320 ms) y el panel hace salida (200 ms, opacidad y blur),
 * hueco (200 ms, aquí cambian los datos) y entrada (300 ms). Al
 * cambiar de pestaña, lo mismo solo con descripción y tarjetas.
 * Los clics de en medio se ignoran. Con reducir movimiento,
 * todo es instantáneo. Eventos sale elegida en cada carga.
 */
export default function CatalogoCategorias({ categorias }: { categorias: CategoriaInicio[] }) {
  const [categoria, setCategoria] = useState(0);
  const [pestana, setPestana] = useState(0);
  const [fase, setFase] = useState<"quieto" | "fuera-todo" | "fuera-tarjetas">("quieto");
  const [listo, setListo] = useState(false);

  const ocupado = useRef(false);
  const riel = useRef<HTMLDivElement>(null);

  const actual = categorias[categoria];
  const pestanas = actual.pestanas;

  /*
    Anchos del riel: la elegida mide su icono + su nombre; las
    demás se reparten lo que queda. Se miden en px para poder
    animar el ancho (no se puede animar hacia «auto»).
  */
  const medir = useCallback(() => {
    const el = riel.current;
    if (!el) return;

    const botones = [...el.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const estilo = getComputedStyle(el);
    const interior =
      el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    const elegido = botones[categoria];
    const texto = elegido?.querySelector<HTMLElement>(".rk-cc-riel-texto");

    if (!elegido || !texto) return;

    const otros = botones.length - 1;
    const ancho = Math.min(Math.ceil(34 + texto.scrollWidth + 16), interior - otros * 40);
    const resto = otros > 0 ? (interior - ancho) / otros : 0;

    botones.forEach((b, i) => {
      b.style.width = `${i === categoria ? ancho : resto}px`;
    });
  }, [categoria]);

  useLayoutEffect(() => {
    medir();
  }, [medir]);

  useEffect(() => {
    window.addEventListener("resize", medir);
    document.fonts?.ready.then(medir);

    // Sin transición en el primer pintado.
    const marco = requestAnimationFrame(() => requestAnimationFrame(() => setListo(true)));

    return () => {
      window.removeEventListener("resize", medir);
      cancelAnimationFrame(marco);
    };
  }, [medir]);

  function relevo(tipo: "fuera-todo" | "fuera-tarjetas", cambiar: () => void) {
    if (ocupado.current) return;
    ocupado.current = true;

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducido) {
      cambiar();
      ocupado.current = false;
      return;
    }

    setFase(tipo);

    window.setTimeout(() => {
      cambiar();
      window.setTimeout(() => {
        setFase("quieto");
        window.setTimeout(() => {
          ocupado.current = false;
        }, ENTRADA_MS);
      }, HUECO_MS);
    }, SALIDA_MS);
  }

  function elegirCategoria(indice: number) {
    if (indice === categoria || ocupado.current) return;

    relevo("fuera-todo", () => {
      setCategoria(indice);
      setPestana(0);
    });
  }

  function elegirPestana(indice: number) {
    if (indice === pestana || ocupado.current) return;

    relevo("fuera-tarjetas", () => setPestana(indice));
  }

  function enfocar(contenedor: HTMLElement | null, indice: number) {
    contenedor?.querySelectorAll<HTMLButtonElement>("[role=tab]")[indice]?.focus();
  }

  const IconoTitulo = ICONO_CATEGORIA[actual.clave];

  return (
    <section className="rk-cc" aria-label="Catálogo por categoría" data-fase={fase}>
      <div
        ref={riel}
        role="tablist"
        aria-label="Categorías"
        className="rk-cc-riel"
        data-listo={listo || undefined}
        onKeyDown={(e) => {
          const nuevo = teclaTablist(e, categoria, categorias.length);
          if (nuevo === null) return;
          elegirCategoria(nuevo);
          enfocar(riel.current, nuevo);
        }}
      >
        {categorias.map((c, i) => {
          const Icono = ICONO_CATEGORIA[c.clave];
          const elegida = i === categoria;

          return (
            <button
              key={c.clave}
              type="button"
              role="tab"
              id={`rk-cc-tab-${c.clave}`}
              aria-selected={elegida}
              aria-controls="rk-cc-panel"
              aria-label={c.nombre}
              tabIndex={elegida ? 0 : -1}
              onClick={() => elegirCategoria(i)}
              className="rk-cc-riel-boton"
            >
              <span aria-hidden className="rk-cc-riel-icono">
                <Icono />
              </span>
              <span aria-hidden className="rk-cc-riel-texto">
                {c.nombre}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="rk-cc-panel"
        role="tabpanel"
        aria-labelledby={`rk-cc-tab-${actual.clave}`}
        className="rk-cc-panel"
      >
        <div className="rk-cc-todo">
          {pestanas.length > 1 ? (
            <div
              role="tablist"
              aria-label={`Orden en ${actual.nombre}`}
              className="rk-cc-pestanas"
              style={{ ["--rk-cc-n" as string]: pestanas.length, ["--rk-cc-i" as string]: pestana }}
              onKeyDown={(e) => {
                const nuevo = teclaTablist(e, pestana, pestanas.length);
                if (nuevo === null) return;
                elegirPestana(nuevo);
                enfocar(e.currentTarget, nuevo);
              }}
            >
              {pestanas.map((p, i) => {
                const Icono = ICONO_PESTANA[p.clave];
                const elegida = i === pestana;

                return (
                  <button
                    key={p.clave}
                    type="button"
                    role="tab"
                    aria-selected={elegida}
                    tabIndex={elegida ? 0 : -1}
                    onClick={() => elegirPestana(i)}
                    className="rk-cc-pestana"
                  >
                    <Icono aria-hidden />
                    {p.nombre}
                  </button>
                );
              })}
              <span aria-hidden className="rk-cc-subrayado" />
            </div>
          ) : (
            <p className="rk-cc-solo">
              <IconoTitulo aria-hidden />
              {actual.nombre}
            </p>
          )}

          <div className="rk-cc-tarjetas-zona">
            <p className="rk-cc-descripcion" aria-live="polite">
              {actual.descripcion}
            </p>

            {pestanas[pestana]?.contenido}

            <div className="rk-cc-mas">
              <Link href={actual.href} className="rk-btn rk-btn-ink">
                Ver todo en {actual.nombre}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
