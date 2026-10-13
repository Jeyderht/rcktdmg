"use client";

import Link from "next/link";
import { Children, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Layers,
  Library,
  Shapes,
  Share2,
  Tag,
} from "lucide-react";

import { IconoExplorar } from "@/components/iconos";

/**
 * Catálogo del inicio en pestañas.
 *
 * Reúne en una sola sección lo que antes eran ocho: cada
 * pestaña muestra un panel que llega YA RENDERIZADO desde el
 * servidor como hijo (las consultas siguen en page.tsx). Aquí
 * solo se decide cuál se ve.
 *
 * Todos los paneles están en el HTML; los inactivos van con
 * `hidden`. Así el visor de Stories y demás estado interno no
 * se pierden al cambiar de pestaña.
 *
 * Accesible como tablist: flechas izquierda/derecha (dan la
 * vuelta), Inicio y Fin, y solo la pestaña activa entra en el
 * orden de tabulación.
 *
 * El botón negro de abajo es UNO: su texto y su destino cambian
 * con la pestaña. Si una pestaña no tiene a dónde llevar, no se
 * pinta.
 */

export type ClavePestana =
  | "destacados"
  | "stories"
  | "general"
  | "colecciones"
  | "selecciones"
  | "packs"
  | "guardados"
  | "parati";

export type PestanaCatalogo = {
  clave: ClavePestana;
  nombre: string;
  descripcion: string;
  cta: { texto: string; href: string } | null;
};

/* Icono y par de colores del círculo de cada pestaña. */
const ASPECTO: Record<
  ClavePestana,
  { icono: typeof Tag | typeof IconoExplorar; h1: string; h2: string }
> = {
  destacados: { icono: Tag, h1: "#9d97ff", h2: "#c9a3d8" },
  stories: { icono: Share2, h1: "#f0a98a", h2: "#f8d6c6" },
  general: { icono: Briefcase, h1: "#8e8ad8", h2: "#b9b4f0" },
  colecciones: { icono: Library, h1: "#e9a8b8", h2: "#f8d6c6" },
  selecciones: { icono: Shapes, h1: "#c9a3d8", h2: "#f0a98a" },
  packs: { icono: Layers, h1: "#3a3a46", h2: "#15161b" },
  guardados: { icono: Heart, h1: "#f0a98a", h2: "#e58f9a" },
  parati: { icono: IconoExplorar, h1: "#9d97ff", h2: "#8e8ad8" },
};

export default function CatalogoPestanas({
  pestanas,
  children,
}: {
  pestanas: PestanaCatalogo[];
  children: ReactNode;
}) {
  const base = useId();
  const paneles = Children.toArray(children);

  const [activa, setActiva] = useState(0);
  const barra = useRef<HTMLDivElement>(null);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const elegir = (i: number, enfocar = false) => {
    setActiva(i);

    const boton = botones.current[i];
    const tira = barra.current;
    if (!boton || !tira) return;

    if (enfocar) boton.focus();

    // La pestaña elegida queda centrada en la barra (móvil).
    window.setTimeout(() => {
      const quieto = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      tira.scrollTo({
        left: boton.offsetLeft - (tira.clientWidth - boton.offsetWidth) / 2,
        behavior: quieto ? "auto" : "smooth",
      });
    }, 20);
  };

  const alPulsarTecla = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const total = pestanas.length;
    const destino =
      e.key === "ArrowRight"
        ? i + 1
        : e.key === "ArrowLeft"
          ? i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? total - 1
              : null;

    if (destino === null) return;

    e.preventDefault();
    elegir((destino + total) % total, true);
  };

  const cta = pestanas[activa]?.cta;

  return (
    <div className="rk-fade-up rk-enter-1 rk-hub mt-8">
      <div
        ref={barra}
        className="rk-hub-tabs"
        role="tablist"
        aria-label="Explorar catálogo"
      >
        {pestanas.map((pestana, i) => {
          const { icono: Icono, h1, h2 } = ASPECTO[pestana.clave];
          const elegida = i === activa;

          return (
            <button
              key={pestana.clave}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-t${i}`}
              aria-controls={`${base}-p${i}`}
              aria-selected={elegida}
              tabIndex={elegida ? 0 : -1}
              className="rk-hub-tab"
              style={{ "--h1": h1, "--h2": h2 } as CSSProperties}
              onClick={() => elegir(i)}
              onKeyDown={(e) => alPulsarTecla(e, i)}
            >
              <span className="rk-hub-tab-ico" aria-hidden="true">
                <Icono size={17} strokeWidth={1.8} aria-hidden />
              </span>
              <span className="rk-hub-tab-txt">{pestana.nombre}</span>
            </button>
          );
        })}
      </div>

      <div className="rk-hub-panel">
        {pestanas.map((pestana, i) => (
          <div
            key={pestana.clave}
            role="tabpanel"
            id={`${base}-p${i}`}
            aria-labelledby={`${base}-t${i}`}
            className="rk-hub-pane"
            hidden={i !== activa}
          >
            <p className="rk-hub-desc">{pestana.descripcion}</p>
            <div className="rk-hub-body">{paneles[i]}</div>
          </div>
        ))}
      </div>

      {cta && (
        <Link href={cta.href} className="rk-hub-cta">
          <span className="rk-hub-cta-t">{cta.texto}</span>
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}
