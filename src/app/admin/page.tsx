import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { getAdminStats, ingresosPorMes } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import BalanceAdmin from "@/components/admin/BalanceAdmin";
import ComunidadAdmin from "@/components/admin/ComunidadAdmin";
import ListaAdmin from "@/components/admin/ListaAdmin";
import CifraAnimada from "@/components/admin/CifraAnimada";
import RevelarAlScroll from "@/components/admin/RevelarAlScroll";
import InicioAdminCx from "@/components/admin/InicioAdminCx";
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

export default async function Admin() {
  const [stats, ingresos] = await Promise.all([
    getAdminStats(),
    ingresosPorMes(),
  ]);

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
    // Arriba, el inicio con imágenes; debajo, el panel de siempre.
    <InicioAdminCx stats={stats} ingresos={ingresos}>
    {/* rk-dash: contenedor del Dashboard; todo su CSS va limitado a él. */}
    <div className="rk-dash rk-cx-panel">
      <RevelarAlScroll />

      <div data-vista="Dashboard">
        {/* El banner hace de cabecera visible; el h1 queda para lectores de pantalla. */}
        <header className="rk-vh sr-only">
          <h1 className="rk-title">Dashboard</h1>
          <p>
            Bienvenido, {adminName} · {mesActual}
          </p>
        </header>

        {/* INGRESOS: vistas, calendario y gráfico (BalanceAdmin) */}
        <div className="mt-4">
          <BalanceAdmin datos={ingresos} />
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
              <p className="rk-pl-monto">
                <CifraAnimada texto={money(gross)} />
              </p>
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
                  <b>
                    <CifraAnimada texto={money(platformFee)} />
                  </b>
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
                  <b>
                    <CifraAnimada texto={money(creatorAmount)} />
                  </b>
                </div>
              </div>

              <div className="rk-pl-ret">
                <div>
                  <span className="rk-db-mut">Retiros pendientes</span>
                  <b>
                    <CifraAnimada
                      texto={money(stats.withdrawals.pendingAmount)}
                    />
                  </b>
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
                  <b>
                    <CifraAnimada texto={String(totalPedidos)} />
                  </b>
                  <span>pedidos</span>
                </div>
              </div>
              <ul className="rk-k2-ley">
                {pedidos.map((p, i) => (
                  <li key={p.label}>
                    <i data-c={i + 1} />
                    {p.label}
                    <b>
                      <CifraAnimada texto={String(p.valor)} />
                    </b>
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

          {/* COMUNIDAD · usuarios y creadores en pestañas */}
          <ComunidadAdmin
            usuarios={{
              total: stats.users.total,
              clients: stats.users.clients,
              admins: stats.users.admins,
              newByMonth: stats.users.newByMonth,
            }}
            creadores={{
              approved: stats.creators.approved,
              pending: stats.creators.pending,
              suspended: stats.creators.suspended,
              rejected: stats.creators.rejected,
            }}
          />

          {/* LISTAS · datos reales; vacías, el estado del encargo */}
          <ListaAdmin
            titulo="Recursos más vendidos"
            icono="recurso"
            filas={stats.products.bestSellers.slice(0, 5).map((p) => ({
              id: p.id,
              titulo: p.name,
              subtitulo: money(p.revenue),
              valor: String(p.sales),
              href: `/tienda/${p.slug}`,
            }))}
          />

          <ListaAdmin
            titulo="Creadores con mayor volumen"
            icono="creador"
            filas={stats.creators.byVolume.slice(0, 5).map((c) => ({
              id: c.id,
              titulo: c.name,
              subtitulo: money(c.revenue),
              valor: String(c.sales),
            }))}
          />

          <ListaAdmin
            titulo="Últimas ventas"
            icono="venta"
            filas={stats.recentSales.slice(0, 5).map((v) => ({
              id: v.id,
              titulo: v.productName,
              subtitulo: `${v.buyer} · ${shortDate(v.createdAt)}`,
              valor: `+${money(v.amount)}`,
              href: `/tienda/${v.productSlug}`,
            }))}
          />

          {/* Las ventas ya tienen su lista: aquí no se repiten. */}
          <ListaAdmin
            titulo="Actividad reciente"
            icono="actividad"
            filas={stats.activity
              .filter((a) => a.title !== "Nueva venta")
              .slice(0, 10)
              .map((a) => ({
                id: a.id,
                titulo: a.title,
                subtitulo: a.description,
                valor: timeAgo(a.createdAt),
              }))}
          />
        </div>
      </div>

    </div>
    </InicioAdminCx>
  );
}
