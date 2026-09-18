"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  Download,
  FolderHeart,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SessionUser } from "@/components/useSessionUser";

type QuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Accesos rápidos de /mi-cuenta, según el rol.
 *
 * Todos los destinos son rutas que existen realmente en
 * src/app. No se muestran accesos a funciones inexistentes:
 * por ejemplo "Ganancias" apunta al panel del creador, que
 * es donde se muestran, porque no hay una página propia.
 */
const ADMIN_LINKS: QuickLink[] = [
  { href: "/admin", label: "Panel Admin", icon: Shield },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  {
    href: "/admin/usuarios?rol=CREATOR",
    label: "Creadores",
    icon: UserRound,
  },
  { href: "/admin/recursos", label: "Recursos", icon: Package },
  {
    href: "/admin/recursos?estado=PENDING_REVIEW",
    label: "Revisiones",
    icon: ClipboardCheck,
  },
  { href: "/admin/retiros", label: "Retiros", icon: Wallet },
];

const CREATOR_LINKS: QuickLink[] = [
  {
    href: "/creadores/panel",
    label: "Creator Studio",
    icon: LayoutDashboard,
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
    // Ganancias y estadísticas se muestran en el panel:
    // no existe una página independiente.
    href: "/creadores/panel",
    label: "Ganancias",
    icon: BarChart3,
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
    label: "Perfil de creador",
    icon: Settings,
  },
];

const CLIENT_LINKS: QuickLink[] = [
  { href: "/mi-cuenta/compras", label: "Mis compras", icon: Receipt },
  {
    href: "/mi-cuenta/descargas",
    label: "Mis descargas",
    icon: Download,
  },
  { href: "/mi-cuenta/favoritos", label: "Favoritos", icon: Heart },
  {
    href: "/mi-cuenta/colecciones",
    label: "Colecciones",
    icon: FolderHeart,
  },
  { href: "/carrito", label: "Carrito", icon: ShoppingBag },
  { href: "/tienda", label: "Explorar", icon: Sparkles },
];

function LinkGrid({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="rk-card rk-card-hover rk-press flex items-center gap-2.5 !rounded-[1.1rem] p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-ink/[0.06] text-ink/70">
              <Icon size={16} />
            </span>

            <span className="min-w-0 truncate text-[13px] font-medium">
              {link.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function QuickAccess({
  user,
}: {
  user: SessionUser | null;
}) {
  const router = useRouter();

  if (!user) {
    return null;
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  const isAdmin = user.role === "ADMIN";
  const isCreator = user.role === "CREATOR" || isAdmin;

  // El perfil público solo existe si hay username y el
  // creador está aprobado.
  const publicProfileUrl =
    isCreator && user.username && user.creatorStatus === "APPROVED"
      ? `/creadores/${user.username}`
      : null;

  return (
    <section className="rk-enter rk-enter-3 mt-3 sm:mt-4">
      <div className="rk-glass rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Accesos rápidos</h2>

          <button
            type="button"
            onClick={handleLogout}
            className="rk-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink/55 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>

        {/* ADMINISTRACIÓN */}
        {isAdmin && (
          <div className="mt-4">
            <p className="rk-eyebrow !tracking-[0.16em]">
              Administración
            </p>

            <div className="mt-2.5">
              <LinkGrid links={ADMIN_LINKS} />
            </div>
          </div>
        )}

        {/* CREATOR STUDIO */}
        {isCreator && (
          <div className="mt-4">
            <p className="rk-eyebrow !tracking-[0.16em]">
              Creator Studio
            </p>

            <div className="mt-2.5">
              <LinkGrid links={CREATOR_LINKS} />
            </div>

            {/* PERFIL PÚBLICO */}
            <div className="mt-2.5">
              {publicProfileUrl ? (
                <Link
                  href={publicProfileUrl}
                  className="rk-card rk-card-hover rk-press flex items-center gap-2.5 !rounded-[1.1rem] p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary text-onprimary">
                    <UserRound size={16} />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">
                      Ver perfil público
                    </span>

                    <span className="block truncate text-[11px] text-ink/45">
                      @{user.username}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="rk-card flex flex-wrap items-center justify-between gap-3 !rounded-[1.1rem] p-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-warning/12 text-warning">
                      <AlertCircle size={16} />
                    </span>

                    <span className="min-w-0 text-[13px] text-ink/60">
                      Configura tu username para publicar tu perfil
                    </span>
                  </span>

                  <Link
                    href="/creadores/panel/perfil"
                    className="rk-btn rk-btn-primary !px-4 !py-2 !text-xs"
                  >
                    Configurar perfil
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUENTA */}
        <div className="mt-4">
          <p className="rk-eyebrow !tracking-[0.16em]">Mi cuenta</p>

          <div className="mt-2.5">
            <LinkGrid links={CLIENT_LINKS} />
          </div>
        </div>
      </div>
    </section>
  );
}
