"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string | number;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  rejectionReason: string | null;
  accessType: "INDIVIDUAL" | "PLAN" | "BOTH";
  coverUrl: string | null;
  previewUrl: string | null;
  fileUrl: string | null;
  category: {
    name: string;
  } | null;
  createdAt: string;
};

const statusInfo: Record<
  Product["status"],
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Borrador",
    className: "bg-ink/[0.05] text-ink/70",
  },
  PENDING_REVIEW: {
    label: "Pendiente de revisión",
    className: "bg-warning/12 text-warning",
  },
  PUBLISHED: {
    label: "Publicado",
    className: "bg-success/12 text-success",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-danger/10 text-danger",
  },
  ARCHIVED: {
    label: "Archivado",
    className: "bg-ink/[0.09] text-ink/60",
  },
};

const accessLabels: Record<Product["accessType"], string> = {
  INDIVIDUAL: "Compra individual",
  PLAN: "Solo planes",
  BOTH: "Compra + planes",
};

export default function RecursosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

    cargarRecursos();
  }, []);

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.15em] text-ink/40">
            Creator Studio
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                Mis recursos
              </h1>

              <p className="mt-2 text-ink/50">
                Administra los recursos que has creado.
              </p>
            </div>

            <Link
              href="/creadores/panel"
              className="inline-flex w-fit items-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
            >
              Volver al panel
            </Link>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        {!loading && !error && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rk-card p-6">
              <p className="text-sm text-ink/45">
                Total de recursos
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {products.length}
              </p>
            </div>

            <div className="rk-card p-6">
              <p className="text-sm text-ink/45">
                Publicados
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {
                  products.filter(
                    (product) => product.status === "PUBLISHED"
                  ).length
                }
              </p>
            </div>

            <div className="rk-card p-6">
              <p className="text-sm text-ink/45">
                Pendientes
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {
                  products.filter(
                    (product) =>
                      product.status === "PENDING_REVIEW"
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* CARGANDO */}
        {loading && (
          <div className="rk-card p-10">
            <p className="text-ink/50">
              Cargando recursos...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-3xl border border-danger/25 bg-danger/10 p-6">
            <p className="font-medium text-danger">
              No se pudieron cargar los recursos
            </p>

            <p className="mt-2 text-sm text-danger">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* SIN RECURSOS */}
        {!loading && !error && products.length === 0 && (
          <div className="rk-card p-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold">
                Aún no tienes recursos
              </h2>

              <p className="mt-3 text-ink/50">
                Cuando crees tu primer recurso aparecerá
                automáticamente aquí.
              </p>

              <Link
                href="/creadores/panel"
                className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary"
              >
                Ir al panel
              </Link>
            </div>
          </div>
        )}

        {/* LISTA DE RECURSOS */}
        {!loading && !error && products.length > 0 && (
          <div className="space-y-4">
            {products.map((product) => {
              const status = statusInfo[product.status];

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rk-card"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      {/* INFORMACIÓN */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold">
                            {product.name}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/45">
                          <span>
                            Categoría:{" "}
                            {product.category?.name ||
                              "Sin categoría"}
                          </span>

                          <span>
                            {accessLabels[product.accessType]}
                          </span>
                        </div>

                        {product.description && (
                          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">
                            {product.description}
                          </p>
                        )}

                        {product.status === "REJECTED" && product.rejectionReason && (
                          <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 p-4">
                            <p className="text-sm font-semibold text-danger">
                              Recurso rechazado
                            </p>

                            <p className="mt-1 text-sm leading-6 text-danger">
                              <span className="font-medium">Motivo:</span>{" "}
                              {product.rejectionReason}
                            </p>
                          </div>
                        )}
                        <p className="mt-4 text-xs text-ink/35">
                          Creado el{" "}
                          {new Date(
                            product.createdAt
                          ).toLocaleDateString("es-PE")}
                        </p>
                      </div>

                      {/* PRECIO */}
                      <div className="shrink-0 lg:min-w-[180px] lg:text-right">
                        <p className="text-2xl font-semibold">
                          S/{" "}
                          {Number(product.price).toFixed(2)}
                        </p>

                        <p className="mt-1 text-xs text-ink/40">
                          Precio del recurso
                        </p>
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-ink/[0.07] pt-5">

                      <Link
                        href={`/creadores/productos/${product.id}`}
                        className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-medium transition hover:bg-ink/[0.06]"
                      >
                        Gestionar
                      </Link>

                      <Link
                        href={`/creadores/productos/${product.id}/estadisticas`}
                        className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-medium transition hover:bg-ink/[0.06]"
                      >
                        Estadísticas
                      </Link>

                      {(product.status === "DRAFT" ||
                        product.status === "REJECTED") && (
                          <Link
                            href={`/creadores/productos/${product.id}/editar`}
                            className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-medium transition hover:bg-ink/[0.06]"
                          >
                            Editar recurso
                          </Link>
                        )}

                      {product.status === "DRAFT" && (
                        <button
                          type="button"
                          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                          onClick={async () => {
                            try {
                              const confirmed = window.confirm(
                                "¿Deseas enviar este recurso a revisión?"
                              );

                              if (!confirmed) return;

                              const response = await fetch(
                                `/api/creadores/productos/${product.id}/enviar-revision`,
                                {
                                  method: "POST",
                                }
                              );

                              if (!response.ok) {
                                let message =
                                  "No se pudo enviar el recurso a revisión.";

                                try {
                                  const data = await response.json();
                                  message = data.error || message;
                                } catch {
                                  // El endpoint puede responder con redirección.
                                }

                                throw new Error(message);
                              }

                              alert(
                                "Recurso enviado a revisión correctamente."
                              );

                              window.location.reload();
                            } catch (error) {
                              console.error(
                                "ERROR ENVIANDO A REVISIÓN:",
                                error
                              );

                              alert(
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo enviar el recurso a revisión."
                              );
                            }
                          }}
                        >
                          Enviar a revisión
                        </button>
                      )}

                      {product.status === "PUBLISHED" && (
                        <Link
                          href={`/tienda/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                        >
                          Ver publicación
                        </Link>
                      )}

                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}