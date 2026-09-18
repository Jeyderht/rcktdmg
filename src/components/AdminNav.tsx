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

/**
 * Navegación del área de administración.
 *
 * Solo incluye secciones que existen realmente como página
 * o como filtro real de una página. No se muestran accesos
 * a funciones que todavía no están implementadas.
 */
const SECTIONS = [
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
    match: {
      path: "/admin/recursos",
      query: "estado=PENDING_REVIEW",
    },
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
] as const;

function AdminNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.toString();

  function isActive(section: (typeof SECTIONS)[number]) {
    if ("match" in section && section.match) {
      return (
        pathname === section.match.path &&
        currentQuery === section.match.query
      );
    }

    if ("exact" in section && section.exact) {
      // Una sección "exacta" no se marca activa cuando hay
      // un filtro que pertenece a otra entrada del menú.
      return pathname === section.href && currentQuery === "";
    }

    return (
      pathname === section.href ||
      pathname.startsWith(`${section.href}/`)
    );
  }

  return (
    <nav
      aria-label="Secciones de administración"
      className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-5 lg:px-8"
    >
      <div className="rk-glass flex gap-1 overflow-x-auto rounded-[1.25rem] p-1.5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = isActive(section);

          return (
            <Link
              key={section.label}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={`rk-press flex shrink-0 items-center gap-1.5 rounded-[0.9rem] px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-primary text-onprimary shadow-rk-sm"
                  : "text-ink/55 hover:bg-ink/[0.05] hover:text-ink"
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

export default function AdminNav() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-5 lg:px-8">
          <div className="rk-glass h-[3.25rem] rounded-[1.25rem]" />
        </div>
      }
    >
      <AdminNavContent />
    </Suspense>
  );
}
