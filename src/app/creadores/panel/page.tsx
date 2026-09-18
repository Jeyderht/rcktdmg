"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";

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

function getStatusClass(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-success/12 text-success";

    case "PENDING_REVIEW":
      return "bg-warning/12 text-warning";

    case "REJECTED":
      return "bg-danger/10 text-danger";

    case "ARCHIVED":
      return "bg-ink/[0.09] text-ink/60";

    default:
      return "bg-ink/[0.05] text-ink/60";
  }
}

export default function CreatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [earnings, setEarnings] =
    useState<EarningsData | null>(null);

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
          result.error ||
          "No se pudo cargar el dashboard."
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
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-8 lg:py-12">
        <div>
          <div className="rk-card p-12 text-center">
            <p className="text-sm text-ink/50">
              Cargando dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-8 lg:py-12">
        <div>
          <div className="rounded-3xl border border-danger/25 bg-danger/10 p-8">
            <p className="font-medium text-danger">
              {error || "No se pudo cargar el dashboard."}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm text-onprimary"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { stats } = data;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-5 lg:px-8 lg:pb-24 lg:pt-12">
      <div>

        {/* HEADER */}

        <header className="rk-enter">
          <div className="rk-glass relative overflow-hidden rounded-[2rem] px-5 py-8 sm:rounded-[2.5rem] sm:px-9 sm:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="rk-eyebrow">Creator Studio</p>

                <h1 className="mt-2.5 text-[1.9rem] font-semibold leading-tight sm:text-4xl">
                  Hola, {data.creator.name || "Creador"}
                </h1>

                <p className="mt-2.5 text-[15px] leading-7 text-ink/50">
                  Administra tus recursos, ventas y actividad.
                </p>
              </div>

              {/*
                Las demás secciones viven en CreatorNav, arriba:
                aquí solo queda la acción principal.
              */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/creadores/panel/recursos"
                  className="rk-btn rk-btn-glass !px-4 !py-2.5 !text-[13px]"
                >
                  Mis recursos
                </Link>

                <Link
                  href="/creadores/panel/nuevo"
                  className="rk-btn rk-btn-primary !px-5 !py-2.5 !text-[13px]"
                >
                  <Plus size={15} />
                  Nuevo recurso
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ESTADÍSTICAS PRINCIPALES */}

        <section className="rk-enter rk-enter-1 mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[
            {
              label: "Recursos",
              value: stats.totalResources,
              hint: "Total creados",
              hintClass: "text-ink/40",
              icon: Package,
              iconClass: "bg-ink/[0.06] text-ink/55",
            },
            {
              label: "Publicados",
              value: stats.publishedResources,
              hint: "Recursos activos",
              hintClass: "text-success",
              icon: CheckCircle2,
              iconClass: "bg-success/12 text-success",
            },
            {
              label: "Pendientes",
              value: stats.pendingResources,
              hint: "En revisión",
              hintClass: "text-warning",
              icon: Clock,
              iconClass: "bg-warning/12 text-warning",
            },
            {
              label: "Rechazados",
              value: stats.rejectedResources,
              hint: "Requieren atención",
              hintClass: "text-danger",
              icon: AlertTriangle,
              iconClass: "bg-danger/10 text-danger",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rk-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="rk-eyebrow !tracking-[0.16em]">
                    {item.label}
                  </p>

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] ${item.iconClass}`}
                  >
                    <Icon size={16} />
                  </span>
                </div>

                <p className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight">
                  {item.value}
                </p>

                <p className={`mt-1.5 text-xs ${item.hintClass}`}>
                  {item.hint}
                </p>
              </div>
            );
          })}
        </section>

        {/* MÉTRICAS */}

        <section className="mt-4 grid gap-4 md:grid-cols-3">

          <div className="rounded-3xl bg-primary p-7 text-onprimary">
            <p className="text-sm text-onprimary/50">
              Ingresos
            </p>

            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {formatMoney(stats.revenue)}
            </p>

            <p className="mt-3 text-sm text-onprimary/40">
              Ventas pagadas
            </p>
          </div>

          <div className="rk-card p-7">
            <p className="text-sm text-ink/45">
              Ventas
            </p>

            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {stats.sales}
            </p>

            <p className="mt-3 text-sm text-ink/40">
              Unidades vendidas
            </p>
          </div>

          <div className="rk-card p-7">
            <p className="text-sm text-ink/45">
              Descargas
            </p>

            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {stats.downloads}
            </p>

            <p className="mt-3 text-sm text-ink/40">
              Descargas realizadas
            </p>
          </div>

        </section>
        {/* GANANCIAS */}

        {earnings && (
          <section className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rk-card p-6">
              <p className="text-sm text-ink/45">
                Ingresos brutos
              </p>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatMoney(
                  earnings.summary.grossRevenue
                )}
              </p>

              <p className="mt-2 text-sm text-ink/40">
                Ventas antes de comisión
              </p>
            </div>

            <div className="rk-card p-6">
              <p className="text-sm text-ink/45">
                Comisión RCKTDMG
              </p>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatMoney(
                  earnings.summary.platformFees
                )}
              </p>

              <p className="mt-2 text-sm text-ink/40">
                Comisión de plataforma
              </p>
            </div>

            <div className="rounded-3xl bg-primary p-6 text-onprimary">
              <p className="text-sm text-onprimary/50">
                Ganancias
              </p>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatMoney(
                  earnings.summary.creatorEarnings
                )}
              </p>

              <p className="mt-2 text-sm text-onprimary/40">
                Ganancia del creador
              </p>
            </div>

          </section>
        )}
        {/* SEGUNDA FILA */}

        <section className="mt-4 grid gap-4 md:grid-cols-3">

          <div className="rk-card p-6">
            <p className="text-sm text-ink/45">
              Favoritos
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {stats.favorites}
            </p>

            <p className="mt-2 text-sm text-ink/40">
              Veces que guardaron tus recursos
            </p>
          </div>

          <div className="rk-card p-6">
            <p className="text-sm text-ink/45">
              Borradores
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {stats.draftResources}
            </p>

            <p className="mt-2 text-sm text-ink/40">
              Recursos todavía sin publicar
            </p>
          </div>

          <div className="rk-card p-6">
            <p className="text-sm text-ink/45">
              Archivados
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {stats.archivedResources}
            </p>

            <p className="mt-2 text-sm text-ink/40">
              Recursos archivados
            </p>
          </div>

        </section>
        {/* RENDIMIENTO */}

        <section className="mt-10 rk-card p-6 md:p-8">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                Rendimiento
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Ingresos y ventas
              </h2>
            </div>

            <p className="text-sm text-ink/40">
              Últimos 6 meses
            </p>
          </div>

          <div className="mt-8">

            {(() => {
              const monthlyStats = data.monthlyStats ?? [];

              const maxRevenue = Math.max(
                ...monthlyStats.map(
                  (month) => month.revenue
                ),
                1
              );

              return (
                <div className="flex h-64 items-end gap-3 sm:gap-5">

                  {monthlyStats.map((month) => {

                    const height =
                      month.revenue > 0
                        ? Math.max(
                          (month.revenue / maxRevenue) * 100,
                          8
                        )
                        : 4;

                    return (
                      <div
                        key={month.month}
                        className="flex h-full flex-1 flex-col items-center justify-end"
                      >

                        <div className="mb-2 text-center">
                          <p className="text-xs font-semibold">
                            {formatMoney(month.revenue)}
                          </p>

                          <p className="text-[10px] text-ink/35">
                            {month.sales} ventas
                          </p>
                        </div>

                        <div className="flex h-44 w-full items-end">
                          <div
                            className="w-full rounded-t-2xl bg-primary transition-all"
                            style={{
                              height: `${height}%`,
                            }}
                          />
                        </div>

                        <p className="mt-3 text-xs font-medium text-ink/45">
                          {month.label}
                        </p>

                      </div>
                    );
                  })}

                </div>
              );
            })()}

          </div>

        </section>
        {/* CONTENIDO INFERIOR */}

        <section className="mt-10 grid gap-5 lg:grid-cols-2">

          {/* RECURSOS RECIENTES */}

          <div className="rk-card p-6">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                  Catálogo
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Recursos recientes
                </h2>
              </div>

              <Link
                href="/creadores/panel/recursos"
                className="text-sm font-medium text-ink/50 hover:text-ink"
              >
                Ver todos
              </Link>
            </div>

            <div className="mt-6 divide-y divide-ink/[0.07]">

              {data.recentProducts.length === 0 ? (
                <p className="py-8 text-sm text-ink/40">
                  Todavía no tienes recursos.
                </p>
              ) : (
                data.recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">

                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink/[0.05]">
                        {product.coverUrl ? (
                          <img
                            src={product.coverUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[9px] tracking-widest text-ink/25">
                            RCKTDMG
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-ink/40">
                          {formatDate(product.createdAt)}
                        </p>
                      </div>

                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${getStatusClass(
                          product.status
                        )}`}
                      >
                        {getStatusLabel(product.status)}
                      </span>

                      <Link
                        href={`/creadores/productos/${product.id}`}
                        className="rounded-full border border-ink/10 bg-surface px-4 py-2 text-xs font-medium transition hover:bg-primary hover:text-onprimary"
                      >
                        Gestionar
                      </Link>

                      <Link
                        href={`/creadores/productos/${product.id}/estadisticas`}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-onprimary transition hover:opacity-80"
                      >
                        Estadísticas
                      </Link>

                    </div>
                  </div>
                ))
              )}

            </div>
          </div>

          {/* VENTAS RECIENTES */}

          <div className="rk-card p-6">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                Actividad
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Ventas recientes
              </h2>
            </div>

            <div className="mt-6 divide-y divide-ink/[0.07]">

              {data.recentSales.length === 0 ? (
                <div className="py-8">
                  <p className="text-sm text-ink/40">
                    Todavía no tienes ventas.
                  </p>

                  <p className="mt-2 text-xs text-ink/30">
                    Las ventas aparecerán aquí cuando un cliente compre
                    tus recursos.
                  </p>
                </div>
              ) : (
                data.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {sale.productName}
                      </p>

                      <p className="mt-1 text-xs text-ink/40">
                        {sale.buyerName} · {formatDate(sale.createdAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {formatMoney(sale.amount)}
                      </p>

                      <p className="mt-1 text-xs text-ink/40">
                        × {sale.quantity}
                      </p>
                    </div>
                  </div>
                ))
              )}

            </div>
          </div>

        </section>
        {/* PRODUCTOS MÁS VENDIDOS */}

        <section className="mt-5 rk-card p-6 md:p-8">

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
              Rendimiento del catálogo
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Productos más vendidos
            </h2>
          </div>

          <div className="mt-6">

            {data.topProducts.length === 0 ? (
              <div className="rounded-2xl bg-ink/[0.05] p-8 text-center">
                <p className="text-sm text-ink/40">
                  Todavía no tienes ventas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ink/[0.07]">

                {data.topProducts.map((product, index) => (

                  <Link
                    key={product.productId}
                    href={`/tienda/${product.productSlug}`}
                    className="flex items-center gap-4 py-5 transition hover:bg-ink/[0.02]"
                  >

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-onprimary">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-semibold">
                        {product.productName}
                      </p>

                      <p className="mt-1 text-xs text-ink/40">
                        {product.sales}{" "}
                        {product.sales === 1
                          ? "unidad vendida"
                          : "unidades vendidas"}
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="text-sm font-semibold">
                        {formatMoney(product.revenue)}
                      </p>

                      <p className="mt-1 text-xs text-ink/35">
                        Ingresos
                      </p>

                    </div>

                  </Link>

                ))}

              </div>
            )}

          </div>

        </section>
        {/* HISTORIAL DE GANANCIAS */}

        {earnings && (
          <section className="mt-5 rk-card p-6 md:p-8">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                  Finanzas
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Últimas ganancias
                </h2>
              </div>

              <p className="text-sm text-ink/40">
                Ventas pagadas
              </p>
            </div>

            <div className="mt-6 divide-y divide-ink/[0.07]">

              {earnings.recentEarnings.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-ink/40">
                    Todavía no tienes ganancias registradas.
                  </p>
                </div>
              ) : (
                earnings.recentEarnings.map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between gap-4 py-5"
                  >

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {earning.productName}
                      </p>

                      <p className="mt-1 text-xs text-ink/40">
                        {earning.buyerName} ·{" "}
                        {formatDate(earning.createdAt)}
                      </p>

                      <p className="mt-2 text-xs text-ink/40">
                        Venta:{" "}
                        {formatMoney(
                          earning.grossAmount
                        )}{" "}
                        · Comisión:{" "}
                        {formatMoney(
                          earning.platformFee
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold">
                        {formatMoney(
                          earning.creatorAmount
                        )}
                      </p>

                      <p className="mt-1 text-xs text-success">
                        Tu ganancia
                      </p>
                    </div>

                  </div>
                ))
              )}

            </div>
          </section>
        )}
      </div>
    </main>
  );
}