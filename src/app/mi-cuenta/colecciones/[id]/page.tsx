"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Globe, Lock, Trash2 } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import { claseProporcion } from "@/lib/tipos-publicacion";

type Product = {
    id: string;
    name: string;
    slug: string;
    price: number;
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
    isPublic: boolean;
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
    const [cambiandoVisibilidad, setCambiandoVisibilidad] =
        useState(false);
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

    /*
      Publicar o despublicar la colección.

      Mientras es privada no existe para nadie más: la página
      pública devuelve 404. Al publicarla, cualquiera con el
      enlace puede ver los recursos que contiene.
    */
    async function cambiarVisibilidad() {
        if (!collection) return;

        const siguiente = !collection.isPublic;

        try {
            setCambiandoVisibilidad(true);

            const response = await fetch("/api/colecciones", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    collectionId: collection.id,
                    isPublic: siguiente,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudo cambiar la visibilidad."
                );
            }

            setCollection((current) =>
                current ? { ...current, isPublic: siguiente } : current
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "No se pudo cambiar la visibilidad."
            );
        } finally {
            setCambiandoVisibilidad(false);
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
                            className="rk-row-card flex gap-4"
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
                    className="rk-btn rk-btn-line rk-btn-compact"
                >
                    Agregar recursos
                </Link>
            </AccountPageHeader>

            {/* VISIBILIDAD */}
            <section className="rk-tile mt-6 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3.5">
                    <span
                        aria-hidden
                        className="rk-icon-tile h-10 w-10"
                    >
                        {collection.isPublic ? (
                            <Globe size={18} />
                        ) : (
                            <Lock size={18} />
                        )}
                    </span>

                    <div className="min-w-0">
                        <p className="text-sm font-semibold">
                            {collection.isPublic
                                ? "Colección pública"
                                : "Colección privada"}
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-ink/60">
                            {collection.isPublic
                                ? "Cualquiera con el enlace puede verla, y puede aparecer en el inicio."
                                : "Solo tú puedes verla. Nadie más tiene acceso a esta página."}
                        </p>

                        {collection.isPublic && (
                            <Link
                                href={`/colecciones/${collection.id}`}
                                className="rk-press-sm mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-4 hover:text-ink"
                            >
                                Ver la página pública
                            </Link>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={cambiarVisibilidad}
                    disabled={cambiandoVisibilidad}
                    className="rk-btn rk-btn-line rk-btn-compact shrink-0"
                >
                    {cambiandoVisibilidad
                        ? "Guardando..."
                        : collection.isPublic
                            ? "Hacerla privada"
                            : "Hacerla pública"}
                </button>
            </section>

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
                                className="rk-row-card flex gap-4"
                            >
                                {/* El marco lo decide la pieza; sin desenfoque. */}
                                <Link
                                    href={`/tienda/${product.slug}`}
                                    className="rk-press-sm shrink-0"
                                    aria-label={product.name}
                                >
                                    <div
                                        className={`rk-media ${claseProporcion(
                                            {
                                            categoriaSlug: product.category?.slug,
                                            pieceType: product.pieceType as never,
                                        }
                                        )} relative w-16 overflow-hidden rounded-rk-sm`}
                                    >
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
                                            className="rk-press text-sm font-medium text-ink transition-opacity hover:opacity-75"
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
