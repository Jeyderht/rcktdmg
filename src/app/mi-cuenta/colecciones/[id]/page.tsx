"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Product = {
    id: string;
    name: string;
    slug: string;
    price: number;
    coverUrl: string | null;
    status: string;
};

type CollectionItem = {
    product: Product;
};

type Collection = {
    id: string;
    name: string;
    items: CollectionItem[];
};

export default function CollectionDetailPage() {
    const params = useParams();
    const collectionId = String(params.id);

    const [collection, setCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadCollection = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/colecciones");

            if (!response.ok) {
                throw new Error("No se pudieron cargar las colecciones.");
            }

            const data = await response.json();

            const found = data.collections?.find(
                (item: Collection) => item.id === collectionId
            );

            if (!found) {
                setError("Colección no encontrada.");
                setCollection(null);
                return;
            }

            setCollection(found);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ocurrió un error inesperado."
            );
        } finally {
            setLoading(false);
        }
    }, [collectionId]);

    useEffect(() => {
        loadCollection();
    }, [loadCollection]);

    async function removeProduct(productId: string) {
        const confirmed = window.confirm(
            "¿Quieres eliminar este producto de la colección?"
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `/api/colecciones/${collectionId}/items`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        productId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudo eliminar el producto."
                );
            }

            setCollection((current) =>
                current
                    ? {
                        ...current,
                        items: current.items.filter(
                            (item) => item.product.id !== productId
                        ),
                    }
                    : current
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "No se pudo eliminar el producto."
            );
        }
    }

    if (loading) {
        return (
            <main className="mx-auto max-w-7xl px-4 sm:px-5 py-10 sm:py-16">
                <p className="text-ink/50">Cargando colección...</p>
            </main>
        );
    }

    if (error || !collection) {
        return (
            <main className="mx-auto max-w-7xl px-4 sm:px-5 py-10 sm:py-16">
                <Link
                    href="/mi-cuenta/colecciones"
                    className="text-sm text-ink/50 hover:text-ink"
                >
                    ← Volver a colecciones
                </Link>

                <div className="mt-10 rounded-3xl border p-8">
                    <h1 className="text-2xl font-semibold">
                        {error || "Colección no encontrada"}
                    </h1>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-5 py-10 sm:py-16">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Link
                        href="/mi-cuenta/colecciones"
                        className="text-sm text-ink/50 hover:text-ink"
                    >
                        ← Volver a colecciones
                    </Link>

                    <p className="mt-8 text-xs uppercase tracking-[0.2em] text-ink/40">
                        Biblioteca
                    </p>

                    <h1 className="mt-2 text-4xl font-semibold">
                        {collection.name}
                    </h1>

                    <p className="mt-3 text-ink/50">
                        {collection.items.length}{" "}
                        {collection.items.length === 1
                            ? "recurso"
                            : "recursos"}
                    </p>
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
            {collection.items.length === 0 ? (
                <div className="mt-12 rounded-[2rem] border border-dashed p-12 text-center">
                    <h2 className="text-xl font-semibold">
                        Esta colección está vacía
                    </h2>

                    <p className="mt-3 text-ink/50">
                        Agrega recursos desde la tienda para verlos aquí.
                    </p>

                    <Link
                        href="/tienda"
                        className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary"
                    >
                        Explorar tienda
                    </Link>
                </div>
            ) : (
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {collection.items.map(({ product }) => (
                        <article
                            key={product.id}
                            className="overflow-hidden rounded-[2rem] border bg-surface"
                        >
                            <Link href={`/tienda/${product.slug}`}>
                                <div className="aspect-[4/3] bg-ink/[0.05]">
                                    {product.coverUrl ? (
                                        <img
                                            src={product.coverUrl}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-end p-6 text-sm text-ink/40">
                                            SIN PORTADA
                                        </div>
                                    )}
                                </div>
                            </Link>

                            <div className="p-6">
                                <Link href={`/tienda/${product.slug}`}>
                                    <h2 className="text-lg font-semibold hover:underline">
                                        {product.name}
                                    </h2>
                                </Link>

                                <p className="mt-2 text-sm text-ink/50">
                                    S/ {Number(product.price).toFixed(2)}
                                </p>

                                <div className="mt-5 flex items-center gap-3">
                                    <Link
                                        href={`/tienda/${product.slug}`}
                                        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary"
                                    >
                                        Ver recurso
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeProduct(product.id)
                                        }
                                        className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-primary hover:text-onprimary"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}