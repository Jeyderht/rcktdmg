"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Download as DownloadIcon,
  Receipt,
} from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import QuickAccess from "@/components/QuickAccess";
import RecomendadosCliente from "@/components/RecomendadosCliente";
import ThemeToggle from "@/components/ThemeToggle";
import { useSessionUser } from "@/components/useSessionUser";
import { claseProporcion } from "@/lib/tipos-publicacion";

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
    };
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

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

  const paidOrders = orders.filter(
    (order) => order.status === "PAID"
  );

  const activeDownloads = downloads.filter(
    (download) =>
      download.status === "ACTIVE" &&
      download.order.status === "PAID"
  );

  const displayName = user?.publicName || user?.name || "";

  const initial = (displayName || user?.email || "R")
    .charAt(0)
    .toUpperCase();

  // Contadores reales: salen de los mismos registros que
  // luego se listan. No hay metricas estimadas.
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">

        {/* ========== CABECERA ========== */}
        <section className="rk-fade-up relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-ink/[0.05] blur-[90px]"
          />

          <p className="rk-eyebrow">RCKTDMG</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Mi cuenta
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Gestiona tus compras, recursos y actividad.
          </p>
        </section>

        {/* ========== IDENTIDAD ========== */}
        <section className="rk-fade-up rk-enter-1 mt-6">
          <div className="rk-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="rk-media relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-rk-md text-lg font-semibold text-ink/70 sm:h-16 sm:w-16 sm:text-xl">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName || "Avatar"}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  initial
                )}
              </span>

              <div className="min-w-0">
                {/* Solo datos reales de la sesion. */}
                {displayName && (
                  <p className="truncate text-[17px] font-semibold leading-tight">
                    {displayName}
                  </p>
                )}

                {user?.email && (
                  <p className="mt-1 truncate text-sm text-ink/60">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {user && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="rk-badge rk-badge-accent">
                  {ROLE_LABEL[user.role] || user.role}
                </span>

                {user.isVerified && (
                  <span className="rk-badge rk-badge-success">
                    <BadgeCheck size={13} />
                    Verificado
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ========== ERROR ========== */}
        {error && (
          <div
            role="alert"
            className="rk-fade mt-4 rounded-rk-md border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger"
          >
            {error}
          </div>
        )}

        {/* ========== RESUMEN REAL ========== */}
        <section className="rk-fade-up rk-enter-2 mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.href}
                href={stat.href}
                className="rk-card rk-card-hover rk-press group flex items-center justify-between gap-4 p-4 sm:p-5"
              >
                <div className="min-w-0">
                  <p className="rk-eyebrow">{stat.label}</p>

                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                    {loading ? (
                      <span className="inline-block h-8 w-10 animate-pulse rounded-full bg-ink/[0.07] align-middle" />
                    ) : (
                      stat.value
                    )}
                  </p>

                  <p className="mt-1 text-sm text-ink/60">
                    {stat.hint}
                  </p>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink transition-transform duration-normal ease-rk group-hover:scale-110">
                  <Icon size={19} />
                </span>
              </Link>
            );
          })}
        </section>

        {/* ========== ACCESOS RAPIDOS (POR ROL) ========== */}
        <QuickAccess user={user} />

        {/* Recomendaciones: personales si hay historial real. */}
        <RecomendadosCliente />

        {/* ========== ACTIVIDAD ========== */}
        <section className="rk-fade-up rk-enter-4 mt-10 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Tu actividad</p>

              <h2 className="rk-title mt-2 text-2xl">
                Últimas compras
              </h2>
            </div>

            {paidOrders.length > 0 && (
              <Link
                href="/mi-cuenta/compras"
                className="rk-press inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-75"
              >
                Ver todas
                <ArrowRight size={15} />
              </Link>
            )}
          </div>

          <div className="rk-divider mt-4" />

          {loading ? (
            <div className="mt-5 space-y-2.5" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rk-card flex items-center gap-4 p-3"
                >
                  <div className="rk-aspect-product w-12 shrink-0 animate-pulse rounded-rk-sm bg-ink/[0.06]" />

                  <div className="min-w-0 flex-1">
                    <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-ink/[0.06]" />
                    <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : paidOrders.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={Receipt}
                title="Todavía no tienes compras"
                description="Explora el marketplace y descarga tu primer recurso."
                action={{ href: "/tienda", label: "Explorar recursos" }}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {paidOrders.slice(0, 4).map((order) => {
                const cover = order.items[0]?.product.coverUrl;

                return (
                  <Link
                    key={order.id}
                    href="/mi-cuenta/compras"
                    className="rk-card rk-card-hover rk-press-sm flex items-center gap-4 p-3"
                  >
                    {/* Miniatura 9:16, siempre nitida. */}
                    <div
                      className={`rk-media ${claseProporcion(
                        order.items[0]?.product.pieceType as never
                      )} relative w-12 shrink-0 overflow-hidden rounded-rk-sm`}
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt={order.items[0].product.name}
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
                      <p className="truncate text-sm font-medium">
                        {order.items[0]?.product.name || "Pedido"}

                        {order.items.length > 1 && (
                          <span className="text-ink/60">
                            {" "}
                            y {order.items.length - 1} más
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-ink/60">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        S/ {Number(order.total).toFixed(2)}
                      </p>

                      <span className="rk-badge rk-badge-success mt-1">
                        Pagado
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ========== APARIENCIA ========== */}
        <section className="rk-fade-up mt-10 sm:mt-12">
          <div className="rk-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="rk-eyebrow">Apariencia</p>

                <p className="mt-1.5 text-sm text-ink/60">
                  Elige el tema de la interfaz.
                </p>
              </div>

              <div className="w-full sm:w-auto sm:min-w-[19rem]">
                <ThemeToggle variant="full" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
