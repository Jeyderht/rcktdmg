"use client";

import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";

type Favorite = {
  userId: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number | string;
    coverUrl: string | null;
    status: string;
    category: {
      id: string;
      name: string;
    } | null;
  };
};

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function loadFavorites() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/favoritos", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar tus favoritos."
        );
      }

      setFavorites(data.favorites || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus favoritos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function removeFavorite(productId: string) {
    try {
      setRemovingId(productId);
      setError("");

      const response = await fetch("/api/favoritos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo eliminar el favorito."
        );
      }

      setFavorites((current) =>
        current.filter(
          (favorite) => favorite.productId !== productId
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el favorito."
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
        <AccountPageHeader
          title="Favoritos"
          subtitle="Recursos que guardaste para volver después."
        />

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="rk-upload-error rk-fade mt-6"
          >
            <p className="rk-upload-error">{error}</p>

            <button
              type="button"
              onClick={loadFavorites}
              className="rk-btn rk-btn-primary mt-4 rk-btn-compact"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* CARGANDO */}
        {loading && (
          <div
            className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
            aria-busy="true"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="rk-aspect-product w-full animate-pulse rounded-rk-md bg-ink/[0.06]" />

                <div className="px-0.5 pt-2.5">
                  <div className="h-3 w-full animate-pulse rounded-full bg-ink/[0.06]" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-ink/[0.05]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VACÍO */}
        {!loading && !error && favorites.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon={Heart}
              title="Todavía no tienes favoritos"
              description="Guarda recursos que quieras revisar más adelante."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        )}

        {/* BIBLIOTECA */}
        {!loading && favorites.length > 0 && (
          <>
            <div className="rk-fade-up mt-8 flex items-baseline justify-between gap-4">
              <p className="text-[15px] text-ink/60">
                Tu biblioteca
              </p>

              <span className="text-sm font-medium text-ink/60">
                {favorites.length}{" "}
                {favorites.length === 1
                  ? "recurso guardado"
                  : "recursos guardados"}
              </span>
            </div>

            <div className="rk-divider mt-4" />

            <section className="rk-fade-up rk-enter-1 mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
              {favorites.map((favorite) => (
                <div key={favorite.productId} className="relative">
                  {/*
                    Se reutiliza la tarjeta compartida en vez de
                    duplicar una variante: misma proporción 9:16,
                    mismo hover y mismo precio en toda la web.

                    El corazón propio de la tarjeta se desactiva
                    aquí: en esta página quitar el favorito debe
                    actualizar la lista al instante, y así se
                    evita una consulta por tarjeta.
                  */}
                  <ProductCard
                    showFavorite={false}
                    product={{
                      id: favorite.product.id,
                      name: favorite.product.name,
                      slug: favorite.product.slug,
                      price: Number(favorite.product.price),
                      coverUrl: favorite.product.coverUrl,
                      category: favorite.product.category
                        ? { name: favorite.product.category.name }
                        : null,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeFavorite(favorite.productId)
                    }
                    disabled={removingId === favorite.productId}
                    aria-label={`Quitar ${favorite.product.name} de favoritos`}
                    title="Quitar de favoritos"
                    className="rk-press rk-glass-on-image absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full disabled:cursor-wait disabled:opacity-60"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
