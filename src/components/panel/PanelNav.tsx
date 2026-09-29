"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import * as Iconos from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ElementoPanel = {
  href: string;
  label: string;
  /** Nombre del icono en lucide-react. */
  icono: string;
  /** Activo solo con la ruta exacta. */
  exacto?: boolean;
  /**
   * Activo con ruta + filtro concreto.
   *
   * Lo necesitan las entradas que son una vista filtrada de
   * otra —«Revisiones» es /admin/recursos con un estado—: sin
   * esto se encenderían las dos a la vez.
   */
  consulta?: { ruta: string; query: string };
};

export type UsuarioPanel = {
  nombre: string;
  rol: string;
  avatarUrl: string | null;
};

/**
 * Navegación de los tableros.
 *
 * Un solo componente para los tres —cliente, creador y
 * administración— porque los tres necesitan exactamente lo
 * mismo: una columna fija en escritorio, un cajón en móvil y
 * un bloque de identidad abajo. Tenerlo tres veces garantiza
 * que acaben pareciéndose cada vez menos.
 *
 * Lo que cambia entre paneles son los enlaces, y esos llegan
 * por props desde cada layout, que es quien sabe cuáles tiene.
 */
function PanelNavInterno({
  elementos,
  usuario,
  titulo,
}: {
  elementos: ElementoPanel[];
  usuario: UsuarioPanel;
  titulo: string;
}) {
  const pathname = usePathname();
  const busqueda = useSearchParams();
  const [abierto, setAbierto] = useState(false);

  /*
    El cajón se cierra al cambiar de ruta. Sin esto quedaría
    abierto sobre la página nueva: se navega y parece que no
    ha pasado nada.
  */
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  /* Con el cajón abierto no se desplaza lo que hay detrás. */
  useEffect(() => {
    if (!abierto) return;

    const previo = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  /* Escape cierra, como cualquier capa superpuesta del sitio. */
  useEffect(() => {
    if (!abierto) return;

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };

    window.addEventListener("keydown", alPulsar);

    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  const cadenaBusqueda = busqueda.toString();

  /* ¿Hay alguna entrada filtrada encendida para esta ruta? */
  const hayFiltradaActiva = elementos.some(
    (e) =>
      e.consulta &&
      pathname === e.consulta.ruta &&
      cadenaBusqueda.includes(e.consulta.query)
  );

  const activo = (el: ElementoPanel) => {
    if (el.consulta) {
      return (
        pathname === el.consulta.ruta &&
        cadenaBusqueda.includes(el.consulta.query)
      );
    }

    /*
      Una entrada sin filtro no se enciende si la vista filtrada
      que cuelga de ella ya está encendida: si no, «Recursos» y
      «Revisiones» aparecerían activas a la vez.
    */
    if (hayFiltradaActiva && pathname === el.href) return false;

    return el.exacto
      ? pathname === el.href
      : pathname === el.href || pathname.startsWith(el.href + "/");
  };

  const lista = (
    <nav className="flex flex-col gap-0.5" aria-label={titulo}>
      {elementos.map((el) => {
        const Icono =
          ((Iconos as unknown as Record<string, LucideIcon>)[el.icono] ??
            Iconos.Circle) as LucideIcon;

        const esActivo = activo(el);

        return (
          <Link
            key={el.href}
            href={el.href}
            aria-current={esActivo ? "page" : undefined}
            className={`rk-press flex items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors duration-fast ease-rk ${
              esActivo
                ? "rk-panel-activo text-ink"
                : "text-ink/65 hover:bg-ink/[0.06] hover:text-ink"
            }`}
          >
            <Icono size={16} aria-hidden className="shrink-0" />
            <span className="truncate">{el.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const identidad = (
    <div className="rk-divider-t mt-4 pt-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="rk-media relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-ink/70">
          {usuario.avatarUrl ? (
            <Image
              src={usuario.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            usuario.nombre.slice(0, 2).toUpperCase()
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">
            {usuario.nombre}
          </span>

          <span className="block truncate text-[11px] text-ink/50">
            {usuario.rol}
          </span>
        </span>
      </div>

      <form action="/api/auth/logout" method="POST" className="mt-2">
        <button
          type="submit"
          className="rk-press flex w-full items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut size={16} aria-hidden className="shrink-0" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ══════════ CABECERA MÓVIL ══════════ */}
      <div className="rk-panel-barra sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir el menú del panel"
          aria-expanded={abierto}
          className="rk-press grid h-11 w-11 shrink-0 place-items-center rounded-rk-sm border border-line/15"
        >
          <Menu size={18} aria-hidden />
        </button>

        <span className="truncate text-sm font-semibold">{titulo}</span>
      </div>

      {/* ══════════ CAJÓN MÓVIL ══════════ */}
      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <div className="rk-panel-cajon rk-fade-up absolute inset-y-0 left-0 flex w-[17rem] max-w-[86vw] flex-col overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="rk-press-sm flex items-center gap-2 rounded-full py-1 pl-0.5 pr-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-rk-sm bg-primary text-[11px] font-bold tracking-tight text-onprimary shadow-rk-sm">
                  R
                </span>

                <span className="text-[15px] font-bold tracking-tight">
                  RCKTDMG
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar el menú"
                className="rk-press grid h-10 w-10 place-items-center rounded-rk-sm"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-5 flex-1">{lista}</div>

            {identidad}
          </div>
        </div>
      )}

      {/* ══════════ COLUMNA DE ESCRITORIO ══════════ */}
      <aside className="rk-panel-lateral sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 flex-col overflow-y-auto p-4 lg:flex">
        <p className="rk-kicker px-1 pb-3">{titulo}</p>

        <div className="flex-1">{lista}</div>

        {identidad}
      </aside>
    </>
  );
}

/**
 * `useSearchParams` obliga a un límite de Suspense: sin él,
 * Next no puede prerenderizar las páginas que usen este
 * componente. El respaldo no pinta nada porque la navegación
 * ya viaja en el HTML del servidor y aparece en cuanto hidrata.
 */
export default function PanelNav(props: {
  elementos: ElementoPanel[];
  usuario: UsuarioPanel;
  titulo: string;
}) {
  return (
    <Suspense fallback={null}>
      <PanelNavInterno {...props} />
    </Suspense>
  );
}
