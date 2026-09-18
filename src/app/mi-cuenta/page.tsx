"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Download as DownloadIcon,
  Receipt,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { useSessionUser } from "@/components/useSessionUser";
import ThemeToggle from "@/components/ThemeToggle";
import QuickAccess from "@/components/QuickAccess";

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
    };
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getOrderStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado",
  };

  return labels[status] || status;
}

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

  const paidOrders = orders.filter(
    (order) => order.status === "PAID"
  );

  const activeDownloads = downloads.filter(
    (download) =>
      download.status === "ACTIVE" &&
      download.order.status === "PAID"
  );

  const displayName = user?.publicName || user?.name || "";

  const stats = [
    {
      href: "/mi-cuenta/compras",
      label: "Compras",
      value: paidOrders.length,
      hint: "Pedidos pagados",
      icon: Receipt,
    },
    {
      href: "/mi-cuenta/descargas",
      label: "Descargas",
      value: activeDownloads.length,
      hint: "Recursos disponibles",
      icon: DownloadIcon,
    },
  ];


  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

        {/* ENCABEZADO */}
        <section className="rk-enter">
          <div className="rk-glass relative overflow-hidden rounded-[2rem] px-5 py-8 sm:rounded-[2.5rem] sm:px-9 sm:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/15 blur-3xl"
            />

            <div className="relative flex flex-wrap items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-primary text-2xl font-semibold text-onprimary shadow-rk">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (displayName || "R").charAt(0).toUpperCase()
                )}
              </span>

              <div className="min-w-0">
                <p className="rk-eyebrow">Mi cuenta</p>

                <h1 className="mt-1.5 truncate text-[1.75rem] font-semibold leading-tight sm:text-3xl">
                  {displayName ? `Hola, ${displayName}` : "Hola"}
                </h1>

                {user?.email && (
                  <p className="mt-1 truncate text-sm text-ink/45">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="animate-scale-in mt-4 rounded-[1.25rem] border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger"
          >
            {error}
          </div>
        )}

        {/* MÉTRICAS */}
        <section className="rk-enter rk-enter-1 mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.href}
                href={stat.href}
                className="rk-card rk-card-hover rk-press group flex items-center justify-between gap-4 p-5 sm:p-6"
              >
                <div className="min-w-0">
                  <p className="rk-eyebrow !tracking-[0.16em]">
                    {stat.label}
                  </p>

                  <p className="mt-2.5 text-3xl font-semibold tracking-tight">
                    {loading ? "—" : stat.value}
                  </p>

                  <p className="mt-1 text-sm text-ink/45">
                    {stat.hint}
                  </p>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary text-onprimary shadow-rk-sm transition-transform duration-500 ease-rk group-hover:scale-110">
                  <Icon size={19} />
                </span>
              </Link>
            );
          })}
        </section>

        {/* ACCESOS RÁPIDOS POR ROL */}
        <QuickAccess user={user} />

        {/* APARIENCIA */}
        <section className="rk-enter rk-enter-3 mt-3 sm:mt-4">
          <div className="rk-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="rk-eyebrow !tracking-[0.16em]">
                  Apariencia
                </p>

                <p className="mt-1.5 text-sm text-ink/45">
                  Elige el tema de la interfaz.
                </p>
              </div>

              <div className="w-full sm:w-auto sm:min-w-[19rem]">
                <ThemeToggle variant="full" />
              </div>
            </div>
          </div>
        </section>

        {/* ÚLTIMAS COMPRAS */}
        <section className="rk-enter rk-enter-4 mt-10 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Actividad</p>

              <h2 className="mt-2 text-2xl font-semibold">
                Últimas compras
              </h2>
            </div>

            {paidOrders.length > 0 && (
              <Link
                href="/mi-cuenta/compras"
                className="rk-btn rk-btn-glass !px-4 !py-2.5"
              >
                Ver todas
                <ArrowRight size={15} />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rk-card h-20 animate-pulse"
                />
              ))}
            </div>
          ) : paidOrders.length === 0 ? (
            <div className="rk-card mt-6 px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-ink/[0.05]">
                <Receipt size={24} className="text-ink/35" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Todavía no tienes compras
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/45">
                Explora el marketplace y descarga tu primer recurso.
              </p>

              <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
                Explorar recursos
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {paidOrders.slice(0, 4).map((order) => (
                <Link
                  key={order.id}
                  href="/mi-cuenta/compras"
                  className="rk-card rk-card-hover rk-press-sm flex items-center gap-4 p-4"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-gradient-to-br from-ink/[0.04] to-ink/[0.08]">
                    {order.items[0]?.product.coverUrl ? (
                      <img
                        src={order.items[0].product.coverUrl}
                        alt={order.items[0].product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] uppercase tracking-[0.2em] text-ink/25">
                        RK
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {order.items[0]?.product.name || "Pedido"}
                      {order.items.length > 1 && (
                        <span className="text-ink/40">
                          {" "}
                          y {order.items.length - 1} más
                        </span>
                      )}
                    </p>

                    <p className="mt-1 text-xs text-ink/45">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      S/ {Number(order.total).toFixed(2)}
                    </p>

                    <span className="mt-1 inline-flex rounded-full bg-success/12 px-2.5 py-0.5 text-[11px] font-medium text-success">
                      {getOrderStatus(order.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
