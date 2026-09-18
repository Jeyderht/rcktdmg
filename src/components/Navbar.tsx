"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  Heart,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

import MobileBottomNav from "@/components/MobileBottomNav";
import { useCartCount } from "@/components/useCartCount";
import { useSessionUser } from "@/components/useSessionUser";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationsBell from "@/components/NotificationsBell";
import AccountMenu from "@/components/AccountMenu";

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

  // Mantiene el campo sincronizado si la URL cambia.
  useEffect(() => {
    setTerm(currentQuery);
  }, [currentQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clean = term.trim();

    router.push(
      clean ? `/tienda?q=${encodeURIComponent(clean)}` : "/tienda"
    );

    onSubmitted?.();
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={className}>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
        />

        <input
          type="search"
          name="q"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar recursos..."
          aria-label="Buscar recursos"
          autoComplete="off"
          className="h-11 w-full rounded-full border border-ink/[0.07] bg-surface/60 pl-11 pr-24 text-sm outline-none backdrop-blur-xl transition duration-300 ease-rk placeholder:text-ink/35 focus:border-accent/40 focus:bg-surface focus:shadow-[0_0_0_4px_var(--rk-accent-soft)]"
        />

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Limpiar búsqueda"
              className="rk-press rounded-full p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="submit"
            className="rk-press rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-onprimary shadow-rk-sm hover:opacity-90"
          >
            Buscar
          </button>
        </div>
      </div>
    </form>
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
      className={`rk-press relative flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.06] hover:text-ink ${className}`}
    >
      {children}

      {badge !== undefined && badge > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-onprimary ring-2 ring-surface/80">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading } = useSessionUser();
  const cartCount = useCartCount();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    { href: "/categorias", label: "Categorías" },
    { href: "/creadores", label: "Creadores" },
    { href: "/planes", label: "Planes" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className={`mx-auto w-full max-w-7xl rounded-[1.75rem] transition-all duration-500 ease-rk ${
            scrolled
              ? "rk-glass shadow-rk-lg"
              : "border border-line/10 bg-surface/45 shadow-rk-sm backdrop-blur-xl"
          }`}
        >
          <div className="flex h-[3.75rem] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 lg:px-5">

            {/* LOGO */}
            <Link
              href="/"
              className="rk-press-sm flex shrink-0 items-center gap-2 rounded-full pl-1 pr-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-primary text-[11px] font-bold tracking-tight text-onprimary shadow-rk-sm">
                R
              </span>

              <span className="text-[15px] font-bold tracking-tight sm:text-base">
                RCKTDMG
              </span>
            </Link>

            {/* NAVEGACIÓN PRINCIPAL */}
            <nav className="hidden items-center gap-0.5 pl-2 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rk-press-sm rounded-full px-3.5 py-2 text-sm transition-colors duration-200 ${
                    isActive(link.href)
                      ? "bg-ink/[0.07] font-medium text-ink"
                      : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* BUSCADOR (DESKTOP) */}
            <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
              <SearchField className="w-full max-w-xs" />
            </div>

            {/* ACCIONES */}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-2">

              {/* BUSCADOR (MÓVIL) */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label="Buscar"
                aria-expanded={mobileSearchOpen}
                className="rk-press flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.06] hover:text-ink md:hidden"
              >
                {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
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
                <ShoppingBag size={18} />
              </IconAction>

              {/* TEMA: claro / oscuro / sistema */}
              <div className="ml-1 hidden md:block">
                <ThemeToggle />
              </div>

              {/*
                ACCESOS RÁPIDOS POR ROL
                ADMIN:   [Mi panel] [Notificaciones] [Cuenta]
                CREATOR: [Creator Studio] [Notificaciones] [Cuenta]
                CLIENT:  [Notificaciones] [Cuenta]
              */}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rk-btn rk-btn-glass ml-1 hidden !px-3.5 !py-2 !text-[13px] lg:inline-flex"
                >
                  <Shield size={14} />
                  Mi panel
                </Link>
              )}

              {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
                <Link
                  href="/creadores/panel"
                  className="rk-btn rk-btn-glass ml-1 hidden !px-3.5 !py-2 !text-[13px] lg:inline-flex"
                >
                  <Sparkles size={14} />
                  Creator Studio
                </Link>
              )}

              {loading ? (
                <div
                  aria-hidden
                  className="ml-1 h-10 w-10 animate-pulse rounded-full bg-ink/[0.06]"
                />
              ) : user ? (
                <>
                  {/* En móvil y tablet el rol se resuelve por icono. */}
                  {user.role === "ADMIN" && (
                    <IconAction
                      href="/admin"
                      label="Mi panel"
                      className="flex lg:hidden"
                    >
                      <Shield size={18} />
                    </IconAction>
                  )}

                  {(user.role === "CREATOR" ||
                    user.role === "ADMIN") && (
                    <IconAction
                      href="/creadores/panel"
                      label="Creator Studio"
                      className="flex lg:hidden"
                    >
                      <Sparkles size={18} />
                    </IconAction>
                  )}

                  <NotificationsBell />

                  {/* El menú de cuenta abre una tarjeta, no navega. */}
                  <AccountMenu user={user} loading={loading} />
                </>
              ) : (
                <>
                  <Link
                    href="/registro"
                    className="rk-btn rk-btn-primary hidden !px-4 !py-2.5 sm:inline-flex"
                  >
                    Crear cuenta
                  </Link>

                  <AccountMenu user={null} loading={false} />
                </>
              )}
            </div>
          </div>

          {/* BUSCADOR DESPLEGABLE EN MÓVIL */}
          {mobileSearchOpen && (
            <div className="animate-scale-in border-t border-ink/[0.06] px-3 py-3 md:hidden">
              <SearchField
                autoFocus
                onSubmitted={() => setMobileSearchOpen(false)}
              />
            </div>
          )}
        </div>

        {/* NAVEGACIÓN SECUNDARIA EN TABLET */}
        <nav className="mx-auto mt-2 hidden max-w-7xl items-center gap-1 overflow-x-auto px-1 sm:flex lg:hidden">
          <Link
            href="/"
            className={`rk-press-sm shrink-0 rounded-full px-3.5 py-2 text-sm backdrop-blur-xl transition-colors ${
              isActive("/")
                ? "bg-surface/75 font-medium text-ink shadow-rk-sm"
                : "text-ink/55 hover:text-ink"
            }`}
          >
            Inicio
          </Link>

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rk-press-sm shrink-0 rounded-full px-3.5 py-2 text-sm backdrop-blur-xl transition-colors ${
                isActive(link.href)
                  ? "bg-surface/75 font-medium text-ink shadow-rk-sm"
                  : "text-ink/55 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
            <Link
              href="/creadores/panel"
              className={`rk-press-sm shrink-0 rounded-full px-3.5 py-2 text-sm backdrop-blur-xl transition-colors ${
                isActive("/creadores/panel")
                  ? "bg-surface/75 font-medium text-ink shadow-rk-sm"
                  : "text-ink/55 hover:text-ink"
              }`}
            >
              Studio
            </Link>
          )}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`rk-press-sm shrink-0 rounded-full px-3.5 py-2 text-sm backdrop-blur-xl transition-colors ${
                isActive("/admin")
                  ? "bg-surface/75 font-medium text-ink shadow-rk-sm"
                  : "text-ink/55 hover:text-ink"
              }`}
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
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto w-full max-w-7xl rounded-[1.75rem] border border-line/10 bg-surface/45 shadow-rk-sm backdrop-blur-xl">
            <div className="flex h-[3.75rem] items-center gap-2 px-3 py-2.5 sm:px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-primary text-[11px] font-bold text-onprimary">
                R
              </span>

              <span className="text-[15px] font-bold tracking-tight sm:text-base">
                RCKTDMG
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
