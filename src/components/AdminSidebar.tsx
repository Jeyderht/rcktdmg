"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Layers,
  Package,
  UserPlus,
  UserRound,
  Star,
  Tag,
  Users,
  Wallet,
  FolderTree,
  Inbox,
  Library,
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
    href: "/admin/creadores",
    label: "Solicitudes",
    icon: Inbox,
  },
  {
    href: "/admin/requisitos",
    label: "Requisitos",
    icon: BookOpen,
  },
  {
    href: "/admin/packs",
    label: "Packs",
    icon: Layers,
  },
  {
    href: "/admin/colecciones",
    label: "Colecciones",
    icon: Library,
  },
  {
    href: "/admin/categorias",
    label: "Categorías",
    icon: FolderTree,
  },
  {
    href: "/admin/resenas",
    label: "Valoraciones",
    icon: Star,
  },
  {
    href: "/admin/tags",
    label: "Etiquetas",
    icon: Tag,
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
          className="rk-glass rounded-rk-lg p-2"
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
                    className={`rk-press flex min-h-[2.75rem] items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors duration-fast ease-rk ${
                      active
                        ? "bg-ink/[0.07] font-semibold text-ink"
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
          <div className="rk-glass sticky top-24 h-80 rounded-rk-lg" />
        </aside>
      }
    >
      <AdminSidebarContent />
    </Suspense>
  );
}
