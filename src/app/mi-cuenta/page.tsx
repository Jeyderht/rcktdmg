"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Footer from "@/components/layout/Footer";
import AnilloAdmin from "@/components/admin/AnilloAdmin";
import CifraAnimada from "@/components/admin/CifraAnimada";
import ListaAdmin from "@/components/admin/ListaAdmin";
import RevelarAlScroll from "@/components/admin/RevelarAlScroll";
import QuickAccess from "@/components/cuenta/QuickAccess";
import RecomendadosCliente from "@/components/cuenta/RecomendadosCliente";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useSessionUser } from "@/components/hooks/useSessionUser";
import { fechaMedia, solesMoneda } from "@/lib/formato";

type Download = {
  id: string;
  downloadCount: number;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    description: string;
    fileUrl: string | null;
  };
  order: {
    id: string;
    createdAt: string;
    status: string;
  };
};

type Order = {
  id: string;
  total: number | string;
  status: string;
  createdAt: string;
  items: {
    id: string;
    product: {
      id: string;
      name: string;
      slug: string;
      coverUrl: string | null;
      /** Decide el marco de la miniatura. */
      pieceType?: string | null;
      /** Categoría del recurso: decide su proporción. */
      category?: { slug?: string | null } | null;
    };
  }[];
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  CREATOR: "Creador",
  CLIENT: "Cliente",
};

export default function Account() {
  const { user } = useSessionUser();

  const [downloads, setDownloads] = useState<Download[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        setError("");

        const [downloadsResponse, ordersResponse] =
          await Promise.all([
            fetch("/api/downloads", {
              cache: "no-store",
            }),
            fetch("/api/mis-compras", {
              cache: "no-store",
            }),
          ]);

        const downloadsData = await downloadsResponse.json();
        const ordersData = await ordersResponse.json();

        if (!downloadsResponse.ok) {
          throw new Error(
            downloadsData.error ||
              "No se pudieron cargar tus descargas."
          );
        }

        if (!ordersResponse.ok) {
          throw new Error(
            ordersData.error || "No se pudieron cargar tus compras."
          );
        }

        setDownloads(downloadsData.downloads || []);
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar tu cuenta."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  const paidOrders = orders.filter((order) => order.status === "PAID");

  const activeDownloads = downloads.filter(
    (download) =>
      download.status === "ACTIVE" && download.order.status === "PAID"
  );

  const displayName = user?.publicName || user?.name || "";

  const ahora = new Date();
  const mes = new Intl.DateTimeFormat("es-PE", { month: "long" }).format(ahora);
  const mesActual = `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${ahora.getFullYear()}`;

  /* Todo sale de los mismos registros que se listan debajo:
     no hay métricas estimadas. */
  const totalGastado = paidOrders.reduce(
    (suma, order) => suma + Number(order.total),
    0
  );

  const contar = (estado: string) =>
    orders.filter((order) => order.status === estado).length;

  const pedidos = [
    { label: "Pagados", valor: contar("PAID") },
    { label: "Pendientes", valor: contar("PENDING") },
    { label: "Cancelados", valor: contar("CANCELED") },
    { label: "Reembolsados", valor: contar("REFUNDED") },
  ];

  const totalDescargas = activeDownloads.reduce(
    (suma, d) => suma + d.downloadCount,
    0
  );

  return (
    <>
      {/* rk-dash: mismo contenedor y mismas tarjetas que el Dashboard
          de administración; su CSS va limitado a este contenedor. */}
      <div className="rk-dash">
        <RevelarAlScroll />

        <div data-vista="Dashboard">
          <header className="rk-vh">
            <h1 className="rk-title">Mi cuenta</h1>
            <p>
              Bienvenido{displayName ? `, ${displayName}` : ""} · {mesActual}
              {user ? ` · ${ROLE_LABEL[user.role] || user.role}` : ""}
            </p>
          </header>

          {error && (
            <div role="alert" className="rk-upload-error rk-fade mt-4">
              {error}
            </div>
          )}

          <div className="rk-db">
            {/* MI CUENTA · lo invertido y sus accesos */}
            <section className="rk-card rk-pl" aria-label="Mis compras">
              <div className="rk-pl-top">
                <div className="rk-pl-h">
                  <h3>Mis compras</h3>
                </div>
                <p className="rk-db-mut" style={{ margin: "14px 0 0" }}>
                  Total invertido
                </p>
                <p className="rk-pl-monto">
                  <CifraAnimada texto={loading ? "—" : solesMoneda(totalGastado)} />
                </p>
                <div className="rk-pl-tarjeta" aria-hidden="true">
                  <span className="rk-isotipo rk-pl-iso" />
                  <span className="rk-pl-num">
                    •••• {loading ? "—" : paidOrders.length} compras
                  </span>
                </div>
              </div>

              <div className="rk-pl-hoja">
                <div className="rk-pl-acc">
                  <div className="rk-pl-it">
                    <span className="rk-pl-ic">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </span>
                    <span className="rk-pl-et">Compras</span>
                    <b><CifraAnimada texto={loading ? "—" : String(paidOrders.length)} /></b>
                  </div>

                  <div className="rk-pl-it">
                    <span className="rk-pl-ic">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    </span>
                    <span className="rk-pl-et">Descargas</span>
                    <b><CifraAnimada texto={loading ? "—" : String(activeDownloads.length)} /></b>
                  </div>
                </div>

                <div className="rk-pl-ret">
                  <div>
                    <span className="rk-db-mut">Descargas realizadas</span>
                    <b><CifraAnimada texto={loading ? "—" : String(totalDescargas)} /></b>
                  </div>
                  <Link className="rk-btn rk-btn-ink rk-btn-compact" href="/mi-cuenta/descargas">
                    Ver
                  </Link>
                </div>
              </div>
            </section>

            {/* PEDIDOS · anillo por estado, igual que en administración */}
            <AnilloAdmin
              titulo="Pedidos"
              unidad="pedidos"
              partes={pedidos}
              vacio="Sin pedidos"
              cargando={loading}
            />

            {/* LISTAS · datos reales; vacías, el estado del encargo */}
            <ListaAdmin
              titulo="Últimas compras"
              icono="venta"
              filas={paidOrders.slice(0, 5).map((order) => ({
                id: order.id,
                titulo: order.items[0]?.product.name || "Pedido",
                subtitulo:
                  fechaMedia(order.createdAt) +
                  (order.items.length > 1
                    ? ` · y ${order.items.length - 1} más`
                    : ""),
                valor: solesMoneda(Number(order.total)),
                href: "/mi-cuenta/compras",
              }))}
            />

            <ListaAdmin
              titulo="Mis descargas"
              icono="recurso"
              filas={activeDownloads.slice(0, 5).map((d) => ({
                id: d.id,
                titulo: d.product.name,
                subtitulo: fechaMedia(d.order.createdAt),
                valor: String(d.downloadCount),
                href: "/mi-cuenta/descargas",
              }))}
            />
          </div>

          {/* Accesos por rol y recomendaciones, bajo las tarjetas. */}
          <div className="mt-6">
            <QuickAccess user={user} />
          </div>

          <div className="mt-6">
            <RecomendadosCliente />
          </div>

          {/* APARIENCIA */}
          <div className="mt-6">
            <div className="rk-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="rk-eyebrow">Apariencia</p>
                  <p className="mt-1.5 text-sm text-ink/60">
                    Elige el tema de la interfaz.
                  </p>
                </div>

                <ThemeToggle conSistema />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
