import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ArrowRight,
  ClipboardCheck,
  Package,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { getAdminStats } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { IconoUsuario } from "@/components/iconos";
import BalanceAdmin from "@/components/admin/BalanceAdmin";
import { COLORES_ADMIN } from "@/lib/admin-colores";

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

const TONE_DOT = {
  neutral: "bg-ink/25",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

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

  const ahora = new Date();
  const mes = new Intl.DateTimeFormat("es-PE", { month: "long" }).format(ahora);
  const mesActual = `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${ahora.getFullYear()}`;

  // Reparto de lo cobrado (0–100 %). Sin ventas no hay porcentaje.
  const { gross, platformFee, creatorAmount } = stats.revenue;
  const pct = (parte: number) =>
    gross > 0 ? `${Math.round((parte / gross) * 100)}%` : "";

  /* Pedidos por estado: serie 1–4 de COLORES_ADMIN. */
  const pedidos = [
    { label: "Pagados", valor: stats.orders.paid.count },
    { label: "Pendientes", valor: stats.orders.pending.count },
    { label: "Cancelados", valor: stats.orders.canceled.count },
    { label: "Reembolsados", valor: stats.orders.refunded.count },
  ];
  const totalPedidos = pedidos.reduce((s, p) => s + p.valor, 0);

  /*
    Anillo de Pedidos: un círculo de circunferencia 100, así cada
    arco mide lo que su parte del total. Con más de un tramo se
    deja un hueco entre arcos para que las puntas redondas no se
    pisen.
  */
  const conValor = pedidos.filter((p) => p.valor > 0).length;
  const hueco = conValor > 1 ? 3 : 0;
  let acumulado = 0;
  const arcos = pedidos.flatMap((p, i) => {
    if (p.valor === 0 || totalPedidos === 0) return [];
    const parte = (p.valor / totalPedidos) * 100;
    const arco = {
      color: COLORES_ADMIN[i],
      largo: Math.max(parte - hueco, 0.01),
      desde: acumulado + (acumulado > 0 ? hueco : 0),
    };
    acumulado += parte;
    return [arco];
  });
  const resumenPedidos =
    totalPedidos === 0
      ? "Sin pedidos"
      : pedidos
          .filter((p) => p.valor > 0)
          .map((p) => `${p.valor} ${p.label.toLowerCase()}`)
          .join(", ")
          .replace(/, ([^,]*)$/, " y $1");

  /* Recursos por estado: serie 1–5. */
  const recursos = [
    { label: "Publicados", valor: stats.products.published },
    { label: "Pendientes", valor: stats.products.pending },
    { label: "Borradores", valor: stats.products.draft },
    { label: "Rechazados", valor: stats.products.rejected },
    { label: "Archivados", valor: stats.products.archived },
  ];

  return (
    <main className="rk-mn-pagina">
      <div data-vista="Dashboard">
        <header className="rk-vh">
          <h1 className="rk-title">Dashboard</h1>
          <p>
            Bienvenido, {adminName} · {mesActual}
          </p>
        </header>

        {/* INGRESOS: el componente de siempre, sin cambios */}
        <div className="mt-4">
          <BalanceAdmin
            meses={stats.months}
            hoy={stats.sales.day.total}
            anio={stats.sales.year.total}
          />
        </div>

        <div className="rk-db">
          {/* MI PLATAFORMA · ingresos brutos, reparto y retiros */}
          <section className="rk-card rk-pl" aria-label="Mi plataforma">
            <div className="rk-pl-top">
              <div className="rk-pl-h">
                <h3>Mi plataforma</h3>
              </div>
              <p className="rk-db-mut" style={{ margin: "14px 0 0" }}>
                Ingresos brutos
              </p>
              <p className="rk-pl-monto">{money(gross)}</p>
              <div className="rk-pl-tarjeta" aria-hidden="true">
                <span className="rk-isotipo rk-pl-iso" />
                <span className="rk-pl-num">
                  •••• {stats.revenue.unitsSold} vendidos
                </span>
              </div>
            </div>

            <div className="rk-pl-hoja">
              <div className="rk-pl-acc">
                <div className="rk-pl-it">
                  <span className="rk-pl-ic">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" />
                    </svg>
                  </span>
                  <span className="rk-pl-et">
                    Plataforma {pct(platformFee)}
                  </span>
                  <b>{money(platformFee)}</b>
                </div>

                <div className="rk-pl-it">
                  <span className="rk-pl-ic">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <span className="rk-pl-et">
                    Creadores {pct(creatorAmount)}
                  </span>
                  <b>{money(creatorAmount)}</b>
                </div>
              </div>

              <div className="rk-pl-ret">
                <div>
                  <span className="rk-db-mut">Retiros pendientes</span>
                  <b>{money(stats.withdrawals.pendingAmount)}</b>
                </div>
                <Link
                  className="rk-btn rk-btn-ink rk-btn-compact"
                  href="/admin/retiros"
                >
                  Ver
                </Link>
              </div>
            </div>
          </section>

          {/* PEDIDOS · anillo por estado */}
          <section className="rk-card rk-k2c" aria-label="Pedidos">
            <div className="rk-k2-h">
              <h3>Pedidos</h3>
            </div>
            <div className="rk-k2-dona">
              <div className="rk-k2-anillo">
                <svg viewBox="0 0 36 36" width="124" height="124" role="img" aria-label={resumenPedidos}>
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgb(var(--rk-foreground)/.07)" strokeWidth="3.2" />
                  {arcos.map((a) => (
                    <circle
                      key={a.color}
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke={a.color}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeDasharray={`${a.largo.toFixed(1)} ${(100 - a.largo).toFixed(1)}`}
                      strokeDashoffset={a.desde ? (-a.desde).toFixed(1) : undefined}
                      transform="rotate(-90 18 18)"
                    />
                  ))}
                </svg>
                <div>
                  <b>{totalPedidos}</b>
                  <span>pedidos</span>
                </div>
              </div>
              <ul className="rk-k2-ley">
                {pedidos.map((p, i) => (
                  <li key={p.label}>
                    <i data-c={i + 1} />
                    {p.label}
                    <b>{p.valor}</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* RECURSOS · por estado */}
          <section className="rk-card rk-k2c" aria-label="Recursos">
            <div className="rk-k2-h">
              <h3>Recursos</h3>
              <Link
                className="rk-k2-a"
                href="/admin/recursos?estado=PENDING_REVIEW"
              >
                Revisar pendientes
              </Link>
            </div>
            <div className="rk-k2-g">
              {recursos.map((r, i) => (
                <div
                  key={r.label}
                  className={`rk-k2${i === recursos.length - 1 ? " rk-k2-ancho" : ""}`}
                >
                  <span className="rk-k2-e">
                    <i data-c={i + 1} />
                    {r.label}
                  </span>
                  <b>{r.valor}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* USUARIOS · CREADORES */}
      <section className="rk-enter rk-enter-2 mt-4 grid gap-4 md:grid-cols-2">

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
                      <IconoUsuario size={13} />
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
              icon: IconoUsuario,
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
