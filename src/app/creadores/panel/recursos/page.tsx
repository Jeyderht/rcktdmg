"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Package, Plus, Send } from "lucide-react";

import {
  claseProporcion,
  type TipoPieza,
} from "@/lib/tipos-publicacion";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string | number;
  status:
    | "DRAFT"
    | "PENDING_REVIEW"
    | "PUBLISHED"
    | "REJECTED"
    | "ARCHIVED";
  rejectionReason: string | null;
  accessType: "INDIVIDUAL" | "PLAN" | "BOTH";
  coverUrl: string | null;
  /** Con ella se elige el marco: 9:16 solo si es una story. */
  pieceType: TipoPieza | null;
  previewUrl: string | null;
  category: {
    name: string;
  } | null;
  createdAt: string;
};

/**
 * Tratamiento visual por estado.
 *
 * Es sutil a propósito: un borde y un badge, nada de fondos
 * saturados. Los estados no cambian, solo cómo se leen.
 */
const statusInfo: Record<
  Product["status"],
  { label: string; badge: string; edge: string }
> = {
  DRAFT: {
    label: "Borrador",
    badge: "rk-badge-neutral",
    edge: "",
  },
  PENDING_REVIEW: {
    label: "Pendiente de revisión",
    badge: "rk-badge-warning",
    edge: "!border-warning/30",
  },
  PUBLISHED: {
    label: "Publicado",
    badge: "rk-badge-success",
    edge: "!border-success/25",
  },
  REJECTED: {
    label: "Rechazado",
    badge: "rk-badge-danger",
    edge: "!border-danger/30",
  },
  ARCHIVED: {
    label: "Archivado",
    badge: "rk-badge-neutral",
    edge: "",
  },
};

