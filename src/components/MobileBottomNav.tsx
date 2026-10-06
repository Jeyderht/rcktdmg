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
    <nav aria-label="Navegación principal" className="rk-dock">
      <div className="rk-dock-bar">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="rk-dock-item"
            >
              <span className="rk-dock-icon">
                <Icon />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rk-dock-badge">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>

              <span className="rk-dock-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
