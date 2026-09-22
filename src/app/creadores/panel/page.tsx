"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Plus,
  Settings,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import { useSessionUser } from "@/components/useSessionUser";

type DashboardData = {
  creator: {
    name: string;
    email: string;
  };

  stats: {
    totalResources: number;
    publishedResources: number;
    pendingResources: number;
    rejectedResources: number;
    draftResources: number;
    archivedResources: number;
    sales: number;
    downloads: number;
    favorites: number;
    revenue: number;
  };

  monthlyStats: {
    month: string;
    label: string;
    revenue: number;
    sales: number;
    downloads: number;
  }[];

  topProducts: {
    productId: string;
    productName: string;
    productSlug: string;
    sales: number;
    revenue: number;
  }[];

  recentSales: {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    amount: number;
    buyerName: string;
    createdAt: string;
  }[];

  recentProducts: {
    id: string;
    name: string;
    slug: string;
    status: string;
    price: number;
    coverUrl: string | null;
    createdAt: string;
  }[];
};

type EarningsData = {
  summary: {
    grossRevenue: number;
    platformFees: number;
    creatorEarnings: number;
    totalSales: number;
  };

  monthlyEarnings: {
    month: string;
    label: string;
    grossRevenue: number;
    platformFees: number;
    creatorEarnings: number;
    sales: number;
  }[];

  recentEarnings: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    grossAmount: number;
    commissionRate: number;
    platformFee: number;
    creatorAmount: number;
    buyerName: string;
    createdAt: string;
  }[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Borrador";

    case "PENDING_REVIEW":
      return "Pendiente";

    case "PUBLISHED":
      return "Publicado";

    case "REJECTED":
      return "Rechazado";

    case "ARCHIVED":
      return "Archivado";

    default:
      return status;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "rk-badge-success";

    case "PENDING_REVIEW":
      return "rk-badge-warning";

    case "REJECTED":
      return "rk-badge-danger";

    default:
      return "rk-badge-neutral";
  }
}

const CREATOR_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Creador aprobado",
  SUSPENDED: "Cuenta suspendida",
  REJECTED: "Solicitud rechazada",
};

const CREATOR_STATUS_BADGE: Record<string, string> = {
  PENDING: "rk-badge-warning",
  APPROVED: "rk-badge-success",
  SUSPENDED: "rk-badge-danger",
  REJECTED: "rk-badge-danger",
};

/**
 * Accesos del Creator Studio.
 *
 * "Ganancias" no tiene página propia: el detalle financiero
 * vive en este mismo panel, así que el acceso ancla a esa
 * sección en vez de prometer una ruta que no existe.
 */
const QUICK_ACTIONS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/creadores/panel/nuevo",
    label: "Nuevo recurso",
    description: "Publica un recurso nuevo",
    icon: Plus,
  },
  {
    href: "/creadores/panel/recursos",
    label: "Mis recursos",
    description: "Gestiona tu catálogo",
    icon: Package,
  },
  {
    href: "#ganancias",
    label: "Ganancias",
    description: "Ingresos, comisión y saldo",
    icon: BarChart3,
  },
  {
    href: "/creadores/panel/retiros",
    label: "Retiros",
    description: "Solicita y revisa tus pagos",
    icon: Wallet,
  },
  {
    href: "/creadores/panel/metodos-pago",
    label: "Métodos de pago",
    description: "Dónde quieres cobrar",
    icon: CreditCard,
  },
  {
    href: "/creadores/panel/perfil",
    label: "Perfil",
    description: "Tu presencia pública",
    icon: Settings,
  },
];

