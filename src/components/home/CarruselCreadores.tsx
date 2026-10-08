"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type CreadorHome = {
  id: string;
  nombre: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  /** Especialidad deducida de su categoría más publicada. */
  especialidad: string | null;
  recursos: number;
  seguidores: number;
};

/**
 * Carrusel de creadores.
 *
 * Sustituye a la rejilla de cuatro creadores que había antes:
 * no son dos secciones, es la misma que ahora se desliza y
 * cabe en una línea aunque haya veinte.
 *
 * Tarjeta vertical: la portada del creador ocupa el alto y la
 * información vive en un panel inferior de vidrio. En
 * escritorio, al pasar el ratón el panel crece y enseña el
 * recuento; en táctil ese dato está siempre visible, porque
 * allí no existe el hover.
 *
 * Todo lo que se pinta sale de la base. Si un creador no tiene
 * portada se usa un degradado neutro, y si no tiene avatar,
 * su inicial: no se inventa ninguna imagen.
 */
export default function CarruselCreadores({
  creadores,
}: {
  creadores: CreadorHome[];
}) {
  const tira = useRef<HTMLUListElement>(null);

  if (creadores.length === 0) return null;

  function desplazar(direccion: 1 | -1) {
    const nodo = tira.current;

    if (!nodo) return;

    // Un paso ≈ una tarjeta y media, para que nunca quede
    // una tarjeta cortada justo en el borde.
    nodo.scrollBy({
      left: direccion * Math.round(nodo.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rk-kicker">Comunidad</p>

            <h2 className="rk-title mt-3 text-[2rem] sm:text-4xl">
              Creadores
            </h2>

            <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink/60">
              Quienes publican en RcktX. Cada perfil reúne todo su
              trabajo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {creadores.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => desplazar(-1)}
                  aria-label="Ver creadores anteriores"
                  className="rk-hero-round rk-flecha"
                >
                  <ChevronLeft size={18} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => desplazar(1)}
                  aria-label="Ver más creadores"
                  className="rk-hero-round rk-flecha"
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              </>
            )}

            <Link
              href="/creadores"
              className="rk-press rk-link-seccion group ml-1 gap-2 text-sm font-semibold"
            >
              Ver todos
              <ArrowUpRight
                size={15}
                aria-hidden
                className="transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </div>

        {/*
          Una tira con scroll y ajuste por tarjeta: funciona con
          el dedo, con la rueda y con las flechas, sin librerías
          y sin que se salga nada de la página.
        */}
        <ul
          ref={tira}
          className="rk-fade-up rk-enter-1 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {creadores.map((creador) => (
            <li
              key={creador.id}
              className="w-[15rem] shrink-0 snap-start sm:w-[16.5rem]"
            >
              <Link
                href={`/creadores/${creador.username}`}
                className="rk-press group relative block aspect-[3/4] w-full overflow-hidden rounded-rk-lg"
              >
                {creador.coverUrl ? (
                  <Image
                    src={creador.coverUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-normal ease-rk group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 60vw, 16.5rem"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-ink via-ink/75 to-ink/45"
                  />
                )}

                {/*
                  Degradado para que el panel se lea siempre.

                  Va con `--rk-marca-tinta`, que es fija, y no con
                  `ink`. `ink` es el color del TEXTO y se invierte
                  con el tema: en oscuro vale casi blanco, así que
                  este degradado no oscurecía la fotografía, la
                  lavaba de blanco por abajo y el nombre del
                  creador se perdía encima.
                */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, rgb(var(--rk-marca-tinta) / 0.85), rgb(var(--rk-marca-tinta) / 0.4) 45%, transparent)",
                  }}
                />

                {/* PANEL */}
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="flex items-center gap-2.5">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--rk-marca-centro)_/_0.2)] ring-1 ring-[rgb(var(--rk-marca-centro)_/_0.3)]">
                      {creador.avatarUrl ? (
                        <Image
                          src={creador.avatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[rgb(var(--rk-marca-centro))]">
                          {creador.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate text-[15px] font-semibold text-[rgb(var(--rk-marca-centro))]">
                          {creador.nombre}
                        </span>
                      </span>

                      <span className="block truncate text-[12px] text-[rgb(var(--rk-marca-centro)_/_0.7)]">
                        @{creador.username}
                      </span>
                    </span>

                    <span className="rk-press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgb(var(--rk-marca-centro))] text-[rgb(var(--rk-marca-tinta))] transition-transform duration-normal ease-rk group-hover:rotate-45">
                      <ArrowUpRight size={16} aria-hidden />
                    </span>
                  </span>

                  {/* Especialidad real, si se puede deducir. */}
                  {creador.especialidad && (
                    <span className="mt-2.5 inline-block rounded-full bg-[rgb(var(--rk-marca-centro)_/_0.15)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--rk-marca-centro)_/_0.9)] backdrop-blur-sm">
                      {creador.especialidad}
                    </span>
                  )}

                  {/*
                    Cifras reales. En táctil siempre visibles; en
                    escritorio aparecen al acercarse, para que la
                    tarjeta en reposo respire.
                  */}
                  <span className="mt-2 block text-[12px] tabular-nums text-[rgb(var(--rk-marca-centro)_/_0.75)] transition-opacity duration-normal ease-rk lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
                    {creador.recursos}{" "}
                    {creador.recursos === 1 ? "recurso" : "recursos"}
                    {creador.seguidores > 0 &&
                      ` · ${creador.seguidores} ${
                        creador.seguidores === 1 ? "seguidor" : "seguidores"
                      }`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

