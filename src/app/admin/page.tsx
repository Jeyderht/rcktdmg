import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  ClipboardCheck,
  Percent,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { getAdminStats } from "@/lib/admin-stats";

export const metadata: Metadata = {
  title: "Administración",
};

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function timeAgo(date: Date) {
  const minutes = Math.floor(
    (Date.now() - date.getTime()) / 60000
  );

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  return shortDate(date);
}

const ORDER_STATUS = {
  PENDING: { label: "Pendientes", badge: "rk-badge-warning" },
  PAID: { label: "Pagados", badge: "rk-badge-success" },
  CANCELED: { label: "Cancelados", badge: "rk-badge-danger" },
  REFUNDED: { label: "Reembolsados", badge: "rk-badge-neutral" },
} as const;

const TONE_DOT = {
  neutral: "bg-ink/25",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

/** Barras proporcionales, sin librerías externas. */
function BarChart({
  points,
  valueOf,
  format,
}: {
  points: { key: string; label: string }[];
  valueOf: (index: number) => number;
  format: (value: number) => string;
}) {
  const values = points.map((_, index) => valueOf(index));
  const max = Math.max(...values, 0);

  if (max === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink/45">
        Todavía no hay datos en este periodo.
      </p>
    );
  }

  return (
    <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-1">
      {points.map((point, index) => {
        const value = values[index];
        const height = max > 0 ? (value / max) * 100 : 0;

        return (
          <div
            key={point.key}
            className="flex min-w-[2.1rem] flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-[9px] font-medium text-ink/45">
              {value > 0 ? format(value) : ""}
            </span>

            <div
              className="flex w-full flex-1 items-end"
              title={`${point.label}: ${format(value)}`}
            >
              <div
                className="w-full rounded-t-[0.4rem] bg-primary/85 transition-all"
                style={{ height: `${Math.max(height, value > 0 ? 4 : 0)}%` }}
              />
            </div>

            <span className="text-[10px] capitalize text-ink/40">
              {point.label.replace(".", "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function Admin() {
  const stats = await getAdminStats();

  const summary = [
    {
      label: "Ventas del día",
      value: money(stats.sales.day.total),
      hint: `${stats.sales.day.count} ${
        stats.sales.day.count === 1 ? "pedido" : "pedidos"
      }`,
      icon: TrendingUp,
    },
    {
      label: "Ventas del mes",
      value: money(stats.sales.month.total),
      hint: `${stats.sales.month.count} ${
        stats.sales.month.count === 1 ? "pedido" : "pedidos"
      }`,
      icon: TrendingUp,
    },
    {
      label: "Ventas del año",
      value: money(stats.sales.year.total),
      hint: `${stats.sales.year.count} ${
        stats.sales.year.count === 1 ? "pedido" : "pedidos"
      }`,
      icon: TrendingUp,
    },
    {
      label: "Ingresos brutos",
      value: money(stats.revenue.gross),
      hint: `${stats.revenue.unitsSold} unidades vendidas`,
      icon: Banknote,
    },
    {
      label: "Comisión de plataforma",
      value: money(stats.revenue.platformFee),
      hint: "Retenido por RCKTDMG",
      icon: Percent,
    },
    {
      label: "Ganancias de creadores",
      value: money(stats.revenue.creatorAmount),
      hint: "Acumulado de creadores",
      icon: Sparkles,
    },
    {
      label: "Retiros pendientes",
      value: money(stats.withdrawals.pendingAmount),
      hint: `${stats.withdrawals.pendingCount} por revisar`,
      icon: Wallet,
      href: "/admin/retiros",
    },
    {
      label: "Recursos pendientes",
      value: String(stats.products.pending),
      hint: "Esperando revisión",
      icon: ClipboardCheck,
      href: "/admin/recursos?estado=PENDING_REVIEW",
    },
  ];

  const pendingTasks =
    stats.products.pending + stats.withdrawals.pendingCount;

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">

      {/* ENCABEZADO */}
      <section className="rk-enter">
        <div className="rk-glass relative overflow-hidden rounded-[1.75rem] px-5 py-7 sm:px-8 sm:py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
          />

          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rk-eyebrow">Admin Center</p>

              <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight sm:text-3xl">
                Dashboard
              </h1>

              <p className="mt-2 text-sm text-ink/50">
                Estado real de la plataforma.
              </p>
            </div>

            {pendingTasks > 0 && (
              <span className="rk-badge rk-badge-warning">
                {pendingTasks}{" "}
                {pendingTasks === 1
                  ? "tarea pendiente"
                  : "tareas pendientes"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* RESUMEN */}
      <section className="rk-enter rk-enter-1 mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          const card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="rk-eyebrow !tracking-[0.14em]">
                  {item.label}
                </p>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-ink/[0.06] text-ink/55">
                  <Icon size={15} />
                </span>
              </div>

              <p className="mt-2.5 truncate text-[1.4rem] font-semibold leading-tight tracking-tight">
                {item.value}
              </p>

              <p className="mt-1 text-[11px] text-ink/45">
                {item.hint}
              </p>
            </>
          );

          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="rk-card rk-card-hover rk-press p-4"
            >
              {card}
            </Link>
          ) : (
            <div key={item.label} className="rk-card p-4">
              {card}
            </div>
          );
        })}
      </section>

      {/* GRÁFICOS */}
      <section className="rk-enter rk-enter-2 mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">Ventas por mes</h2>

          <p className="mt-0.5 text-xs text-ink/45">
            Pedidos pagados en los últimos 12 meses
          </p>

          <div className="mt-4">
            <BarChart
              points={stats.months}
              valueOf={(index) => stats.months[index].sales}
              format={(value) => String(value)}
            />
          </div>
        </div>

        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">
            Ingresos mensuales
          </h2>

          <p className="mt-0.5 text-xs text-ink/45">
            Importe bruto de los pedidos pagados
          </p>

          <div className="mt-4">
            <BarChart
              points={stats.months}
              valueOf={(index) => stats.months[index].gross}
              format={(value) => value.toFixed(0)}
            />
          </div>

          {/* Desglose real: bruto = comisión + creadores */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink/[0.07] pt-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/40">
                Bruto
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money(stats.revenue.gross)}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/40">
                Comisión
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money(stats.revenue.platformFee)}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/40">
                Creadores
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money(stats.revenue.creatorAmount)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ÚLTIMAS VENTAS */}
      <section className="rk-enter rk-enter-3 mt-4">
        <div className="rk-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
            <h2 className="text-sm font-semibold">Últimas ventas</h2>

            <Link
              href="/admin/recursos"
              className="rk-press text-xs font-medium text-ink/50 hover:text-ink"
            >
              Ver recursos
            </Link>
          </div>

          {stats.recentSales.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink/45">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <>
              {/* ESCRITORIO: tabla */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink/[0.07]">
                    <tr className="text-[11px] uppercase tracking-wider text-ink/40">
                      <th className="px-5 py-3 font-medium">
                        Producto
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Cliente
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Creador
                      </th>
                      <th className="px-5 py-3 font-medium">Fecha</th>
                      <th className="px-5 py-3 font-medium">
                        Importe
                      </th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium">Acción</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-ink/[0.07]">
                    {stats.recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="max-w-[16rem] truncate px-5 py-3 font-medium">
                          {sale.productName}
                        </td>
                        <td className="px-5 py-3 text-ink/60">
                          {sale.buyer}
                        </td>
                        <td className="px-5 py-3 text-ink/60">
                          {sale.creator}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink/50">
                          {shortDate(sale.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-semibold">
                          {money(sale.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rk-badge rk-badge-success">
                            Pagado
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/tienda/${sale.productSlug}`}
                            className="rk-press text-xs font-medium text-ink/60 underline underline-offset-2 hover:text-ink"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MÓVIL: tarjetas compactas */}
              <ul className="divide-y divide-ink/[0.07] lg:hidden">
                {stats.recentSales.map((sale) => (
                  <li key={sale.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/tienda/${sale.productSlug}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-[13px] font-semibold">
                          {sale.productName}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-ink/45">
                          {sale.buyer} · {sale.creator}
                        </p>
                      </Link>

                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-semibold">
                          {money(sale.amount)}
                        </p>

                        <p className="mt-0.5 text-[10px] text-ink/40">
                          {shortDate(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* PEDIDOS · RECURSOS · USUARIOS · CREADORES */}
      <section className="rk-enter rk-enter-4 mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* PEDIDOS */}
        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">Pedidos</h2>

          <ul className="mt-3 space-y-2">
            {(
              ["PAID", "PENDING", "CANCELED", "REFUNDED"] as const
            ).map((status) => {
              const row = stats.orders[
                status.toLowerCase() as keyof typeof stats.orders
              ];

              return (
                <li
                  key={status}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className={`rk-badge ${ORDER_STATUS[status].badge}`}>
                    {ORDER_STATUS[status].label}
                  </span>

                  <span className="text-right">
                    <span className="font-semibold">{row.count}</span>

                    <span className="ml-1.5 text-[11px] text-ink/40">
                      {money(row.total)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RECURSOS */}
        <div className="rk-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recursos</h2>

            <Link
              href="/admin/recursos"
              className="rk-press text-ink/40 hover:text-ink"
            >
              <ArrowRight size={14} />
            </Link>
          </div>

          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {stats.products.total}
          </p>

          <ul className="mt-3 space-y-1.5 text-sm">
            {[
              ["Publicados", stats.products.published],
              ["Pendientes", stats.products.pending],
              ["Borradores", stats.products.draft],
              ["Rechazados", stats.products.rejected],
              ["Archivados", stats.products.archived],
            ].map(([label, value]) => (
              <li
                key={String(label)}
                className="flex items-center justify-between"
              >
                <span className="text-ink/50">{label}</span>
                <span className="font-medium">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* USUARIOS */}
        <div className="rk-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Usuarios</h2>

            <Link
              href="/admin/usuarios"
              className="rk-press text-ink/40 hover:text-ink"
            >
              <ArrowRight size={14} />
            </Link>
          </div>

          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {stats.users.total}
          </p>

          <ul className="mt-3 space-y-1.5 text-sm">
            {[
              ["Clientes", stats.users.clients],
              ["Creadores", stats.users.creators],
              ["Administradores", stats.users.admins],
            ].map(([label, value]) => (
              <li
                key={String(label)}
                className="flex items-center justify-between"
              >
                <span className="text-ink/50">{label}</span>
                <span className="font-medium">{value}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-ink/[0.07] pt-3">
            <p className="text-[10px] uppercase tracking-wider text-ink/40">
              Nuevos por mes
            </p>

            <div className="mt-2 flex h-12 items-end gap-1">
              {stats.users.newByMonth.map((month) => {
                const max = Math.max(
                  ...stats.users.newByMonth.map((m) => m.count),
                  1
                );

                return (
                  <div
                    key={month.key}
                    title={`${month.label}: ${month.count}`}
                    className="flex-1 rounded-t-[0.25rem] bg-primary/70"
                    style={{
                      height: `${
                        month.count > 0
                          ? Math.max((month.count / max) * 100, 8)
                          : 2
                      }%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* CREADORES */}
        <div className="rk-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Creadores</h2>

            <Link
              href="/admin/usuarios?rol=CREATOR"
              className="rk-press text-ink/40 hover:text-ink"
            >
              <ArrowRight size={14} />
            </Link>
          </div>

          <ul className="mt-3 space-y-1.5 text-sm">
            {[
              ["Aprobados", stats.creators.approved],
              ["Pendientes", stats.creators.pending],
              ["Suspendidos", stats.creators.suspended],
              ["Rechazados", stats.creators.rejected],
            ].map(([label, value]) => (
              <li
                key={String(label)}
                className="flex items-center justify-between"
              >
                <span className="text-ink/50">{label}</span>
                <span className="font-medium">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* VOLUMEN Y ACTIVIDAD */}
      <section className="mt-4 grid gap-4 xl:grid-cols-3">

        {/* RECURSOS CON MAYOR NÚMERO DE VENTAS */}
        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">
            Recursos con mayor número de ventas
          </h2>

          {stats.products.bestSellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">
              Todavía no hay ventas.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/[0.07]">
              {stats.products.bestSellers.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <Link
                    href={`/tienda/${product.slug}`}
                    className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline"
                  >
                    {product.name}
                  </Link>

                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold">
                      {product.sales}
                    </span>

                    <span className="block text-[10px] text-ink/40">
                      {money(product.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CREADORES CON MAYOR VOLUMEN DE VENTAS */}
        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">
            Creadores con mayor volumen de ventas
          </h2>

          {stats.creators.byVolume.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">
              Todavía no hay ventas.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/[0.07]">
              {stats.creators.byVolume.map((creator) => (
                <li
                  key={creator.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/55">
                      <UserRound size={13} />
                    </span>

                    <span className="truncate text-[13px] font-medium">
                      {creator.name}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold">
                      {creator.sales}
                    </span>

                    <span className="block text-[10px] text-ink/40">
                      {money(creator.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ACTIVIDAD RECIENTE */}
        <div className="rk-card p-5">
          <h2 className="text-sm font-semibold">
            Actividad reciente
          </h2>

          {stats.activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">
              Sin actividad todavía.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/[0.07]">
              {stats.activity.map((item) => (
                <li key={item.id} className="flex gap-2.5 py-2.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      TONE_DOT[item.tone]
                    }`}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium">
                        {item.title}
                      </span>

                      <span className="shrink-0 text-[10px] text-ink/40">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] text-ink/45">
                      {item.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ACCESOS */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/admin/recursos?estado=PENDING_REVIEW",
            label: "Revisar recursos",
            icon: ClipboardCheck,
          },
          {
            href: "/admin/usuarios",
            label: "Usuarios",
            icon: Users,
          },
          {
            href: "/admin/usuarios?rol=CREATOR",
            label: "Creadores",
            icon: UserRound,
          },
          {
            href: "/admin/retiros",
            label: "Retiros",
            icon: Wallet,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="rk-card rk-card-hover rk-press flex items-center gap-3 p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary text-onprimary">
                <Icon size={16} />
              </span>

              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {item.label}
              </span>

              <ArrowRight size={14} className="shrink-0 text-ink/35" />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
