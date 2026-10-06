import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ArrowRight,
  Banknote,
  ClipboardCheck,
  Percent,
  Sparkles,
  TrendingUp,
  Package,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { getAdminStats } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

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
      <p className="py-10 text-center text-sm text-ink/60">
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
            <span className="text-[9px] font-medium text-ink/60">
              {value > 0 ? format(value) : ""}
            </span>

            <div
              className="flex w-full flex-1 items-end"
              title={`${point.label}: ${format(value)}`}
            >
              <div
                className="w-full rounded-t-rk-sm bg-foreground/80 transition-[height] duration-slow ease-rk"
                style={{ height: `${Math.max(height, value > 0 ? 4 : 0)}%` }}
              />
            </div>

            <span className="text-[10px] capitalize text-ink/60">
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

  // Identidad real del administrador en sesión. El middleware
  // ya garantiza el rol: esto solo lee sus datos para mostrarlos.
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  const session = token
    ? await verifySessionToken(token)
    : null;

  const adminUser =
    session && typeof session.userId === "string"
      ? await prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            name: true,
            publicName: true,
            email: true,
            avatarUrl: true,
          },
        })
      : null;

  const adminName =
    adminUser?.publicName || adminUser?.name || "Administrador";

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
      <section className="rk-fade-up relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full rk-halo-marca blur-[90px]"
        />

        <p className="rk-eyebrow">Admin Center</p>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="rk-title text-[2rem] sm:text-4xl">
              Panel administrativo
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
              Gestiona el contenido, usuarios y operaciones de
              RCKTDMG.
            </p>
          </div>

          {pendingTasks > 0 && (
            <span className="rk-badge rk-badge-warning shrink-0">
              {pendingTasks}{" "}
              {pendingTasks === 1
                ? "tarea pendiente"
                : "tareas pendientes"}
            </span>
          )}
        </div>
      </section>

      {/* IDENTIDAD DEL ADMINISTRADOR */}
      <section className="rk-fade-up rk-enter-1 mt-6">
        <div className="rk-row-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="rk-media relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-semibold text-ink/70">
              {adminUser?.avatarUrl ? (
                <Image
                  src={adminUser.avatarUrl}
                  alt={adminName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                adminName.charAt(0).toUpperCase()
              )}
            </span>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {adminName}
              </p>

              {adminUser?.email && (
                <p className="mt-0.5 truncate text-xs text-ink/60">
                  {adminUser.email}
                </p>
              )}
            </div>
          </div>

          <span className="rk-badge rk-badge-accent shrink-0">
            ADMIN
          </span>
        </div>
      </section>

      {/* RESUMEN */}
      <section className="rk-enter rk-enter-1 mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          const card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="rk-eyebrow !tracking-[0.14em]">
                  {item.label}
                </p>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink">
                  <Icon size={15} />
                </span>
              </div>

              <p className="mt-2.5 truncate text-[1.4rem] font-semibold leading-tight tracking-tight">
                {item.value}
              </p>

              <p className="mt-1 text-[11px] text-ink/60">
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
        <div className="rk-card min-w-0 p-5">
          <h2 className="text-sm font-semibold">Ventas por mes</h2>

          <p className="mt-0.5 text-xs text-ink/60">
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

        <div className="rk-card min-w-0 p-5">
          <h2 className="text-sm font-semibold">
            Ingresos mensuales
          </h2>

          <p className="mt-0.5 text-xs text-ink/60">
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
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/10 pt-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/60">
                Bruto
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money(stats.revenue.gross)}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/60">
                Comisión
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money(stats.revenue.platformFee)}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/60">
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
        <div className="rk-table-wrap">
          <div className="rk-table-head">
            <h2>Últimas ventas</h2>

            <Link href="/admin/recursos">Ver recursos</Link>
          </div>

          {stats.recentSales.length === 0 ? (
            <p className="rk-table-empty">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <>
              {/* ESCRITORIO: tabla */}
              <div className="rk-table-scroll hidden lg:block">
                <table className="rk-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cliente</th>
                      <th>Creador</th>
                      <th>Fecha</th>
                      <th className="rk-table-num">Importe</th>
                      <th>Estado</th>
                      <th className="rk-table-actions">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="max-w-[16rem] truncate font-semibold">
                          {sale.productName}
                        </td>
                        <td className="rk-table-muted">{sale.buyer}</td>
                        <td className="rk-table-muted">{sale.creator}</td>
                        <td className="rk-table-muted">
                          {shortDate(sale.createdAt)}
                        </td>
                        <td className="rk-table-num">{money(sale.amount)}</td>
                        <td>
                          <span className="rk-badge rk-badge-success">
                            Pagado
                          </span>
                        </td>
                        <td className="rk-table-actions">
                          <Link
                            href={`/tienda/${sale.productSlug}`}
                            className="rk-table-link"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MÓVIL: tarjetas */}
              <ul className="rk-row-list is-inset lg:hidden">
                {stats.recentSales.map((sale) => (
                  <li key={sale.id}>
                    <Link
                      href={`/tienda/${sale.productSlug}`}
                      className="rk-row-card"
                    >
                      <div className="rk-row-card-head">
                        <div className="min-w-0">
                          <p className="rk-row-card-title">
                            {sale.productName}
                          </p>

                          <p className="rk-row-card-sub">
                            {sale.buyer} · {sale.creator}
                          </p>
                        </div>

                        <div className="rk-row-card-side">
                          <p className="rk-row-card-amount">
                            {money(sale.amount)}
                          </p>

                          <p className="rk-row-card-meta">
                            {shortDate(sale.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
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

                    <span className="ml-1.5 text-[11px] text-ink/60">
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
              aria-label="Ver todos los recursos"
              className="rk-press text-ink/60 hover:text-ink"
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
                <span className="text-ink/60">{label}</span>
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
              aria-label="Ver todos los usuarios"
              className="rk-press text-ink/60 hover:text-ink"
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
                <span className="text-ink/60">{label}</span>
                <span className="font-medium">{value}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line/10 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-ink/60">
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
              aria-label="Ver todos los creadores"
              className="rk-press text-ink/60 hover:text-ink"
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
                <span className="text-ink/60">{label}</span>
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
            <p className="py-8 text-center text-sm text-ink/60">
              Todavía no hay ventas.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line/10">
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

                    <span className="block text-[10px] text-ink/60">
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
            <p className="py-8 text-center text-sm text-ink/60">
              Todavía no hay ventas.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line/10">
              {stats.creators.byVolume.map((creator) => (
                <li
                  key={creator.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60">
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

                    <span className="block text-[10px] text-ink/60">
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
            <p className="py-8 text-center text-sm text-ink/60">
              Sin actividad todavía.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line/10">
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

                      <span className="shrink-0 text-[10px] text-ink/60">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] text-ink/60">
                      {item.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ACCIONES RÁPIDAS */}
      <section className="rk-fade-up mt-10">
        <p className="rk-eyebrow">Acciones rápidas</p>

        <h2 className="rk-title mt-2 text-2xl">
          Operaciones del día
        </h2>

        <div className="rk-divider mt-4" />

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/admin/recursos?estado=PENDING_REVIEW",
              label: "Revisiones",
              description: `${stats.products.pending} ${
                stats.products.pending === 1
                  ? "recurso esperando"
                  : "recursos esperando"
              }`,
              icon: ClipboardCheck,
            },
            {
              href: "/admin/retiros",
              label: "Retiros",
              description: `${stats.withdrawals.pendingCount} ${
                stats.withdrawals.pendingCount === 1
                  ? "solicitud por revisar"
                  : "solicitudes por revisar"
              }`,
              icon: Wallet,
            },
            {
              href: "/admin/recursos",
              label: "Recursos",
              description: "Todo el catálogo de la plataforma",
              icon: Package,
            },
            {
              href: "/admin/usuarios",
              label: "Usuarios",
              description: "Clientes, creadores y administradores",
              icon: Users,
            },
            {
              href: "/admin/usuarios?rol=CREATOR",
              label: "Creadores",
              description: "Estados, verificación y catálogo",
              icon: UserRound,
            },
            {
              href: "/admin/usuarios/nuevo",
              label: "Crear creador",
              description: "Alta manual de una cuenta",
              icon: UserPlus,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="rk-card rk-card-hover rk-press group flex items-center gap-3.5 p-3.5 sm:p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink transition-transform duration-normal ease-rk group-hover:scale-105">
                  <Icon size={18} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>

                  {/* Cifras reales, no estimaciones. */}
                  <span className="mt-0.5 block truncate text-xs text-ink/60">
                    {item.description}
                  </span>
                </span>

                <ArrowRight
                  size={16}
                  aria-hidden
                  className="shrink-0 text-ink/45 transition-all duration-normal ease-rk group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
