"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ClipboardCheck,
  LayoutDashboard,
  Package,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Section = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Activa solo con la ruta exacta y sin filtros. */
  exact?: boolean;
  /** Activa cuando coincide ruta + query concreta. */
  match?: { path: string; query: string };
};

/**
 * Barra lateral del panel de administración (escritorio).
 *
 * Solo contiene secciones que existen realmente como página
 * o como filtro real de una página. No hay accesos a
 * funciones que todavía no están implementadas.
 */
const SECTIONS: Section[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: Users,
    exact: true,
  },
  {
    href: "/admin/usuarios?rol=CREATOR",
    label: "Creadores",
    icon: UserRound,
    match: { path: "/admin/usuarios", query: "rol=CREATOR" },
  },
  {
    href: "/admin/recursos",
    label: "Recursos",
    icon: Package,
    exact: true,
  },
  {
    href: "/admin/recursos?estado=PENDING_REVIEW",
    label: "Revisiones",
    icon: ClipboardCheck,
    match: { path: "/admin/recursos", query: "estado=PENDING_REVIEW" },
  },
  {
    href: "/admin/retiros",
    label: "Retiros",
    icon: Wallet,
  },
  {
    href: "/admin/usuarios/nuevo",
    label: "Crear creador",
    icon: UserPlus,
  },
];

function AdminSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.toString();

  function isActive(section: Section) {
    if (section.match) {
      return (
        pathname === section.match.path &&
        currentQuery === section.match.query
      );
    }

    if (section.exact) {
      // Una sección "exacta" no se marca activa cuando hay un
      // filtro que pertenece a otra entrada del menú.
      return pathname === section.href && currentQuery === "";
    }

    return (
      pathname === section.href ||
      pathname.startsWith(`${section.href}/`)
    );
  }

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <nav
          aria-label="Secciones de administración"
          className="rk-glass rounded-[1.25rem] p-2"
        >
          <p className="rk-eyebrow px-3 pb-1.5 pt-2">
            Admin Center
          </p>

          <ul className="space-y-0.5">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = isActive(section);

              return (
                <li key={section.label}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={`rk-press flex items-center gap-2.5 rounded-[0.9rem] px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-primary text-onprimary shadow-rk-sm"
                        : "text-ink/60 hover:bg-ink/[0.05] hover:text-ink"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

export default function AdminSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="rk-glass sticky top-24 h-80 rounded-[1.25rem]" />
        </aside>
      }
    >
      <AdminSidebarContent />
    </Suspense>
  );
}
