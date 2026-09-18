"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";

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
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-5 py-10 sm:py-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
              RCKTDMG
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Mis favoritos
            </h1>

            <p className="mt-3 max-w-2xl text-ink/50">
              Guarda los recursos digitales que quieres revisar
              más adelante.
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

        {loading && (
          <div className="mt-10 rk-card p-10 text-center text-ink/50">
            Cargando favoritos...
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-3xl border border-danger/25 bg-danger/10 p-6 text-sm text-danger">
            {error}

            <button
              type="button"
              onClick={loadFavorites}
              className="ml-4 rounded-full bg-primary px-4 py-2 text-xs text-onprimary"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && favorites.length === 0 && (
          <div className="mt-10 rk-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-onprimary">
              ♡
            </div>

            <h2 className="mt-5 text-2xl font-semibold">
              Todavía no tienes favoritos
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/50">
              Cuando encuentres un recurso que te interese,
              agrégalo a favoritos para encontrarlo fácilmente
              después.
            </p>

            <Link
              href="/tienda"
              className="mt-7 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
            >
              Explorar recursos
            </Link>
          </div>
        )}

        {!loading && !error && favorites.length > 0 && (
          <>
            <div className="mt-10 flex items-center justify-between">
              <p className="text-sm text-ink/50">
                {favorites.length}{" "}
                {favorites.length === 1
                  ? "recurso guardado"
                  : "recursos guardados"}
              </p>
            </div>

            <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((favorite) => (
                <article
                  key={favorite.productId}
                  className="overflow-hidden rk-card"
                >
                  <Link
                    href={`/tienda/${favorite.product.slug}`}
                    className="block"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-ink/[0.05]">
                      {favorite.product.coverUrl ? (
                        <img
                          src={favorite.product.coverUrl}
                          alt={favorite.product.name}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-ink/25">
                          RCKTDMG
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-6">
                    {favorite.product.category && (
                      <p className="text-xs uppercase tracking-wider text-ink/40">
                        {favorite.product.category.name}
                      </p>
                    )}

                    <Link
                      href={`/tienda/${favorite.product.slug}`}
                      className="mt-2 block text-lg font-semibold hover:underline"
                    >
                      {favorite.product.name}
                    </Link>

                    <p className="mt-4 text-lg font-semibold">
                      S/{" "}
                      {Number(favorite.product.price).toFixed(2)}
                    </p>

                    <div className="mt-5 flex gap-3">
                      <Link
                        href={`/tienda/${favorite.product.slug}`}
                        className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-sm font-medium text-onprimary transition hover:opacity-80"
                      >
                        Ver recurso
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          removeFavorite(favorite.productId)
                        }
                        disabled={
                          removingId === favorite.productId
                        }
                        className="rounded-full border border-danger/25 px-4 py-3 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                        title="Eliminar de favoritos"
                      >
                        {removingId === favorite.productId
                          ? "..."
                          : "♡"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}