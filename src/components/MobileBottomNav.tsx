"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, ShoppingBag, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MobileBottomNavProps = {
  cartCount: number;
  isLoggedIn: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/**
 * Dock inferior flotante para móvil.
 *
 * Es una píldora de vidrio separada del borde, con indicador
 * de pestaña activa y respuesta táctil, para que navegar se
 * sienta como una aplicación y no como una web.
 *
 * El espacio que reserva bajo el contenido lo aporta `body`
 * en globals.css (`--rk-dock-h`), así funciona en todas las
 * páginas sin tocar cada una.
 */
export default function MobileBottomNav({
  cartCount,
  isLoggedIn,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: "/",
      label: "Inicio",
      icon: Home,
    },
    {
      href: "/tienda",
      label: "Explorar",
      icon: Compass,
    },
    {
      href: "/mi-cuenta/favoritos",
      label: "Guardados",
      icon: Heart,
    },
    {
      href: "/carrito",
      label: "Carrito",
      icon: ShoppingBag,
      badge: cartCount,
    },
    {
      href: isLoggedIn ? "/mi-cuenta" : "/login",
      label: isLoggedIn ? "Cuenta" : "Entrar",
      icon: UserRound,
    },
  ];

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:hidden"
    >
      <div className="rk-glass rk-float mx-auto flex max-w-md items-stretch gap-0.5 rounded-[1.5rem] p-1.5">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rk-press relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[1.1rem] py-2 ${
                active
                  ? "bg-surface/90 text-ink shadow-rk-sm"
                  : "text-ink/45"
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-onprimary ring-2 ring-surface/90">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>

              <span
                className={`text-[10px] leading-none tracking-tight ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
