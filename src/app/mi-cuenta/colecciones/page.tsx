"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  coverUrl: string | null;
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
  items: CollectionItem[];
};

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

      setCollections((current) => [
        data.collection,
        ...current,
      ]);

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
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-5 py-10 sm:py-16">
        {/* ENCABEZADO */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
              RCKTDMG
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Mis colecciones
            </h1>

            <p className="mt-3 max-w-2xl text-ink/50">
              Organiza tus recursos favoritos en colecciones
              personalizadas.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/mi-cuenta"
              className="rk-btn rk-btn-glass"
            >
              Mi cuenta
            </Link>

            <Link
              href="/tienda"
              className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
            >
              Explorar tienda
            </Link>
          </div>
        </div>

        {/* CREAR COLECCIÓN */}
        <section className="mt-10 rk-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
            Nueva colección
          </p>

          <form
            onSubmit={createCollection}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Diseño, Marketing, Recursos..."
              maxLength={80}
              className="min-w-0 flex-1 rounded-full border border-ink/10 bg-ink/[0.05] px-5 py-3 text-sm outline-none transition focus:border-ink"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear colección"}
            </button>
          </form>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-3xl border border-danger/25 bg-danger/10 p-5 text-sm text-danger">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="mt-10 rk-card p-10 text-center text-ink/50">
            Cargando tus colecciones...
          </div>
        )}

        {/* VACÍO */}
        {!loading && !error && collections.length === 0 && (
          <div className="mt-10 rk-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-onprimary">
              +
            </div>

            <h2 className="mt-5 text-2xl font-semibold">
              Todavía no tienes colecciones
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/50">
              Crea una colección para organizar tus recursos
              digitales de la manera que prefieras.
            </p>
          </div>
        )}

        {/* COLECCIONES */}
        {!loading && collections.length > 0 && (
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-sm text-ink/50">
                {collections.length}{" "}
                {collections.length === 1
                  ? "colección"
                  : "colecciones"}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {collections.map((collection) => (
                <article
                  key={collection.id}
                  className="rk-card p-6"
                >
                  <div
                    className={`mb-6 grid h-36 gap-2 overflow-hidden rounded-2xl bg-ink/[0.05] ${collection.items.length === 1
                        ? "grid-cols-1"
                        : collection.items.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                      }`}
                  >
                    {collection.items.slice(0, 3).map((item) => (
                      <div
                        key={item.product.id}
                        className="overflow-hidden bg-ink/[0.09]"
                      >
                        {item.product.coverUrl ? (
                          <img
                            src={item.product.coverUrl}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-ink/25">
                            RCKTDMG
                          </div>
                        )}
                      </div>
                    ))}

                    {collection.items.length === 0 && (
                      <div className="col-span-1 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-ink/30">
                        Colección vacía
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
                        Colección
                      </p>

                      <h2 className="mt-2 text-xl font-semibold">
                        {collection.name}
                      </h2>

                      <p className="mt-1 text-sm text-ink/50">
                        {collection.items.length}{" "}
                        {collection.items.length === 1
                          ? "recurso"
                          : "recursos"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(collection.id);
                          setEditingName(collection.name);
                          setError("");
                        }}
                        className="rounded-full border border-ink/10 px-4 py-2 text-xs font-medium transition hover:bg-primary hover:text-onprimary"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCollection(collection.id)
                        }
                        disabled={
                          deletingId === collection.id
                        }
                        className="rounded-full border border-danger/25 px-4 py-2 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                      >
                        {deletingId === collection.id
                          ? "..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <Link
                      href={`/mi-cuenta/colecciones/${collection.id}`}
                      className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                    >
                      Abrir colección →
                    </Link>
                  </div>
                  {editingId === collection.id && (
                    <div className="mt-5 rounded-2xl bg-ink/[0.05] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
                        Editar colección
                      </p>

                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) =>
                          setEditingName(event.target.value)
                        }
                        maxLength={80}
                        className="mt-3 w-full rounded-full border border-ink/10 bg-surface px-4 py-3 text-sm outline-none transition focus:border-ink"
                      />

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCollection(collection.id)
                          }
                          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                        >
                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="rk-btn rk-btn-glass"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {collection.items.length === 0 ? (
                    <div className="mt-6 rounded-2xl bg-ink/[0.05] p-6 text-center">
                      <p className="text-sm text-ink/40">
                        Esta colección está vacía.
                      </p>

                      <Link
                        href="/tienda"
                        className="mt-4 inline-block text-sm font-medium underline"
                      >
                        Explorar recursos
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {collection.items
                        .slice(0, 3)
                        .map((item) => (
                          <Link
                            key={item.product.id}
                            href={`/tienda/${item.product.slug}`}
                            className="flex items-center gap-4 rounded-2xl bg-ink/[0.05] p-3 transition hover:bg-ink/[0.05]"
                          >
                            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                              {item.product.coverUrl ? (
                                <img
                                  src={
                                    item.product.coverUrl
                                  }
                                  alt={item.product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[9px] text-ink/25">
                                  RCKTDMG
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {item.product.name}
                              </p>

                              <p className="mt-1 text-xs text-ink/40">
                                S/{" "}
                                {Number(
                                  item.product.price
                                ).toFixed(2)}
                              </p>
                            </div>

                            <span className="text-ink/30">
                              →
                            </span>
                          </Link>
                        ))}

                      {collection.items.length > 3 && (
                        <p className="pt-2 text-center text-xs text-ink/40">
                          +{" "}
                          {collection.items.length - 3}{" "}
                          recursos más
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}