const accessLabels: Record<Product["accessType"], string> = {
  INDIVIDUAL: "Compra individual",
  PLAN: "Solo planes",
  BOTH: "Compra + planes",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function RecursosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function cargarRecursos() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/creadores/productos/mis-recursos",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los recursos."
        );
      }

      setProducts(data.products || []);
    } catch (err) {
      console.error("ERROR CARGANDO RECURSOS:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los recursos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarRecursos();
  }, []);

  // Misma llamada y mismas confirmaciones que antes.
  async function enviarARevision(productId: string) {
    const confirmed = window.confirm(
      "¿Deseas enviar este recurso a revisión?"
    );

    if (!confirmed) return;

    try {
      setSendingId(productId);

      const response = await fetch(
        `/api/creadores/productos/${productId}/enviar-revision`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        let message = "No se pudo enviar el recurso a revisión.";

        try {
          const data = await response.json();
          message = data.error || message;
        } catch {
          // El endpoint puede responder con redirección.
        }

        throw new Error(message);
      }

      await cargarRecursos();
    } catch (error) {
      console.error("ERROR ENVIANDO A REVISIÓN:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el recurso a revisión."
      );
    } finally {
      setSendingId(null);
    }
  }

  const published = products.filter(
    (product) => product.status === "PUBLISHED"
  ).length;

  const pending = products.filter(
    (product) => product.status === "PENDING_REVIEW"
  ).length;

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="rk-eyebrow">Creator Studio</p>

            <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
              Mis recursos
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
              Administra el catálogo que has creado.
            </p>
          </div>

          <Link
            href="/creadores/panel/nuevo"
            className="rk-btn rk-btn-primary shrink-0"
          >
            <Plus size={16} />
            Nuevo recurso
          </Link>
        </header>

        {/* ========== RESUMEN REAL ========== */}
        {!loading && !error && products.length > 0 && (
          <section className="rk-fade-up rk-enter-1 mt-7 grid grid-cols-3 gap-2.5">
            {[
              { label: "Total", value: products.length },
              { label: "Publicados", value: published },
              { label: "Pendientes", value: pending },
            ].map((item) => (
              <div key={item.label} className="rk-card p-4">
                <p className="rk-eyebrow">{item.label}</p>

                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                  {item.value}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* ========== CARGANDO ========== */}
        {loading && (
          <div className="mt-7 space-y-3" aria-busy="true">
            {[0, 1].map((index) => (
              <div key={index} className="rk-card flex gap-4 p-4">
                <div className="rk-aspect-product w-20 shrink-0 animate-pulse rounded-rk-sm bg-ink/[0.06]" />

                <div className="min-w-0 flex-1">
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-ink/[0.06]" />
                  <div className="mt-2.5 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
                  <div className="mt-6 h-9 w-full animate-pulse rounded-full bg-ink/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== ERROR ========== */}
        {!loading && error && (
          <div
            role="alert"
            className="rk-fade mt-7 rounded-rk-md border border-danger/25 bg-danger/10 p-5"
          >
            <p className="font-medium text-danger">
              No se pudieron cargar los recursos
            </p>

            <p className="mt-1.5 text-sm text-danger">{error}</p>

            <button
              type="button"
              onClick={cargarRecursos}
              className="rk-btn rk-btn-primary mt-4 rk-btn-compact !px-4 !py-2.5 !text-sm"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* ========== SIN RECURSOS ========== */}
        {!loading && !error && products.length === 0 && (
          <div className="mt-7">
            <EmptyState
              icon={Package}
              title="Todavía no tienes recursos"
              description="Cuando crees tu primer recurso aparecerá aquí con su estado y sus acciones."
              action={{
                href: "/creadores/panel/nuevo",
                label: "Crear mi primer recurso",
              }}
            />
          </div>
        )}

        {/* ========== LISTA ========== */}
        {!loading && !error && products.length > 0 && (
          <section className="rk-fade-up rk-enter-2 mt-4 space-y-3">
            {products.map((product) => {
              const status = statusInfo[product.status];

              return (
                <article
                  key={product.id}
                  className={`rk-card p-4 sm:p-5 ${status.edge}`}
                >
                  <div className="flex gap-4">
                    {/* El marco lo decide la pieza; la imagen, nítida. */}
                    <div
                      className={`rk-media ${claseProporcion(
                        product.pieceType
                      )} relative w-20 shrink-0 overflow-hidden rounded-rk-sm sm:w-24`}
                    >
                      {product.coverUrl ? (
                        <Image
                          src={product.coverUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                          RCKTDMG
                        </span>
                      )}

                      {/* Badge de estado: vidrio sobre imagen nítida. */}
                      <span className="rk-glass-on-image absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold">
                        {status.label}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-[17px] font-semibold">
                            {product.name}
                          </h2>

                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/60">
                            <span>
                              {product.category?.name ||
                                "Sin categoría"}
                            </span>

                            <span aria-hidden>·</span>

                            <span>
                              {accessLabels[product.accessType]}
                            </span>

                            <span aria-hidden>·</span>

                            <span>
                              {formatDate(product.createdAt)}
                            </span>
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xl font-semibold tabular-nums tracking-tight">
                            S/ {Number(product.price).toFixed(2)}
                          </p>

                          <span
                            className={`rk-badge mt-1 ${status.badge}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {product.description && (
                        <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-ink/60">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* MOTIVO REAL DEL RECHAZO */}
                  {product.status === "REJECTED" &&
                    product.rejectionReason && (
                      <div className="mt-4 rounded-rk-md border border-danger/25 bg-danger/10 p-4">
                        <p className="text-sm font-semibold text-danger">
                          Recurso rechazado
                        </p>

                        <p className="mt-1 text-sm leading-6 text-danger">
                          <span className="font-medium">
                            Motivo:
                          </span>{" "}
                          {product.rejectionReason}
                        </p>
                      </div>
                    )}

                  {/* ACCIONES */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line/10 pt-4">
                    <Link
                      href={`/creadores/productos/${product.id}`}
                      className="rk-btn rk-btn-glass rk-btn-compact !px-4 !py-2 !text-[13px]"
                    >
                      Gestionar
                    </Link>

                    <Link
                      href={`/creadores/productos/${product.id}/estadisticas`}
                      className="rk-btn rk-btn-ghost rk-btn-compact !px-4 !py-2 !text-[13px]"
                    >
                      Estadísticas
                    </Link>

                    <Link
                      href={`/creadores/productos/${product.id}/imagenes`}
                      className="rk-btn rk-btn-ghost rk-btn-compact !px-4 !py-2 !text-[13px]"
                    >
                      Imágenes
                    </Link>

                    {(product.status === "DRAFT" ||
                      product.status === "REJECTED") && (
                      <Link
                        href={`/creadores/productos/${product.id}/editar`}
                        className="rk-btn rk-btn-ghost rk-btn-compact !px-4 !py-2 !text-[13px]"
                      >
                        Editar
                      </Link>
                    )}

                    {product.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => enviarARevision(product.id)}
                        disabled={sendingId === product.id}
                        className="rk-btn rk-btn-primary rk-btn-compact !px-4 !py-2 !text-[13px]"
                      >
                        <Send size={14} />
                        {sendingId === product.id
                          ? "Enviando..."
                          : "Enviar a revisión"}
                      </button>
                    )}

                    {product.status === "PUBLISHED" && (
                      <Link
                        href={`/tienda/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rk-btn rk-btn-primary rk-btn-compact !px-4 !py-2 !text-[13px]"
                      >
                        <ExternalLink size={14} />
                        Ver publicación
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
