"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";

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

    const [collection, setCollection] = useState<Collection | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState<string | null>(null);

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
            setRemovingId(productId);

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
        } finally {
            setRemovingId(null);
        }
    }

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
                <div className="h-4 w-28 animate-pulse rounded-full bg-ink/[0.06]" />
                <div className="mt-5 h-9 w-56 animate-pulse rounded-full bg-ink/[0.06]" />

                <div
                    className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    aria-busy="true"
                >
                    {[0, 1, 2].map((index) => (
                        <div
                            key={index}
                            className="rk-card flex gap-4 p-4"
                        >
                            <div className="rk-aspect-product w-16 shrink-0 animate-pulse rounded-rk-sm bg-ink/[0.06]" />

                            <div className="min-w-0 flex-1">
                                <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-ink/[0.06]" />
                                <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-ink/[0.05]" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    if (error || !collection) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
                <AccountPageHeader
                    title={error || "Colección no encontrada"}
                    subtitle="Puede que la hayas eliminado o que el enlace ya no sea válido."
                    backHref="/mi-cuenta/colecciones"
                    backLabel="Colecciones"
                />

                <div className="mt-8">
                    <EmptyState
                        icon={FolderOpen}
                        title="Sin colección que mostrar"
                        description="Vuelve a tus colecciones para abrir otra o crear una nueva."
                        action={{
                            href: "/mi-cuenta/colecciones",
                            label: "Ver mis colecciones",
                        }}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
            <AccountPageHeader
                title={collection.name}
                subtitle={`${collection.items.length} ${
                    collection.items.length === 1
                        ? "recurso en esta colección"
                        : "recursos en esta colección"
                }`}
                backHref="/mi-cuenta/colecciones"
                backLabel="Colecciones"
            >
                <Link
                    href="/tienda"
                    className="rk-btn rk-btn-glass !min-h-0 !px-4 !py-2.5 !text-sm"
                >
                    Agregar recursos
                </Link>
            </AccountPageHeader>

            {collection.items.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        icon={FolderOpen}
                        title="Esta colección está vacía"
                        description="Agrega recursos desde la tienda para verlos aquí."
                        action={{
                            href: "/tienda",
                            label: "Explorar recursos",
                        }}
                    />
                </div>
            ) : (
                <>
                    <div className="rk-divider mt-8" />

                    {/* Se conserva la rejilla 1 / 2 / 3 columnas. */}
                    <section className="rk-fade-up mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {collection.items.map(({ product }) => (
                            <article
                                key={product.id}
                                className="rk-card flex gap-4 p-4"
                            >
                                {/* Contenido visual 9:16, sin desenfoque. */}
                                <Link
                                    href={`/tienda/${product.slug}`}
                                    className="rk-press-sm shrink-0"
                                    aria-label={product.name}
                                >
                                    <div className="rk-media rk-aspect-product relative w-16 overflow-hidden rounded-rk-sm">
                                        {product.coverUrl ? (
                                            <Image
                                                src={product.coverUrl}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-ink/45">
                                                RCKTDMG
                                            </span>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex min-w-0 flex-1 flex-col">
                                    <Link
                                        href={`/tienda/${product.slug}`}
                                        className="min-w-0"
                                    >
                                        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug transition-opacity hover:opacity-70">
                                            {product.name}
                                        </h2>
                                    </Link>

                                    <p className="mt-1.5 text-sm font-semibold tabular-nums">
                                        S/{" "}
                                        {Number(product.price).toFixed(2)}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                                        <Link
                                            href={`/tienda/${product.slug}`}
                                            className="rk-press text-sm font-medium text-accent transition-opacity hover:opacity-75"
                                        >
                                            Ver recurso
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeProduct(product.id)
                                            }
                                            disabled={
                                                removingId === product.id
                                            }
                                            aria-label={`Quitar ${product.name} de la colección`}
                                            title="Quitar de la colección"
                                            className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors duration-fast ease-rk hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                </>
            )}
        </main>
    );
}
