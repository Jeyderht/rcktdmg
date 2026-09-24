"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Layers,
  Package,
  Plus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Navegación del Creator Studio.
 *
 * Solo contiene herramientas del propio creador. No incluye
 * ninguna opción de administración: la gestión de usuarios,
 * de otros creadores y de revisiones es exclusiva del ADMIN.
 */
const SECTIONS = [
  {
    href: "/creadores/panel",
    label: "Panel",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/creadores/panel/recursos",
    label: "Mis recursos",
    icon: Package,
  },
  {
    href: "/creadores/panel/nuevo",
    label: "Nuevo recurso",
    icon: Plus,
  },
  {
    href: "/creadores/panel/packs",
    label: "Packs",
    icon: Layers,
  },
  {
    href: "/creadores/panel/seguidores",
    label: "Seguidores",
    icon: Users,
  },
  {
    href: "/creadores/panel/retiros",
    label: "Retiros",
    icon: Wallet,
  },
  {
    href: "/creadores/panel/metodos-pago",
    label: "Métodos de pago",
    icon: CreditCard,
  },
  {
    href: "/creadores/panel/perfil",
    label: "Perfil",
    icon: UserRound,
  },
] as const;

export default function CreatorNav() {
  const pathname = usePathname();

  function isActive(section: (typeof SECTIONS)[number]) {
    if ("exact" in section && section.exact) {
      return pathname === section.href;
    }

    return (
      pathname === section.href ||
      pathname.startsWith(`${section.href}/`)
    );
  }

  return (
    <nav
      aria-label="Secciones del Creator Studio"
      className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-5 lg:px-8"
    >
      <div className="rk-glass flex gap-1 overflow-x-auto rounded-rk-lg p-1.5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = isActive(section);

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={`rk-press flex min-h-[2.75rem] shrink-0 items-center gap-1.5 rounded-rk-sm px-3 py-2 text-[13px] font-medium transition-colors duration-fast ease-rk ${
                active
                  ? "bg-ink/[0.07] font-semibold text-ink"
                  : "text-ink/60 hover:bg-ink/[0.05] hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
