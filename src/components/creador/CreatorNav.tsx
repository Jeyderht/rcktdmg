"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Layers,
  Package,
  Plus,
  Users,
  Wallet,
  Library,
} from "lucide-react";
import { IconoUsuario } from "@/components/iconos";

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
    href: "/creadores/panel/colecciones",
    label: "Colecciones",
    icon: Library,
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
    icon: IconoUsuario,
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
      <div className="rk-tabs rk-tabs-track">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = isActive(section);

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className="rk-tab"
            >
              <Icon aria-hidden />
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
