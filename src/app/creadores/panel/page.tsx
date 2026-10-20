"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Footer from "@/components/layout/Footer";
import AnilloAdmin from "@/components/admin/AnilloAdmin";
import BalanceAdmin from "@/components/admin/BalanceAdmin";
import CifraAnimada from "@/components/admin/CifraAnimada";
import ListaAdmin from "@/components/admin/ListaAdmin";
import RevelarAlScroll from "@/components/admin/RevelarAlScroll";
import { useSessionUser } from "@/components/hooks/useSessionUser";
import { solesMoneda, fechaMesCorto } from "@/lib/formato";
import type { IngresoMes } from "@/lib/admin-stats";

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
    followers: number;
    reviews: number;
    /** Media de sus reseñas publicadas. null si no tiene. */
    rating: number | null;
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
    /** Decide el marco de la miniatura. */
    pieceType?: string | null;
    /** Categoría del recurso: decide su proporción. */
    categorySlug?: string | null;
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
const CREATOR_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Creador aprobado",
  SUSPENDED: "Cuenta suspendida",
  REJECTED: "Solicitud rechazada",
};

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
            className="rk-btn rk-btn-primary mt-5 rk-btn-compact"
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

  const creatorStatus = user?.creatorStatus ?? null;

  const ahora = new Date();
  const mes = new Intl.DateTimeFormat("es-PE", { month: "long" }).format(ahora);
  const mesActual = `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${ahora.getFullYear()}`;

  /* Cifras de ganancias: las mismas del endpoint, sin recalcular. */
  const bruto = Number(earnings?.summary.grossRevenue) || 0;
  const tuyo = Number(earnings?.summary.creatorEarnings) || 0;
  const comision = Number(earnings?.summary.platformFees) || 0;
  const pct = (parte: number) =>
    bruto > 0 ? `${Math.round((parte / bruto) * 100)}%` : "";

  /* El gráfico de Ingresos del admin, con los meses de este creador:
     [bruto, comisión, lo suyo] por «AAAA-MM». */
  const ingresos: Record<string, IngresoMes> = {};
  for (const m of earnings?.monthlyEarnings ?? []) {
    ingresos[m.month] = [
      Number(m.grossRevenue) || 0,
      Number(m.platformFees) || 0,
      Number(m.creatorEarnings) || 0,
    ];
  }

  const recursos = [
    { label: "Publicados", valor: stats.publishedResources },
    { label: "Pendientes", valor: stats.pendingResources },
    { label: "Borradores", valor: stats.draftResources },
    { label: "Rechazados", valor: stats.rejectedResources },
    { label: "Archivados", valor: stats.archivedResources },
  ];

  const actividad = [
    { label: "Ventas", valor: stats.sales },
    { label: "Descargas", valor: stats.downloads },
    { label: "Favoritos", valor: stats.favorites },
    { label: "Seguidores", valor: stats.followers },
    {
      label: stats.rating !== null
        ? `Valoraciones · ${stats.rating.toFixed(1).replace(".", ",")}/5`
        : "Valoraciones",
      valor: stats.reviews,
    },
  ];

  return (
    <>
      {/* rk-dash: mismo contenedor y mismas tarjetas que el Dashboard
          de administración; su CSS va limitado a este contenedor. */}
      <div className="rk-dash">
        <RevelarAlScroll />

        <div data-vista="Dashboard">
          <header className="rk-vh">
            <h1 className="rk-title">Creator Studio</h1>
            <p>
              Bienvenido, {displayName} · {mesActual}
              {creatorStatus
                ? ` · ${CREATOR_STATUS_LABEL[creatorStatus] || creatorStatus}`
                : ""}
            </p>
          </header>

          <div className="rk-db-ancho mt-4 flex flex-wrap items-center gap-2.5">
            <Link href="/creadores/panel/nuevo" className="rk-btn rk-btn-primary rk-btn-compact">
              Nuevo recurso
            </Link>

            {user?.username && (
              <Link href={`/creadores/${user.username}`} className="rk-btn rk-btn-line rk-btn-compact">
                Ver mi perfil público
              </Link>
            )}
          </div>

          {/* El perfil público no existe hasta que elige su usuario:
              no se inventa uno por él. */}
          {!user?.username && (
            <div className="rk-db-ancho rk-card mt-4 border-warning/30 bg-warning/[0.06] p-4">
              <p className="text-sm font-medium">Tu perfil público todavía no existe</p>
              <p className="mt-1 text-[13px] leading-6 text-ink/65">
                Necesitas un nombre de usuario para tener una dirección
                pública donde se vean tus recursos.
              </p>
              <Link href="/creadores/panel/perfil" className="rk-btn rk-btn-ink mt-3">
                Elegir mi nombre de usuario
              </Link>
            </div>
          )}

          {/* INGRESOS: el mismo gráfico del admin */}
          <div id="ganancias" className="mt-4 scroll-mt-24">
            <BalanceAdmin
              datos={ingresos}
              etiquetas={["Ventas", "Comisión", "Para ti"]}
              vistaInicial={2}
            />
          </div>

          <div className="rk-db">
            {/* MIS GANANCIAS */}
            <section className="rk-card rk-pl" aria-label="Mis ganancias">
              <div className="rk-pl-top">
                <div className="rk-pl-h">
                  <h3>Mis ganancias</h3>
                </div>
                <p className="rk-db-mut" style={{ margin: "14px 0 0" }}>
                  Ventas brutas
                </p>
                <p className="rk-pl-monto">
                  <CifraAnimada texto={solesMoneda(bruto)} />
                </p>
                <div className="rk-pl-tarjeta" aria-hidden="true">
                  <span className="rk-isotipo rk-pl-iso" />
                  <span className="rk-pl-num">
                    •••• {earnings?.summary.totalSales ?? stats.sales} vendidos
                  </span>
                </div>
              </div>

              <div className="rk-pl-hoja">
                <div className="rk-pl-acc">
                  <div className="rk-pl-it">
                    <span className="rk-pl-ic">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </span>
                    <span className="rk-pl-et">Para ti {pct(tuyo)}</span>
                    <b><CifraAnimada texto={solesMoneda(tuyo)} /></b>
                  </div>

                  <div className="rk-pl-it">
                    <span className="rk-pl-ic">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" />
                      </svg>
                    </span>
                    <span className="rk-pl-et">Plataforma {pct(comision)}</span>
                    <b><CifraAnimada texto={solesMoneda(comision)} /></b>
                  </div>
                </div>

                <div className="rk-pl-ret">
                  {/* Lo ganado desde el principio. El saldo que se puede
                      retirar (menos lo ya retirado o pedido) lo calcula
                      la página de retiros. */}
                  <div>
                    <span className="rk-db-mut">Ganado en total</span>
                    <b><CifraAnimada texto={solesMoneda(tuyo)} /></b>
                  </div>
                  <Link className="rk-btn rk-btn-ink rk-btn-compact" href="/creadores/panel/retiros">
                    Retirar
                  </Link>
                </div>
              </div>
            </section>

            {/* RECURSOS · anillo por estado */}
            <AnilloAdmin
              titulo="Recursos"
              unidad="recursos"
              partes={recursos}
              vacio="Sin recursos"
            />

            {/* ACTIVIDAD · cifras reales del catálogo */}
            <section className="rk-card rk-k2c" aria-label="Actividad">
              <div className="rk-k2-h">
                <h3>Actividad</h3>
                <Link className="rk-k2-a" href="/creadores/panel/recursos">
                  Ver recursos
                </Link>
              </div>
              <div className="rk-k2-g">
                {actividad.map((r, i) => (
                  <div
                    key={r.label}
                    className={`rk-k2${i === actividad.length - 1 ? " rk-k2-ancho" : ""}`}
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

            {/* LISTAS · datos reales; vacías, el estado del encargo */}
            <ListaAdmin
              titulo="Recursos más vendidos"
              icono="recurso"
              filas={data.topProducts.slice(0, 5).map((p) => ({
                id: p.productId,
                titulo: p.productName,
                subtitulo: solesMoneda(p.revenue),
                valor: String(p.sales),
                href: `/tienda/${p.productSlug}`,
              }))}
            />

            <ListaAdmin
              titulo="Últimas ventas"
              icono="venta"
              filas={(earnings?.recentEarnings ?? []).slice(0, 5).map((e) => ({
                id: e.id,
                titulo: e.productName,
                subtitulo: `${e.buyerName} · ${fechaMesCorto(e.createdAt)}`,
                valor: `+${solesMoneda(e.creatorAmount)}`,
              }))}
            />

            <ListaAdmin
              titulo="Mis recursos recientes"
              icono="actividad"
              filas={data.recentProducts.slice(0, 5).map((p) => ({
                id: p.id,
                titulo: p.name,
                subtitulo: `${getStatusLabel(p.status)} · ${fechaMesCorto(p.createdAt)}`,
                valor: solesMoneda(p.price),
                href: p.status === "PUBLISHED" ? `/tienda/${p.slug}` : "/creadores/panel/recursos",
              }))}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
