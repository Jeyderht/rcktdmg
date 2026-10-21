"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Compass, Menu, X, LogOut } from "lucide-react";
import * as Iconos from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Isotipo from "@/components/layout/Isotipo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { IconoBuscar, IconoCampana } from "@/components/iconos";
import { grupoDeRuta, type GrupoMenu } from "@/lib/menu-cuenta";

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
 * Marco de app de los tableros (cliente, creador y administración).
 *
 * Columna lateral con la marca, los grupos del menú por rol y la
 * identidad abajo; barra superior propia con el título de la
 * sección, búsqueda, notificaciones, tema y «Explorar la tienda»;
 * en móvil, la columna es un cajón. El contenido de cada página
 * llega como `children` y no se toca.
 *
 * Los enlaces llegan agrupados desde PanelShell, ya filtrados por
 * el rol (lib/menu-cuenta): con un solo grupo no se rotula.
 */
function PanelNavInterno({
  grupos,
  usuario,
  titulo,
  children,
}: {
  grupos: GrupoMenu[];
  usuario: UsuarioPanel;
  titulo: string;
  children: React.ReactNode;
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

  /* Todas las entradas visibles, para resolver cuál está activa. */
  const elementos: ElementoPanel[] = grupos.flatMap((g) => g.items);
  const grupoActual = grupoDeRuta(pathname);
  const tituloGrupo =
    grupos.find((g) => g.id === grupoActual)?.titulo ?? titulo;

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

  /* Título de la barra: la sección activa; si ninguna lo está
     (p. ej. una ficha interna), el grupo. */
  const tituloSeccion = elementos.find(activo)?.label ?? tituloGrupo;

  const lista = (
    <nav className="rk-app-nav" aria-label={titulo}>
      {grupos.map((grupo) => (
        <div key={grupo.id} className="rk-app-grupo">
          {/* Con un solo grupo (cliente) no hace falta rotular. */}
          {grupos.length > 1 && (
            <p className="rk-app-grupo-titulo">{grupo.titulo}</p>
          )}

          {grupo.items.map((el) => {
            const Icono =
              ((Iconos as unknown as Record<string, LucideIcon>)[el.icono] ??
                Iconos.Circle) as LucideIcon;

            const esActivo = activo(el);

            return (
              <Link
                key={el.href}
                href={el.href}
                aria-current={esActivo ? "page" : undefined}
                className="rk-app-item rk-press"
              >
                <Icono size={18} aria-hidden className="shrink-0" />
                <span className="truncate">{el.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const marca = (
    <Link href="/" aria-label="RcktX, ir al inicio" className="rk-app-marca">
      <span className="rk-app-marca-iso">
        <Isotipo className="h-5 w-5" />
      </span>
      <span>RcktX</span>
    </Link>
  );

  const identidad = (
    <div className="rk-app-identidad">
      <div className="flex items-center gap-2.5 px-1">
        <span className="rk-avatar-anillo relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold">
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

          <span className="block truncate text-[11px] text-ink/60">
            {usuario.rol}
          </span>
        </span>
      </div>

      <form action="/api/auth/logout" method="POST" className="mt-2">
        <button
          type="submit"
          className="rk-btn rk-btn-danger rk-btn-logout"
        >
          <LogOut size={16} aria-hidden className="shrink-0" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <div className="rk-app">
      {/* ══════════ COLUMNA DE ESCRITORIO ══════════ */}
      <aside className="rk-app-lateral" aria-label="Menú del panel">
        {marca}

        <p className="rk-kicker rk-app-rotulo">
          {/* «Mi cuenta» con un solo grupo; «Mi espacio» con varios. */}
          {grupos.length === 1 ? "Mi cuenta" : "Mi espacio"}
        </p>

        <div className="flex-1">{lista}</div>

        {identidad}
      </aside>

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
              {marca}

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

      {/* ══════════ CONTENIDO ══════════ */}
      <div className="rk-app-principal">
        <header className="rk-app-barra">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir el menú del panel"
            aria-expanded={abierto}
            className="rk-app-redondo lg:hidden"
          >
            <Menu size={18} aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <p className="rk-app-barra-grupo">{tituloGrupo}</p>
            {/* No es <h1>: cada página ya lleva el suyo. */}
            <p className="rk-app-barra-titulo">{tituloSeccion}</p>
          </div>

          {/* Búsqueda: lleva a la tienda con lo escrito (?q=). */}
          <form action="/tienda" method="GET" role="search" className="rk-app-buscar">
            <IconoBuscar size={16} aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Buscar en la tienda"
              aria-label="Buscar en la tienda"
              autoComplete="off"
            />
          </form>

          <Link
            href="/tienda"
            aria-label="Buscar en la tienda"
            className="rk-app-redondo rk-app-solo-movil"
          >
            <IconoBuscar size={17} aria-hidden />
          </Link>

          <Link
            href="/notificaciones"
            aria-label="Notificaciones"
            className="rk-app-redondo"
          >
            <IconoCampana size={17} aria-hidden />
          </Link>

          <div className="rk-app-tema">
            <ThemeToggle compacto />
          </div>

          <Link
            href="/tienda"
            aria-label="Explorar la tienda"
            className="rk-btn rk-btn-ink rk-btn-compact rk-app-explorar"
          >
            <Compass size={15} aria-hidden />
            <span>Explorar la tienda</span>
          </Link>
        </header>

        <div className="rk-app-contenido">{children}</div>
      </div>
    </div>
  );
}

/**
 * `useSearchParams` obliga a un límite de Suspense: sin él,
 * Next no puede prerenderizar las páginas que usen este
 * componente. El respaldo pinta el contenido sin el marco, para
 * no dejar la página en blanco mientras hidrata.
 */
export default function PanelNav(props: {
  grupos: GrupoMenu[];
  usuario: UsuarioPanel;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="rk-app-contenido">{props.children}</div>}>
      <PanelNavInterno {...props} />
    </Suspense>
  );
}
