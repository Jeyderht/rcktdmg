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
      /** Categoría del recurso: decide su proporción. */
      category?: { slug?: string | null } | null;
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">

        {/* ========== PERFIL ========== */}
        <section className="rk-fade-up">
          <p className="rk-eyebrow mb-5">Mi cuenta</p>

          <div className="rk-profile">
            <div className="rk-profile-avatar">
              <span
                className="rk-profile-initials"
                style={{ position: "relative", overflow: "hidden" }}
              >
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName || "Avatar"}
                    fill
                    className="object-cover"
                    sizes="92px"
                  />
                ) : (
                  initial
                )}
              </span>
            </div>

            <div className="min-w-0">
              {/* Solo datos reales de la sesión. */}
              <h1 className="rk-profile-name">{displayName || "Mi cuenta"}</h1>

              <div className="rk-profile-meta">
                {user && (
                  <span className="rk-badge rk-badge-accent rk-badge-dot">
                    {ROLE_LABEL[user.role] || user.role}
                  </span>
                )}

                {user?.isVerified && (
                  <span className="rk-badge rk-badge-success">
                    <BadgeCheck size={13} />
                    Verificado
                  </span>
                )}

                {user?.email && (
                  <span className="min-w-0 truncate">{user.email}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========== ERROR ========== */}
        {error && (
          <div
            role="alert"
            className="rk-upload-error rk-fade mt-6"
          >
            {error}
          </div>
        )}

        {/* ========== RESUMEN REAL ========== */}
        <section className="rk-fade-up rk-enter-2 rk-stats mt-8">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.href}
                href={stat.href}
                className="rk-stat rk-stat-iris"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <div className="rk-stat-main">
                  <div className="rk-stat-head">
                    <p className="rk-stat-label">{stat.label}</p>

                    <p className="rk-stat-value">
                      {loading ? (
                        <span
                          className="rk-skeleton"
                          style={{ display: "inline-block", width: 40, height: 28, borderRadius: 999 }}
                        />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                </div>

                <div className="rk-stat-foot">
                  <span>{stat.hint}</span>

                  <span aria-hidden className="rk-stat-chip">
                    <Icon size={15} />
                  </span>
                </div>
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
                className="rk-btn rk-btn-line"
              >
                Ver todas
                <ArrowRight size={15} />
              </Link>
            )}
          </div>

          <div className="rk-divider mt-4" />

          {loading ? (
            <div className="mt-5 grid gap-2.5" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div key={index} className="rk-skeleton" style={{ height: 76, borderRadius: 22 }} />
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
            <ul className="rk-row-list mt-5">
              {paidOrders.slice(0, 4).map((order) => {
                const cover = order.items[0]?.product.coverUrl;

                return (
                  <li key={order.id}>
                    <Link href="/mi-cuenta/compras" className="rk-row-card">
                      <div className="rk-row-card-head" style={{ alignItems: "center" }}>
                        {/* Miniatura con la proporción real del recurso */}
                        <span
                          className={`rk-media ${claseProporcion({
                            categoriaSlug: order.items[0]?.product.category?.slug,
                            pieceType: order.items[0]?.product.pieceType as never,
                          })} rk-row-card-thumb`}
                        >
                          {cover && (
                            <Image
                              src={cover}
                              alt={order.items[0].product.name}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="rk-row-card-title">
                            {order.items[0]?.product.name || "Pedido"}
                          </p>

                          <p className="rk-row-card-sub">
                            {formatDate(order.createdAt)}
                            {order.items.length > 1 &&
                              ` · y ${order.items.length - 1} más`}
                          </p>
                        </div>

                        <div className="rk-row-card-side">
                          <p className="rk-row-card-amount">
                            S/ {Number(order.total).toFixed(2)}
                          </p>

                          <span className="rk-badge rk-badge-success">
                            Pagado
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
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
