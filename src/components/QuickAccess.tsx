"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
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
  /** Solo en los accesos de cliente, que son los destacados. */
  description?: string;
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
  {
    href: "/mi-cuenta/compras",
    label: "Mis compras",
    icon: Receipt,
    description: "Consulta tus recursos adquiridos",
  },
  {
    href: "/mi-cuenta/descargas",
    label: "Mis descargas",
    icon: Download,
    description: "Descarga lo que ya tienes disponible",
  },
  {
    href: "/mi-cuenta/favoritos",
    label: "Favoritos",
    icon: Heart,
    description: "Recursos que guardaste para después",
  },
  {
    href: "/mi-cuenta/colecciones",
    label: "Colecciones",
    icon: FolderHeart,
    description: "Organiza tus recursos por temas",
  },
  {
    href: "/carrito",
    label: "Carrito",
    icon: ShoppingBag,
    description: "Revisa lo que tienes pendiente de pagar",
  },
  {
    href: "/tienda",
    label: "Explorar recursos",
    icon: Sparkles,
    description: "Descubre lo nuevo del marketplace",
  },
];

/**
 * Rejilla compacta: solo icono y nombre.
 *
 * Se usa en los bloques de administración y de creador, que
 * tienen muchos destinos y se navegan por memoria.
 */
function CompactGrid({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="rk-card rk-card-hover rk-press flex items-center gap-2.5 !rounded-rk-sm p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink/70">
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

/**
 * Tarjetas con descripción y flecha, para los accesos de
 * cliente: son los que se usan a diario.
 */
function FeatureGrid({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="rk-card rk-card-hover rk-press group flex items-center gap-3.5 p-3.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-rk-sm bg-accent/10 text-accent transition-transform duration-normal ease-rk group-hover:scale-105">
              <Icon size={18} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {link.label}
              </span>

              {link.description && (
                <span className="mt-0.5 block truncate text-xs text-ink/60">
                  {link.description}
                </span>
              )}
            </span>

            <ArrowRight
              size={16}
              aria-hidden
              className="shrink-0 text-ink/45 transition-all duration-normal ease-rk group-hover:translate-x-0.5 group-hover:text-accent"
            />
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
    <section className="rk-fade-up rk-enter-3 mt-10 sm:mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="rk-eyebrow">Accesos rápidos</p>

          <h2 className="rk-title mt-2 text-2xl">Todo tu espacio</h2>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rk-press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>

      <div className="rk-divider mt-4" />

      {/* ADMINISTRACIÓN */}
      {isAdmin && (
        <div className="mt-5">
          <p className="rk-eyebrow">Administración</p>

          <div className="mt-3">
            <CompactGrid links={ADMIN_LINKS} />
          </div>
        </div>
      )}

      {/* CREATOR STUDIO */}
      {isCreator && (
        <div className="mt-5">
          <p className="rk-eyebrow">Creator Studio</p>

          <div className="mt-3">
            <CompactGrid links={CREATOR_LINKS} />
          </div>

          {/* PERFIL PÚBLICO */}
          <div className="mt-2">
            {publicProfileUrl ? (
              <Link
                href={publicProfileUrl}
                className="rk-card rk-card-hover rk-press group flex items-center gap-2.5 !rounded-rk-sm p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rk-sm bg-accent/10 text-accent">
                  <UserRound size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    Ver perfil público
                  </span>

                  <span className="block truncate text-[11px] text-ink/60">
                    @{user.username}
                  </span>
                </span>

                <ArrowRight
                  size={15}
                  aria-hidden
                  className="shrink-0 text-ink/45 transition-all duration-normal ease-rk group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </Link>
            ) : (
              <div className="rk-card flex flex-wrap items-center justify-between gap-3 !rounded-rk-sm p-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-rk-sm bg-warning/12 text-warning">
                    <AlertCircle size={16} />
                  </span>

                  <span className="min-w-0 text-[13px] text-ink/60">
                    Configura tu username para publicar tu perfil
                  </span>
                </span>

                <Link
                  href="/creadores/panel/perfil"
                  className="rk-btn rk-btn-primary !min-h-0 !px-4 !py-2 !text-xs"
                >
                  Configurar perfil
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUENTA */}
      <div className="mt-5">
        {(isAdmin || isCreator) && (
          <p className="rk-eyebrow">Mi cuenta</p>
        )}

        <div className={isAdmin || isCreator ? "mt-3" : ""}>
          <FeatureGrid links={CLIENT_LINKS} />
        </div>
      </div>
    </section>
  );
}
