"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download as DownloadIcon, Receipt } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import { claseProporcion } from "@/lib/tipos-publicacion";

type Product = {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    price: number;
    /** Decide el marco de la miniatura. */
    pieceType?: string | null;
    /** Categoría del recurso: decide su proporción. */
    category?: { slug?: string | null } | null;
};

type OrderItem = {
    id: string;
    quantity: number;
    price: number;
    product: Product;
};

type Payment = {
    provider: string;
    status: string;
    transactionId: string | null;
    amount: number;
};

type Order = {
    id: string;
    total: number;
    status: string;
    createdAt: string;
    items: OrderItem[];
    payment: Payment | null;
};

function formatMoney(value: number) {
    return `S/ ${value.toFixed(2)}`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getOrderStatusLabel(status: string) {
    const labels: Record<string, string> = {
        PENDING: "Pendiente",
        PAID: "Pagado",
        CANCELED: "Cancelado",
        REFUNDED: "Reembolsado",
    };

    return labels[status] || status;
}

function getOrderStatusBadge(status: string) {
    const classes: Record<string, string> = {
        PENDING: "rk-badge-warning",
        PAID: "rk-badge-success",
        CANCELED: "rk-badge-danger",
        REFUNDED: "rk-badge-neutral",
    };

    return classes[status] || "rk-badge-neutral";
}

export default function MisComprasPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadOrders() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/mis-compras", {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudieron cargar tus compras."
                );
            }

            setOrders(data.orders || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar tus compras."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrders();
    }, []);

    return (
        <>

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
                <AccountPageHeader
                    title="Mis compras"
                    subtitle="Recursos que adquiriste."
                >
                    {orders.length > 0 && (
                        <Link
                            href="/mi-cuenta/descargas"
                            className="rk-btn rk-btn-glass rk-btn-compact !px-4 !py-2.5 !text-sm"
                        >
                            <DownloadIcon size={15} />
                            Mis descargas
                        </Link>
                    )}
                </AccountPageHeader>

                {/* CARGANDO */}
                {loading && (
                    <div className="mt-8 space-y-3" aria-busy="true">
                        {[0, 1].map((index) => (
                            <div key={index} className="rk-card p-5">
                                <div className="h-3.5 w-32 animate-pulse rounded-full bg-ink/[0.06]" />

                                <div className="mt-5 flex items-center gap-4">
                                    <div className="rk-aspect-product w-14 animate-pulse rounded-rk-sm bg-ink/[0.06]" />

                                    <div className="min-w-0 flex-1">
                                        <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-ink/[0.06]" />
                                        <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <div
                        role="alert"
                        className="rk-fade mt-8 rounded-rk-md border border-danger/25 bg-danger/10 p-5"
                    >
                        <p className="text-sm text-danger">{error}</p>

                        <button
                            type="button"
                            onClick={loadOrders}
                            className="rk-btn rk-btn-primary mt-4 rk-btn-compact !px-4 !py-2.5 !text-sm"
                        >
                            Intentar nuevamente
                        </button>
                    </div>
                )}

                {/* VACÍO */}
                {!loading && !error && orders.length === 0 && (
                    <div className="mt-8">
                        <EmptyState
                            icon={Receipt}
                            title="Todavía no tienes compras"
                            description="Cuando compres un recurso, tu pedido aparecerá aquí con su estado y su descarga."
                            action={{
                                href: "/tienda",
                                label: "Explorar recursos",
                            }}
                        />
                    </div>
                )}

                {/* PEDIDOS */}
                {!loading && !error && orders.length > 0 && (
                    <section className="mt-8 space-y-4">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className="rk-fade-up rk-card overflow-hidden"
                            >
                                {/* CABECERA DEL PEDIDO */}
                                <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 p-4 sm:p-5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">
                                            {formatDate(order.createdAt)}
                                        </p>

                                        <p className="mt-1 truncate font-mono text-[11px] text-ink/60">
                                            #{order.id}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`rk-badge ${getOrderStatusBadge(
                                                order.status
                                            )}`}
                                        >
                                            {getOrderStatusLabel(
                                                order.status
                                            )}
                                        </span>

                                        <p className="text-lg font-semibold tabular-nums tracking-tight">
                                            {formatMoney(order.total)}
                                        </p>
                                    </div>
                                </div>

                                <div className="rk-divider" />

                                {/* RECURSOS DEL PEDIDO */}
                                <div className="rk-divider-y">
                                    {order.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-wrap items-center gap-4 p-4 sm:p-5"
                                        >
                                            {/* Contenido visual 9:16, sin desenfoque. */}
                                            <Link
                                                href={`/tienda/${item.product.slug}`}
                                                className="rk-press-sm shrink-0"
                                                aria-label={item.product.name}
                                            >
                                                <div
                                                    className={`rk-media ${claseProporcion(
                                                        {
                                                        categoriaSlug: item.product.category?.slug,
                                                        pieceType: item.product.pieceType as never,
                                                    }
                                                    )} relative w-14 overflow-hidden rounded-rk-sm sm:w-16`}
                                                >
                                                    {item.product.coverUrl ? (
                                                        <Image
                                                            src={
                                                                item.product
                                                                    .coverUrl
                                                            }
                                                            alt={
                                                                item.product
                                                                    .name
                                                            }
                                                            fill
                                                            className="object-cover"
                                                            sizes="64px"
                                                        />
                                                    ) : (
                                                        <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-ink/45">
                                                            RK
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>

                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/tienda/${item.product.slug}`}
                                                    className="block truncate text-[15px] font-semibold transition-opacity hover:opacity-70"
                                                >
                                                    {item.product.name}
                                                </Link>

                                                <p className="mt-1 text-sm text-ink/60">
                                                    {formatMoney(item.price)}

                                                    {item.quantity > 1 && (
                                                        <span>
                                                            {" · "}
                                                            {item.quantity}{" "}
                                                            unidades
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                                                {/* La descarga vive en su página: la
                                                    entrega el mismo registro real. */}
                                                {order.status === "PAID" ? (
                                                    <Link
                                                        href="/mi-cuenta/descargas"
                                                        className="rk-btn rk-btn-primary rk-btn-compact flex-1 !px-4 !py-2.5 !text-sm sm:flex-none"
                                                    >
                                                        <DownloadIcon
                                                            size={15}
                                                        />
                                                        Descargar
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        href={`/tienda/${item.product.slug}`}
                                                        className="rk-btn rk-btn-glass rk-btn-compact flex-1 !px-4 !py-2.5 !text-sm sm:flex-none"
                                                    >
                                                        Ver recurso
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* PAGO REAL, SOLO SI EXISTE */}
                                {order.payment && (
                                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-line/10 bg-ink/[0.02] px-4 py-3 text-xs text-ink/60 sm:px-5">
                                        <span>
                                            Pago: {order.payment.provider}
                                        </span>

                                        <span>
                                            Estado del pago:{" "}
                                            {order.payment.status}
                                        </span>
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </main>

            <Footer />
        </>
    );
}
