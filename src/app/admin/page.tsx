import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  Package,
  Plus,
  SlidersHorizontal,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { getAdminStats } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { IconoUsuario } from "@/components/iconos";
import BalanceAdmin from "@/components/admin/BalanceAdmin";
import DonaAdmin from "@/components/admin/DonaAdmin";

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

  const pendingTasks =
    stats.products.pending + stats.withdrawals.pendingCount;

  const ahora = new Date();
  const mesActual = `${new Intl.DateTimeFormat("es-PE", {
    month: "long",
  }).format(ahora)} ${ahora.getFullYear()}`;
  const vence = new Intl.DateTimeFormat("es-PE", {
    month: "2-digit",
    year: "2-digit",
  }).format(ahora);

  // Parte de lo cobrado que retiene la plataforma (0–100 %).
  const partePlataforma =
    stats.revenue.gross > 0
      ? Math.min(
          100,
          Math.round((stats.revenue.platformFee / stats.revenue.gross) * 100)
        )
      : 0;

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">

      {/* ENCABEZADO: título, saludo y acciones */}
      <section className="rk-fade-up rk-adm-cabeza">
        <div className="min-w-0">
          <h1 className="rk-title text-[1.9rem] sm:text-[2.2rem]">Dashboard</h1>
          <p className="mt-1 text-[13px] text-ink/60">
            Bienvenido, {adminName}
          </p>
        </div>

        <div className="rk-adm-acciones">
          <Link
            href="/admin/recursos?estado=PENDING_REVIEW"
            className="rk-adm-circulo"
            aria-label={`${pendingTasks} tareas pendientes`}
          >
            <SlidersHorizontal size={16} aria-hidden />
            {pendingTasks > 0 && (
              <span className="rk-adm-aviso">{pendingTasks}</span>
            )}
          </Link>

          <Link href="/admin/usuarios/nuevo" className="rk-adm-pildora is-negra">
            <Plus size={14} aria-hidden />
            Crear creador
          </Link>

          <span className="rk-adm-pildora">
            <CalendarDays size={14} aria-hidden />
            <span className="capitalize">{mesActual}</span>
          </span>
        </div>
      </section>

      {/* BENTO: ingresos · comisión y dona · cuenta */}
      <section className="rk-enter rk-enter-1 rk-adm-bento">
        <BalanceAdmin
          meses={stats.months}
          hoy={stats.sales.day.total}
          anio={stats.sales.year.total}
        />

        <div className="rk-adm-col">
          {/* Comisión retenida sobre lo cobrado */}
          <section className="rk-card rk-adm-meta">
            <div className="rk-adm-meta-cabeza">
              <h2 className="rk-adm-card-titulo">Comisión de plataforma</h2>
              <Link
                href="/admin/retiros"
                className="rk-adm-circulo is-chico"
                aria-label="Ver retiros"
              >
                <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>

            <div className="rk-adm-meta-cifras">
              <div>
                <p className="rk-adm-mini-etiqueta">Retenido</p>
                <p className="rk-adm-meta-valor">
                  {money(stats.revenue.platformFee)}
                  <span> / {money(stats.revenue.gross)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="rk-adm-mini-etiqueta">Creadores</p>
                <p className="rk-adm-meta-valor">
                  {money(stats.revenue.creatorAmount)}
                </p>
              </div>
            </div>

            <div
              className="rk-adm-progreso"
              role="img"
              aria-label={`${partePlataforma} % retenido por la plataforma`}
            >
              <span style={{ width: `${partePlataforma}%` }} />
            </div>
          </section>

          <DonaAdmin
            pedidos={[
              { label: "Pagados", valor: stats.orders.paid.count },
              { label: "Pendientes", valor: stats.orders.pending.count },
              { label: "Cancelados", valor: stats.orders.canceled.count },
              { label: "Reembolsados", valor: stats.orders.refunded.count },
            ]}
            recursos={[
              { label: "Publicados", valor: stats.products.published },
              { label: "Pendientes", valor: stats.products.pending },
              { label: "Borradores", valor: stats.products.draft },
              { label: "Rechazados", valor: stats.products.rejected },
              { label: "Archivados", valor: stats.products.archived },
            ]}
          />
        </div>

        <div className="rk-adm-col">
          <div className="rk-adm-cuenta-cabeza">
            <h2 className="rk-adm-card-titulo">Mi plataforma</h2>
          </div>

          {/* Tarjeta de marca con los ingresos brutos */}
          <div className="rk-adm-tarjeta-pila">
            <span aria-hidden className="rk-adm-tarjeta-atras is-1" />
            <span aria-hidden className="rk-adm-tarjeta-atras is-2" />
            <div className="rk-adm-tarjeta">
              <div className="rk-adm-tarjeta-arriba">
                <span aria-hidden className="rk-isotipo rk-adm-tarjeta-iso" />
                <span className="rk-adm-tarjeta-marca">RcktX</span>
              </div>
              <div>
                <p className="rk-adm-tarjeta-etiqueta">Ingresos brutos</p>
                <p className="rk-adm-tarjeta-valor">
                  {money(stats.revenue.gross)}
                </p>
              </div>
              <div className="rk-adm-tarjeta-abajo">
                <span>•••• {stats.revenue.unitsSold} vendidos</span>
                <span>{vence}</span>
              </div>
            </div>
          </div>

          <Link href="/admin/retiros" className="rk-adm-pildora is-linea">
            <Wallet size={14} aria-hidden />
            Retiros pendientes · {money(stats.withdrawals.pendingAmount)}
          </Link>

          {/* Creadores con más ventas, en círculos */}
          <section className="rk-card rk-adm-rapidos">
            <h2 className="rk-adm-card-titulo">Creadores destacados</h2>
            <div className="rk-adm-rapidos-fila">
              <Link
                href="/admin/usuarios/nuevo"
                className="rk-adm-avatar is-mas"
                aria-label="Crear creador"
              >
                <Plus size={16} aria-hidden />
              </Link>
              {stats.creators.byVolume.slice(0, 6).map((c, i) => (
                <span
                  key={c.id}
                  className={`rk-adm-avatar is-tono-${i % 4}`}
                  title={`${c.name} · ${c.sales} ventas`}
                >
                  {c.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          </section>

          {/* Últimas ventas */}
          <section className="rk-adm-ventas">
            <h2 className="rk-adm-card-titulo">Últimas ventas</h2>
            {stats.recentSales.length === 0 ? (
              <p className="rk-adm-vacio">Todavía no hay ventas registradas.</p>
            ) : (
              <ul>
                {stats.recentSales.slice(0, 5).map((sale) => (
                  <li key={sale.id}>
                    <Link href={`/tienda/${sale.productSlug}`}>
                      <span aria-hidden className="rk-adm-venta-icono">
                        {sale.productName.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="rk-adm-venta-nombre">
                          {sale.productName}
                        </span>
                        <span className="rk-adm-venta-sub">
                          {sale.buyer} · {shortDate(sale.createdAt)}
                        </span>
                      </span>
                      <span className="rk-adm-venta-monto">
                        +{money(sale.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

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
