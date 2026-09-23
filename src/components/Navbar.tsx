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
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/60"
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
          className="h-12 w-full rounded-full border border-line/10 bg-surface/60 pl-11 pr-24 text-sm outline-none backdrop-blur-xl transition duration-300 ease-rk placeholder:text-ink/60 focus:border-ink/40 focus:bg-surface"
        />

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Limpiar búsqueda"
              className="rk-press rounded-full p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="submit"
            className="rk-btn rk-btn-ink rk-btn-compact !rounded-full !px-4 !py-2 !text-xs"
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
      className={`rk-press relative flex h-11 w-11 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.06] hover:text-ink ${className}`}
    >
      {children}

      {badge !== undefined && badge > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background ring-2 ring-surface/80">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavbarContent() {
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
          className={`mx-auto w-full max-w-7xl rounded-rk-xl transition-all duration-500 ease-rk ${
            scrolled
              ? "rk-glass shadow-rk-lg"
              : "border border-line/10 bg-surface/45 shadow-rk-sm backdrop-blur-xl"
          }`}
        >
          <div className="flex h-[3.75rem] items-center gap-1 px-2 py-2.5 sm:gap-3 sm:px-4 lg:px-5">

            {/* LOGO */}
            <Link
              href="/"
              className="rk-press-sm flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1 pr-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-rk-sm bg-primary text-[11px] font-bold tracking-tight text-onprimary shadow-rk-sm">
                R
              </span>

              <span className="text-[15px] font-bold tracking-tight sm:text-base">
                RCKTDMG
              </span>
            </Link>

            {/* NAVEGACIÓN PRINCIPAL */}
            <nav className="hidden items-center gap-0.5 pl-2 xl:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rk-press-sm rounded-full px-3.5 py-2 text-sm transition-colors duration-200 ${
                    isActive(link.href)
                      ? "bg-ink/[0.07] font-semibold text-ink"
                      : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* BUSCADOR (DESKTOP) */}
            <div className="ml-auto hidden min-w-0 flex-1 justify-end xl:flex">
              <SearchField className="w-full max-w-sm" />
            </div>

            {/* ACCIONES */}
            <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-0.5 xl:ml-2">

              {/* BUSCADOR (MÓVIL) */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label="Buscar"
                aria-expanded={mobileSearchOpen}
                className="rk-press flex h-11 w-11 items-center justify-center rounded-full text-ink/70 hover:bg-ink/[0.06] hover:text-ink xl:hidden"
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
                  className="rk-btn rk-btn-line ml-1 hidden !px-3.5 !text-[13px] xl:inline-flex"
                >
                  <Shield size={14} />
                  Mi panel
                </Link>
              )}

              {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
                <Link
                  href="/creadores/panel"
                  className="rk-btn rk-btn-line ml-1 hidden !px-3.5 !text-[13px] xl:inline-flex"
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
                      className="flex xl:hidden"
                    >
                      <Shield size={18} />
                    </IconAction>
                  )}

                  {(user.role === "CREATOR" ||
                    user.role === "ADMIN") && (
                    <IconAction
                      href="/creadores/panel"
                      label="Creator Studio"
                      className="flex xl:hidden"
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
          {mobileSearchOpen && (
            <div className="animate-scale-in border-t border-line/10 px-3 py-3 xl:hidden">
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
            className={`rk-press-sm shrink-0 rounded-full px-3.5 py-2 text-sm backdrop-blur-xl transition-colors ${
              isActive("/")
                ? "bg-ink/[0.07] font-semibold text-ink"
                : "text-ink/60 hover:text-ink"
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
                  ? "bg-ink/[0.07] font-semibold text-ink"
                  : "text-ink/60 hover:text-ink"
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
                  ? "bg-ink/[0.07] font-semibold text-ink"
                  : "text-ink/60 hover:text-ink"
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
                  ? "bg-ink/[0.07] font-semibold text-ink"
                  : "text-ink/60 hover:text-ink"
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
          <div className="mx-auto w-full max-w-7xl rounded-rk-xl border border-line/10 bg-surface/45 shadow-rk-sm backdrop-blur-xl">
            <div className="flex h-[3.75rem] items-center gap-2 px-3 py-2.5 sm:px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-rk-sm bg-primary text-[11px] font-bold text-onprimary">
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