export default function CreatorDashboard() {
  const { user } = useSessionUser();

  const [data, setData] = useState<DashboardData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, earningsResponse] =
        await Promise.all([
          fetch("/api/creadores/dashboard", {
            method: "GET",
            cache: "no-store",
          }),

          fetch("/api/creadores/ganancias", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      const result = await dashboardResponse.json();
      const earningsResult = await earningsResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          result.error || "No se pudo cargar el dashboard."
        );
      }

      if (!earningsResponse.ok) {
        throw new Error(
          earningsResult.error ||
            "No se pudieron cargar las ganancias."
        );
      }

      setData({
        ...result,
        monthlyStats: result.monthlyStats ?? [],
        topProducts: result.topProducts ?? [],
      });

      setEarnings(earningsResult);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="h-4 w-32 animate-pulse rounded-full bg-ink/[0.06]" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-full bg-ink/[0.06]" />

        <div
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {[0, 1, 2].map((index) => (
            <div key={index} className="rk-card p-5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-ink/[0.06]" />
              <div className="mt-4 h-8 w-32 animate-pulse rounded-full bg-ink/[0.07]" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div
          role="alert"
          className="rk-fade rounded-rk-md border border-danger/25 bg-danger/10 p-6"
        >
          <p className="font-medium text-danger">
            {error || "No se pudo cargar el dashboard."}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="rk-btn rk-btn-primary mt-5 !min-h-0 !px-4 !py-2.5 !text-sm"
          >
            Intentar nuevamente
          </button>
        </div>
      </main>
    );
  }

  const { stats } = data;

  const displayName =
    user?.publicName || user?.name || data.creator.name || "Creador";

  const initial = displayName.charAt(0).toUpperCase();

  const creatorStatus = user?.creatorStatus ?? null;

  // El catálogo, por estado real. Ninguno se estima.
  const catalog = [
    {
      label: "Recursos",
      value: stats.totalResources,
      hint: "Total creados",
      icon: Package,
      tone: "bg-ink/[0.06] text-ink/60",
    },
    {
      label: "Publicados",
      value: stats.publishedResources,
      hint: "Visibles en la tienda",
      icon: CheckCircle2,
      tone: "bg-success/12 text-success",
    },
    {
      label: "Pendientes",
      value: stats.pendingResources,
      hint: "En revisión",
      icon: Clock,
      tone: "bg-warning/12 text-warning",
    },
    {
      label: "Rechazados",
      value: stats.rejectedResources,
      hint: "Requieren atención",
      icon: AlertTriangle,
      tone: "bg-danger/10 text-danger",
    },
  ];

  const monthlyStats = data.monthlyStats ?? [];

  const maxRevenue = Math.max(
    ...monthlyStats.map((month) => month.revenue),
    1
  );

  // Sin ninguna venta no se dibuja un gráfico vacío.
  const hasChartData = monthlyStats.some(
    (month) => month.revenue > 0 || month.sales > 0
  );

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ========== CABECERA ========== */}
        <section className="rk-fade-up relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-accent/12 blur-[90px]"
          />

          <p className="rk-eyebrow">RCKTDMG</p>

          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="rk-title text-[2rem] sm:text-4xl">
                Creator Studio
              </h1>

              <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
                Gestiona tus recursos, ganancias y publicaciones.
              </p>
            </div>

            <Link
              href="/creadores/panel/nuevo"
              className="rk-btn rk-btn-primary shrink-0"
            >
              <Plus size={16} />
              Nuevo recurso
            </Link>
          </div>
        </section>

        {/* ========== IDENTIDAD DEL CREADOR ========== */}
        <section className="rk-fade-up rk-enter-1 mt-6">
          <div className="rk-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="rk-media relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-rk-md text-lg font-semibold text-ink/70 sm:h-16 sm:w-16 sm:text-xl">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  initial
                )}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold leading-tight">
                  {displayName}
                </p>

                {/* El usuario público solo si realmente existe. */}
                {user?.username ? (
                  <p className="mt-1 truncate text-sm text-ink/60">
                    @{user.username}
                  </p>
                ) : (
                  <p className="mt-1 truncate text-sm text-ink/60">
                    {data.creator.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {creatorStatus && (
                <span
                  className={`rk-badge ${
                    CREATOR_STATUS_BADGE[creatorStatus] ||
                    "rk-badge-neutral"
                  }`}
                >
                  {CREATOR_STATUS_LABEL[creatorStatus] ||
                    creatorStatus}
                </span>
              )}

              {/* Verificación: solo si el registro lo dice. */}
              {user?.isVerified && (
                <span className="rk-badge rk-badge-accent">
                  <BadgeCheck size={13} />
                  Verificado
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ========== FINANZAS ========== */}
        <section
          id="ganancias"
          className="rk-fade-up rk-enter-2 mt-10 scroll-mt-24 sm:mt-12"
        >
          <p className="rk-eyebrow">Finanzas</p>

          <h2 className="rk-title mt-2 text-2xl">
            Tus ganancias
          </h2>

          <div className="rk-divider mt-4" />

          {earnings ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {/* La ganancia real del creador manda. */}
              <div className="rk-card relative overflow-hidden border-accent/25 bg-accent/[0.06] p-5 sm:p-6">
                <p className="rk-eyebrow !text-accent">
                  Ganancias
                </p>

                <p className="mt-3 text-[2rem] font-semibold tabular-nums leading-tight tracking-tight text-accent">
                  {formatMoney(earnings.summary.creatorEarnings)}
                </p>

                <p className="mt-2 text-sm text-ink/60">
                  Lo que te corresponde
                </p>
              </div>

              <div className="rk-card p-5 sm:p-6">
                <p className="rk-eyebrow">Ingresos brutos</p>

                <p className="mt-3 text-[2rem] font-semibold tabular-nums leading-tight tracking-tight">
                  {formatMoney(earnings.summary.grossRevenue)}
                </p>

                <p className="mt-2 text-sm text-ink/60">
                  Ventas antes de comisión
                </p>
              </div>

              <div className="rk-card p-5 sm:p-6">
                <p className="rk-eyebrow">Comisión RCKTDMG</p>

                <p className="mt-3 text-[2rem] font-semibold tabular-nums leading-tight tracking-tight">
                  {formatMoney(earnings.summary.platformFees)}
                </p>

                <p className="mt-2 text-sm text-ink/60">
                  Comisión de plataforma
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/60">
              No se pudieron cargar las ganancias.
            </p>
          )}

          {/* ACTIVIDAD REAL */}
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              {
                label: "Ventas",
                value: stats.sales,
                hint: "Unidades vendidas",
              },
              {
                label: "Descargas",
                value: stats.downloads,
                hint: "Descargas realizadas",
              },
              {
                label: "Favoritos",
                value: stats.favorites,
                hint: "Veces que te guardaron",
              },
            ].map((item) => (
              <div key={item.label} className="rk-card p-4 sm:p-5">
                <p className="rk-eyebrow">{item.label}</p>

                <p className="mt-2.5 text-2xl font-semibold tabular-nums tracking-tight">
                  {item.value}
                </p>

                <p className="mt-1 text-sm text-ink/60">
                  {item.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <Link
              href="/creadores/panel/retiros"
              className="rk-card rk-card-hover rk-press group flex items-center gap-3.5 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-rk-sm bg-accent/10 text-accent">
                <Wallet size={18} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Retirar mi saldo
                </span>

                <span className="mt-0.5 block text-xs text-ink/60">
                  Consulta tu saldo disponible y solicita un retiro
                </span>
              </span>

              <ArrowRight
                size={16}
                aria-hidden
                className="shrink-0 text-ink/45 transition-all duration-normal ease-rk group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </Link>
          </div>
        </section>

        {/* ========== CATÁLOGO ========== */}
        <section className="rk-fade-up mt-10 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Catálogo</p>

              <h2 className="rk-title mt-2 text-2xl">
                Estado de tus recursos
              </h2>
            </div>

            <Link
              href="/creadores/panel/recursos"
              className="rk-press inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-75"
            >
              Ver todos
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="rk-divider mt-4" />

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {catalog.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rk-card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="rk-eyebrow">{item.label}</p>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-rk-sm ${item.tone}`}
                    >
                      <Icon size={16} />
                    </span>
                  </div>

                  <p className="mt-3 text-[2rem] font-semibold tabular-nums leading-tight tracking-tight">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs text-ink/60">
                    {item.hint}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Borradores y archivados: reales, en segundo plano. */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rk-chip">
              {stats.draftResources} en borrador
            </span>

            <span className="rk-chip">
              {stats.archivedResources} archivados
            </span>
          </div>
        </section>

        {/* ========== ACCIONES RÁPIDAS ========== */}
        <section className="rk-fade-up mt-10 sm:mt-12">
          <p className="rk-eyebrow">Acciones rápidas</p>

          <h2 className="rk-title mt-2 text-2xl">
            Todo tu estudio
          </h2>

          <div className="rk-divider mt-4" />

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rk-card rk-card-hover rk-press group flex items-center gap-3.5 p-3.5 sm:p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-rk-sm bg-accent/10 text-accent transition-transform duration-normal ease-rk group-hover:scale-105">
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {action.label}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-ink/60">
                      {action.description}
                    </span>
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
        </section>

        {/* ========== RENDIMIENTO ========== */}
        <section className="rk-fade-up mt-10 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Rendimiento</p>

              <h2 className="rk-title mt-2 text-2xl">
                Ingresos y ventas
              </h2>
            </div>

            <p className="text-sm text-ink/60">Últimos 6 meses</p>
          </div>

          <div className="rk-divider mt-4" />

          {hasChartData ? (
            <div className="rk-card mt-5 p-5 sm:p-6">
              <div className="flex h-60 items-end gap-2 sm:gap-4">
                {monthlyStats.map((month) => {
                  const height =
                    month.revenue > 0
                      ? Math.max(
                          (month.revenue / maxRevenue) * 100,
                          8
                        )
                      : 3;

                  return (
                    <div
                      key={month.month}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      <p className="truncate text-[11px] font-semibold tabular-nums">
                        {formatMoney(month.revenue)}
                      </p>

                      <p className="mt-0.5 text-[10px] text-ink/60">
                        {month.sales}{" "}
                        {month.sales === 1 ? "venta" : "ventas"}
                      </p>

                      <div className="mt-2 flex h-40 w-full items-end">
                        <div
                          className="w-full rounded-t-rk-sm bg-accent/85 transition-[height] duration-slow ease-rk"
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <p className="mt-2.5 truncate text-[11px] font-medium text-ink/60">
                        {month.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={BarChart3}
                title="Todavía no hay datos suficientes"
                description="Cuando tengas tu primera venta verás aquí la evolución de tus ingresos."
                action={{
                  href: "/creadores/panel/nuevo",
                  label: "Publicar un recurso",
                }}
              />
            </div>
          )}
        </section>

        {/* ========== RECIENTES ========== */}
        <section className="rk-fade-up mt-10 grid gap-5 lg:grid-cols-2 sm:mt-12">

          {/* RECURSOS RECIENTES */}
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="rk-title text-xl">
                Recursos recientes
              </h2>

              <Link
                href="/creadores/panel/recursos"
                className="rk-press text-sm font-medium text-accent transition-opacity hover:opacity-75"
              >
                Ver todos
              </Link>
            </div>

            <div className="rk-divider mt-3" />

            {data.recentProducts.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Package}
                  title="Todavía no tienes recursos"
                  description="Crea tu primer recurso para empezar a vender en RCKTDMG."
                  action={{
                    href: "/creadores/panel/nuevo",
                    label: "Crear recurso",
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {data.recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rk-card flex items-center gap-3.5 p-3"
                  >
                    {/* Miniatura 9:16, siempre nítida. */}
                    <div className="rk-media rk-aspect-product relative w-12 shrink-0 overflow-hidden rounded-rk-sm">
                      {product.coverUrl ? (
                        <Image
                          src={product.coverUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-ink/45">
                          RK
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {product.name}
                      </p>

                      <p className="mt-1 text-xs text-ink/60">
                        {formatDate(product.createdAt)}
                      </p>

                      <span
                        className={`rk-badge mt-1.5 ${getStatusBadge(
                          product.status
                        )}`}
                      >
                        {getStatusLabel(product.status)}
                      </span>
                    </div>

                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Link
                        href={`/creadores/productos/${product.id}`}
                        className="rk-btn rk-btn-glass !min-h-0 !px-3 !py-1.5 !text-xs"
                      >
                        Gestionar
                      </Link>

                      <Link
                        href={`/creadores/productos/${product.id}/estadisticas`}
                        className="rk-btn rk-btn-ghost !min-h-0 !px-3 !py-1.5 !text-xs"
                      >
                        Estadísticas
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VENTAS RECIENTES */}
          <div>
            <h2 className="rk-title text-xl">Ventas recientes</h2>

            <div className="rk-divider mt-3" />

            {data.recentSales.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={BarChart3}
                  title="Todavía no tienes ventas"
                  description="Las ventas aparecerán aquí en cuanto un cliente compre uno de tus recursos."
                />
              </div>
            ) : (
              <div className="rk-card mt-4 rk-divider-y px-4">
                {data.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {sale.productName}
                      </p>

                      <p className="mt-1 text-xs text-ink/60">
                        {sale.buyerName} ·{" "}
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(sale.amount)}
                      </p>

                      <p className="mt-1 text-xs text-ink/60">
                        × {sale.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========== MÁS VENDIDOS ========== */}
        {data.topProducts.length > 0 && (
          <section className="rk-fade-up mt-10 sm:mt-12">
            <p className="rk-eyebrow">Rendimiento del catálogo</p>

            <h2 className="rk-title mt-2 text-2xl">
              Más vendidos
            </h2>

            <div className="rk-divider mt-4" />

            <div className="rk-card mt-5 rk-divider-y px-4 sm:px-6">
              {data.topProducts.map((product, index) => (
                <Link
                  key={product.productId}
                  href={`/tienda/${product.productSlug}`}
                  className="rk-press-sm flex items-center gap-4 py-4 transition-opacity hover:opacity-70"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold tabular-nums text-accent">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {product.productName}
                    </p>

                    <p className="mt-1 text-xs text-ink/60">
                      {product.sales}{" "}
                      {product.sales === 1
                        ? "unidad vendida"
                        : "unidades vendidas"}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(product.revenue)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ========== ÚLTIMAS GANANCIAS ========== */}
        {earnings && earnings.recentEarnings.length > 0 && (
          <section className="rk-fade-up mt-10 sm:mt-12">
            <p className="rk-eyebrow">Finanzas</p>

            <h2 className="rk-title mt-2 text-2xl">
              Últimas ganancias
            </h2>

            <div className="rk-divider mt-4" />

            <div className="rk-card mt-5 rk-divider-y px-4 sm:px-6">
              {earnings.recentEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {earning.productName}
                    </p>

                    <p className="mt-1 text-xs text-ink/60">
                      {earning.buyerName} ·{" "}
                      {formatDate(earning.createdAt)}
                    </p>

                    {/* Cifras reales de la venta: no se recalculan. */}
                    <p className="mt-1.5 text-xs text-ink/60">
                      Venta {formatMoney(earning.grossAmount)} ·
                      Comisión {formatMoney(earning.platformFee)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold tabular-nums text-accent">
                      {formatMoney(earning.creatorAmount)}
                    </p>

                    <p className="mt-1 text-xs text-ink/60">
                      Tu ganancia
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
