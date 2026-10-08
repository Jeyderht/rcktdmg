"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  FolderHeart,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import { claseProporcion } from "@/lib/tipos-publicacion";
import { IconoBasura } from "@/components/iconos";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  coverUrl: string | null;
  /** Decide el marco de la miniatura. */
  pieceType?: string | null;
  /** Categoría del recurso: decide su proporción. */
  category?: { slug?: string | null } | null;
  status: string;
};

type CollectionItem = {
  product: Product;
};

type Collection = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  items: CollectionItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function ColeccionesPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  async function loadCollections() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/colecciones", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar las colecciones."
        );
      }

      setCollections(data.collections || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las colecciones."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCollections();
  }, []);

  async function createCollection(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Escribe un nombre para la colección.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch("/api/colecciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo crear la colección."
        );
      }

      setCollections((current) => [data.collection, ...current]);

      setName("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la colección."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteCollection(collectionId: string) {
    const confirmed = window.confirm(
      "¿Quieres eliminar esta colección?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(collectionId);
      setError("");

      const response = await fetch("/api/colecciones", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar la colección."
        );
      }

      setCollections((current) =>
        current.filter(
          (collection) => collection.id !== collectionId
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la colección."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function updateCollection(collectionId: string) {
    const cleanName = editingName.trim();

    if (!cleanName) {
      setError("Escribe un nombre para la colección.");
      return;
    }

    try {
      setError("");

      const response = await fetch("/api/colecciones", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionId,
          name: cleanName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo editar la colección."
        );
      }

      setCollections((current) =>
        current.map((collection) =>
          collection.id === collectionId
            ? data.collection
            : collection
        )
      );

      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo editar la colección."
      );
    }
  }

  return (
    <>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
        <AccountPageHeader
          title="Colecciones"
          subtitle="Organiza tus recursos en bibliotecas propias."
        />

        {/* NUEVA COLECCIÓN */}
        <section className="rk-fade-up rk-enter-1 mt-7">
          <form
            onSubmit={createCollection}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de la colección"
              aria-label="Nombre de la nueva colección"
              maxLength={80}
              className="rk-input min-w-0 flex-1"
            />

            <button
              type="submit"
              disabled={creating}
              className="rk-btn rk-btn-primary shrink-0"
            >
              <Plus size={16} />
              {creating ? "Creando..." : "Crear colección"}
            </button>
          </form>
        </section>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="rk-upload-error rk-fade mt-4"
          >
            {error}
          </div>
        )}

        {/* CARGANDO */}
        {loading && (
          <div
            className="mt-7 grid gap-3 md:grid-cols-2"
            aria-busy="true"
          >
            {[0, 1].map((index) => (
              <div key={index} className="rk-card p-4">
                <div className="flex gap-2">
                  {[0, 1, 2].map((slot) => (
                    <div
                      key={slot}
                      className="rk-aspect-product w-1/3 animate-pulse rounded-rk-sm bg-ink/[0.06]"
                    />
                  ))}
                </div>

                <div className="mt-4 h-4 w-1/2 animate-pulse rounded-full bg-ink/[0.06]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {/* VACÍO */}
        {!loading && !error && collections.length === 0 && (
          <div className="mt-7">
            <EmptyState
              icon={FolderHeart}
              title="Todavía no tienes colecciones"
              description="Crea una colección para agrupar los recursos que usas juntos."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        )}

        {/* COLECCIONES */}
        {!loading && collections.length > 0 && (
          <>
            <div className="rk-fade-up mt-8 flex items-baseline justify-between gap-4">
              <p className="text-[15px] text-ink/60">
                Tus bibliotecas
              </p>

              <span className="text-sm font-medium text-ink/60">
                {collections.length}{" "}
                {collections.length === 1
                  ? "colección"
                  : "colecciones"}
              </span>
            </div>

            <div className="rk-divider mt-4" />

            <section className="rk-fade-up rk-enter-1 mt-5 grid gap-3 md:grid-cols-2">
              {collections.map((collection) => {
                const preview = collection.items.slice(0, 3);
                const isEditing = editingId === collection.id;

                return (
                  <article
                    key={collection.id}
                    className="rk-card rk-card-hover group flex flex-col p-4"
                  >
                    {/* PORTADA REAL: primeras imágenes 9:16 */}
                    <Link
                      href={`/mi-cuenta/colecciones/${collection.id}`}
                      className="rk-press-sm block"
                      aria-label={`Abrir ${collection.name}`}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {preview.map((item) => (
                          <div
                            key={item.product.id}
                            className={`rk-media ${claseProporcion(
                              {
                              categoriaSlug: item.product.category?.slug,
                              pieceType: item.product.pieceType as never,
                            }
                            )} relative overflow-hidden rounded-rk-sm`}
                          >
                            {item.product.coverUrl ? (
                              <Image
                                src={item.product.coverUrl}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 30vw, 15vw"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-ink/45">
                                RcktX
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Huecos vacíos: nunca se rellenan con
                            imágenes inventadas. */}
                        {Array.from({
                          length: Math.max(0, 3 - preview.length),
                        }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            aria-hidden
                            className="rk-aspect-product rounded-rk-sm border border-dashed border-line/15"
                          />
                        ))}
                      </div>
                    </Link>

                    {/* IDENTIDAD */}
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/mi-cuenta/colecciones/${collection.id}`}
                          className="block truncate text-[17px] font-semibold transition-opacity hover:opacity-70"
                        >
                          {collection.name}
                        </Link>

                        {/* Distintivo solo cuando es pública. */}
                        {collection.isPublic && (
                          <span className="rk-badge rk-badge-neutral mt-1.5">
                            Pública
                          </span>
                        )}

                        {/* Solo datos reales: la colección no
                            guarda descripción. */}
                        <p className="mt-1 text-xs text-ink/60">
                          {collection.items.length}{" "}
                          {collection.items.length === 1
                            ? "recurso"
                            : "recursos"}
                          {" · "}
                          {formatDate(collection.updatedAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(collection.id);
                            setEditingName(collection.name);
                            setError("");
                          }}
                          aria-label={`Editar ${collection.name}`}
                          title="Editar nombre"
                          className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors duration-fast ease-rk hover:bg-ink/[0.06] hover:text-ink"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteCollection(collection.id)
                          }
                          disabled={deletingId === collection.id}
                          aria-label={`Eliminar ${collection.name}`}
                          title="Eliminar colección"
                          className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors duration-fast ease-rk hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                        >
                          <IconoBasura size={15} />
                        </button>
                      </div>
                    </div>

                    {/* EDICIÓN EN LÍNEA */}
                    {isEditing && (
                      <div className="rk-fade mt-4 rounded-rk-md bg-ink/[0.04] p-3">
                        <label
                          htmlFor={`nombre-${collection.id}`}
                          className="rk-eyebrow"
                        >
                          Nuevo nombre
                        </label>

                        <input
                          id={`nombre-${collection.id}`}
                          type="text"
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          maxLength={80}
                          autoFocus
                          className="rk-input mt-2 w-full"
                        />

                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCollection(collection.id)
                            }
                            className="rk-btn rk-btn-primary rk-btn-compact"
                          >
                            <Check size={14} />
                            Guardar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                            className="rk-btn rk-btn-ghost rk-btn-compact"
                          >
                            <X size={14} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-1">
                      <Link
                        href={`/mi-cuenta/colecciones/${collection.id}`}
                        className="rk-press inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-75"
                      >
                        Ver colección
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
