"use client";

import Link from "next/link";
import { Check, FolderPlus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

type Collection = {
  id: string;
  name: string;
  items: {
    product: {
      id: string;
    };
  }[];
};

type AddToCollectionButtonProps = {
  productId: string;
};

export default function AddToCollectionButton({
  productId,
}: AddToCollectionButtonProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  // Bloquea el scroll del fondo mientras el panel está abierto
  // y permite cerrarlo con Escape.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function loadCollections() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/colecciones", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage("Debes iniciar sesión.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar las colecciones."
        );
      }

      setCollections(data.collections || []);
      setLoaded(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las colecciones."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setMessage("");

    if (!loaded) {
      loadCollections();
    }
  }

  async function addToCollection(collectionId: string) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/colecciones/${collectionId}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        setMessage("Debes iniciar sesión.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo agregar el producto a la colección."
        );
      }

      setCollections((current) =>
        current.map((collection) => {
          if (collection.id !== collectionId) {
            return collection;
          }

          const alreadyExists = collection.items.some(
            (item) => item.product.id === productId
          );

          if (alreadyExists) {
            return collection;
          }

          return {
            ...collection,
            items: [
              ...collection.items,
              {
                product: {
                  id: productId,
                },
              },
            ],
          };
        })
      );

      setMessage("Producto agregado correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el producto."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rk-btn rk-btn-line w-full"
      >
        <FolderPlus size={17} />
        Agregar a colección
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Agregar a colección"
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
        >
          {/* FONDO */}
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* PANEL: hoja inferior en móvil, diálogo en desktop */}
          <div className="rk-glass-strong rk-float animate-fade-up relative w-full max-w-md rounded-t-rk-xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-rk-xl sm:p-6 sm:pb-6">

            {/* Asa de arrastre, solo móvil */}
            <div
              aria-hidden
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15 sm:hidden"
            />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="rk-eyebrow">Biblioteca</p>

                <h2 className="mt-1.5 text-xl font-semibold">
                  Agregar a colección
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rk-notif-check"
                style={{ margin: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {loading && (
              <div className="mt-5 rounded-rk-md bg-ink/[0.04] p-5 text-center text-sm text-ink/60">
                Cargando...
              </div>
            )}

            {!loading && message && (
              <div className="mt-5 rounded-rk-md bg-ink/[0.04] p-4 text-sm text-ink/60">
                {message}
              </div>
            )}

            {!loading && collections.length === 0 && (
              <div className="mt-5 rounded-rk-md bg-ink/[0.04] p-6 text-center">
                <p className="text-sm text-ink/60">
                  Todavía no tienes colecciones.
                </p>

                <Link
                  href="/mi-cuenta/colecciones"
                  className="rk-btn rk-btn-primary mt-4"
                >
                  Crear colección
                </Link>
              </div>
            )}

            {!loading && collections.length > 0 && (
              <div className="mt-5 max-h-[45vh] space-y-2.5 overflow-y-auto pr-0.5">
                {collections.map((collection) => {
                  const alreadyAdded = collection.items.some(
                    (item) => item.product.id === productId
                  );

                  return (
                    <button
                      key={collection.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addToCollection(collection.id)}
                      className="rk-row-card rk-press-sm flex w-full items-center justify-between gap-3 text-left disabled:cursor-default disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {collection.name}
                        </p>

                        <p className="mt-0.5 text-xs text-ink/60">
                          {collection.items.length}{" "}
                          {collection.items.length === 1
                            ? "recurso"
                            : "recursos"}
                        </p>
                      </div>

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          alreadyAdded
                            ? "bg-success/12 text-success"
                            : "bg-ink/[0.06] text-ink/60"
                        }`}
                      >
                        {alreadyAdded ? (
                          <Check size={15} />
                        ) : (
                          <Plus size={15} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
