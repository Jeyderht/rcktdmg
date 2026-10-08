"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useId, useRef, useState } from "react";
import {
  Heart,
  X,
} from "lucide-react";

import MobileBottomNav from "@/components/MobileBottomNav";
import { useCartCount } from "@/components/useCartCount";
import { ID_BUSCADOR_TIENDA } from "@/lib/busqueda-ui";
import { useSessionUser } from "@/components/useSessionUser";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationsBell from "@/components/NotificationsBell";
import AccountMenu from "@/components/AccountMenu";
import {
  ListaSugerencias,
  useSugerencias,
  useTecladoSugerencias,
} from "@/components/sugerencias";
import { IconoBolsa, IconoBuscar } from "@/components/iconos";
import Isotipo from "@/components/Isotipo";

function SearchField({
  className,
  autoFocus,
  onSubmitted,
}: {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery =
    pathname === "/tienda" ? searchParams.get("q") || "" : "";

  const [term, setTerm] = useState(currentQuery);
  const [abierto, setAbierto] = useState(false);

  const listaId = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  // Mantiene el campo sincronizado si la URL cambia.
  useEffect(() => {
    setTerm(currentQuery);
  }, [currentQuery]);

  const { opciones, hayTexto } = useSugerencias(term, abierto);

  const { activo, setActivo, alTeclear } = useTecladoSugerencias(
    opciones,
    () => setAbierto(false),
    (href) => {
      router.push(href);
      onSubmitted?.();
    }
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clean = term.trim();

    setAbierto(false);

    router.push(
      clean ? `/tienda?q=${encodeURIComponent(clean)}` : "/tienda"
    );

    onSubmitted?.();
  }

  return (
    <div ref={contenedor} className={`relative ${className ?? ""}`}>
      <form onSubmit={handleSubmit} role="search">
        {/*
          Esta caja ES la superficie, igual que en la tienda. El
          campo que iba aquí se pintaba a sí mismo: al enfocarlo
          cambiaba a fondo sólido y borde de tinta, y el vidrio
          desaparecía. Ahora el borde y el fondo viven fuera.
        */}
        <div className="rk-buscador rk-buscador-compacto">
          <IconoBuscar
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45"
          />

          <input
            type="search"
            name="q"
            value={term}
            autoFocus={autoFocus}
            onChange={(event) => {
              setTerm(event.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={alTeclear}
            placeholder="Buscar recursos..."
            aria-label="Buscar recursos"
            role="combobox"
            aria-expanded={hayLista}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-activedescendant={
              activo >= 0 ? `${listaId}-${activo}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="rk-buscador-campo"
          />

          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                aria-label="Limpiar búsqueda"
                className="rk-press rk-touch rounded-full p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink"
              >
                <X size={14} />
              </button>
            )}

            {/*
              El botón conserva su tamaño y su sitio dentro del
              campo; el área táctil crece a 44 px de alto con un
              pseudo-elemento, que no ocupa espacio y no altera
              la altura de la barra.
            */}
            <button
              type="submit"
              className="rk-buscador-accion rk-hit-44-y"
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      {hayLista && (
        <ListaSugerencias
          id={listaId}
          opciones={opciones}
          activo={activo}
          hayTexto={hayTexto}
          onElegir={() => {
            setAbierto(false);
            onSubmitted?.();
          }}
          onResaltar={setActivo}
        />
      )}
    </div>
  );
}

/** Botón circular de vidrio para las acciones del header. */
function IconAction({
  href,
  label,
  badge,
  children,
  className = "",
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`rk-topbar-btn ${className}`}
    >
      {children}

      {badge !== undefined && badge > 0 && (
        <span className="rk-dock-badge">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Píldora de rol: «Admin · Studio».
 * Fuera de los paneles (inicio, tienda…) queda apagada: el mismo
 * vidrio claro que los botones de buscar y avisos, con texto negro.
 * Dentro de un panel se enciende como un interruptor: la píldora
 * pasa a negro y la sección en la que estás va en blanco, como la
 * perilla. Un creador solo ve «Studio».
 */
function RolSwitch({
  esAdmin,
  enAdmin,
  enStudio,
}: {
  esAdmin: boolean;
  enAdmin: boolean;
  enStudio: boolean;
}) {
  const adminElegido = esAdmin && enAdmin;
  const encendido = enStudio || adminElegido;

  return (
    <nav
      aria-label="Paneles"
      className="rk-rol"
      data-encendido={encendido || undefined}
    >
      {esAdmin && (
        <Link
          href="/admin"
          aria-current={adminElegido ? "page" : undefined}
          data-elegido={adminElegido || undefined}
          className="rk-rol-opcion"
        >
          Admin
        </Link>
      )}
      <Link
        href="/creadores/panel"
        aria-current={enStudio ? "page" : undefined}
        data-elegido={enStudio || undefined}
        className="rk-rol-opcion"
      >
        Studio
      </Link>
    </nav>
  );
}

function NavbarContent() {
  const pathname = usePathname();

  const { user, loading } = useSessionUser();
  const cartCount = useCartCount();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /*
    EN LA TIENDA NO HAY DOS BUSCADORES.

    /tienda tiene su propia caja de búsqueda, la principal, y
    es la única que conserva los filtros ya aplicados al buscar
    de nuevo. Repetir aquí un segundo campo dejaba dos cajas
    idénticas en pantalla, y la del header tiraba los filtros.

    Así que en esa ruta la cabecera deja de ser un campo y pasa
    a ser un acceso: lleva el foco a la caja principal. En el
    resto del sitio el buscador del header funciona igual que
    siempre.
  */
  const enLaTienda = pathname === "/tienda";

  function irAlBuscadorDeLaTienda() {
    const campo = document.getElementById(ID_BUSCADOR_TIENDA);

    if (!campo) return;

    campo.scrollIntoView({ behavior: "smooth", block: "center" });

    // El foco después del desplazamiento, para no cortarlo.
    window.setTimeout(() => campo.focus(), 320);
  }

  // Cierra el buscador móvil al cambiar de página.
  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  // El header gana presencia al hacer scroll.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const links = [
    { href: "/tienda", label: "Recursos" },
    { href: "/packs", label: "Packs" },
    { href: "/categorias", label: "Categorías" },
    { href: "/creadores", label: "Creadores" },
    { href: "/planes", label: "Planes" },
  ];

  return (
    <>
      {/*
        Barra sin caja: logo, buscador y botones flotan sueltos,
        cada uno con su propio vidrio (rk-topbar en globals.css).
      */}
      <header className="rk-topbar sm:px-4 sm:pt-4" data-scrolled={scrolled}>
        <div className="mx-auto w-full max-w-7xl">
          <div className="rk-topbar-bar">

            {/* LOGO */}
            <Link
              href="/"
              /*
                El isotipo es decorativo, así que sin esto el
                enlace se quedaría sin nombre: ya no hay texto
                dentro que se lo dé.
              */
              aria-label="RcktX"
              /*
                Relleno simétrico. El `pr-2` despegaba del borde
                al logotipo de texto; sin él dejaba el isotipo
                descentrado dentro del área pulsable.
              */
              className="rk-topbar-btn"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <Isotipo className="h-[23px] w-[23px]" />
              </span>
            </Link>

            {/* NAVEGACIÓN PRINCIPAL */}
            <nav className="rk-topbar-nav">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="rk-topbar-link"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* BUSCADOR (DESKTOP) */}
            <div className="ml-auto hidden min-w-0 flex-1 justify-end xl:flex">
              {enLaTienda ? (
                <button
                  type="button"
                  onClick={irAlBuscadorDeLaTienda}
                  className="rk-press inline-flex h-11 items-center gap-2 rounded-full border border-line/10 bg-surface/60 px-4 text-sm text-ink/60 backdrop-blur-xl transition-colors hover:border-ink/30 hover:text-ink"
                >
                  <IconoBuscar size={15} aria-hidden />
                  Buscar en la tienda
                </button>
              ) : (
                <SearchField className="w-full max-w-sm" />
              )}
            </div>

            {/* ACCIONES */}
            <div className="rk-topbar-actions ml-auto flex shrink-0 items-center gap-2 xl:ml-2">

              {/* BUSCADOR (MÓVIL) */}
              <button
                type="button"
                onClick={
                  enLaTienda
                    ? irAlBuscadorDeLaTienda
                    : () => setMobileSearchOpen((open) => !open)
                }
                aria-label="Buscar"
                aria-expanded={enLaTienda ? undefined : mobileSearchOpen}
                className="rk-topbar-btn xl:hidden"
              >
                {mobileSearchOpen && !enLaTienda ? (
                  <X size={18} />
                ) : (
                  <IconoBuscar size={18} />
                )}
              </button>

              <IconAction
                href="/mi-cuenta/favoritos"
                label="Favoritos"
                className="hidden sm:flex"
              >
                <Heart size={18} />
              </IconAction>

              <IconAction
                href="/carrito"
                label="Carrito"
                badge={cartCount}
                className="hidden sm:flex"
              >
                <IconoBolsa size={18} />
              </IconAction>

              {/* TEMA: claro / oscuro / sistema */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/*
                ACCESOS RÁPIDOS POR ROL
                ADMIN:   [Mi panel] [Notificaciones] [Cuenta]
                CREATOR: [Creator Studio] [Notificaciones] [Cuenta]
                CLIENT:  [Notificaciones] [Cuenta]
              */}
              {loading ? (
                <div
                  aria-hidden
                  className="h-10 w-10 animate-pulse rounded-full bg-ink/[0.06]"
                />
              ) : user ? (
                <>
                  {/*
                    Interruptor de rol: Admin / Studio en una sola
                    píldora, el activo en blanco. Mismo en todos los
                    tamaños.
                  */}
                  {(user.role === "CREATOR" ||
                    user.role === "ADMIN") && (
                    <RolSwitch
                      esAdmin={user.role === "ADMIN"}
                      enAdmin={isActive("/admin")}
                      enStudio={isActive("/creadores")}
                    />
                  )}

                  <NotificationsBell />

                  {/* El menú de cuenta abre una tarjeta, no navega. */}
                  <AccountMenu user={user} loading={loading} />
                </>
              ) : (
                <>
                  <Link
                    href="/registro"
                    className="rk-btn rk-btn-ink hidden !px-4 sm:inline-flex"
                  >
                    Crear cuenta
                  </Link>

                  <AccountMenu user={null} loading={false} />
                </>
              )}
            </div>
          </div>

          {/* BUSCADOR DESPLEGABLE EN MÓVIL */}
          {mobileSearchOpen && !enLaTienda && (
            <div className="animate-scale-in mt-2 xl:hidden">
              <SearchField
                autoFocus
                onSubmitted={() => setMobileSearchOpen(false)}
              />
            </div>
          )}
        </div>

        {/* NAVEGACIÓN SECUNDARIA EN TABLET */}
        <nav className="mx-auto mt-2 hidden max-w-7xl items-center gap-1 overflow-x-auto px-1 sm:flex xl:hidden">
          <Link
            href="/"
            aria-current={isActive("/") ? "page" : undefined}
            className="rk-topbar-link shrink-0"
          >
            Inicio
          </Link>

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
            className="rk-topbar-link shrink-0"
            >
              {link.label}
            </Link>
          ))}

          {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
            <Link
              href="/creadores/panel"
              aria-current={isActive("/creadores/panel") ? "page" : undefined}
            className="rk-topbar-link shrink-0"
            >
              Studio
            </Link>
          )}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              aria-current={isActive("/admin") ? "page" : undefined}
            className="rk-topbar-link shrink-0"
            >
              Admin
            </Link>
          )}

          {/* TEMA en tablet */}
          <div className="ml-auto shrink-0 pl-2 md:hidden">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <MobileBottomNav cartCount={cartCount} isLoggedIn={Boolean(user)} />
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="rk-topbar sm:px-4 sm:pt-4">
          <div className="mx-auto w-full max-w-7xl">
            <div className="rk-topbar-bar">
              <span className="rk-topbar-btn">
                <Isotipo className="h-[23px] w-[23px]" />
              </span>
            </div>
          </div>
        </header>
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
