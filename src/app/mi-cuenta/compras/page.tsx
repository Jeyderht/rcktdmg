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
                            className="rk-btn rk-btn-line"
                        >
                            <DownloadIcon size={15} />
                            Mis descargas
                        </Link>
                    )}
                </AccountPageHeader>

                {/* CARGANDO */}
                {loading && (
                    <div className="mt-8 grid gap-3" aria-busy="true">
                        {[0, 1].map((index) => (
                            <div key={index} className="rk-skeleton" style={{ height: 150, borderRadius: 22 }} />
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <div
                        role="alert"
                        className="rk-upload-error rk-fade mt-8"
                    >
                        <p style={{ margin: 0 }}>{error}</p>

                        <button
                            type="button"
                            onClick={loadOrders}
                            className="rk-btn rk-btn-primary mt-4"
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
                    <section className="rk-row-list mt-8">
                        {orders.map((order) => (
                            <article key={order.id} className="rk-fade-up rk-row-card">
                                {/* CABECERA DEL PEDIDO */}
                                <div className="rk-row-card-head">
                                    <div className="min-w-0">
                                        <p className="rk-row-card-title">
                                            {formatDate(order.createdAt)}
                                        </p>

                                        <p className="rk-row-card-code">#{order.id}</p>
                                    </div>

                                    <div className="rk-row-card-side">
                                        <p className="rk-row-card-amount">
                                            {formatMoney(order.total)}
                                        </p>

                                        <span
                                            className={`rk-badge ${getOrderStatusBadge(
                                                order.status
                                            )}`}
                                        >
                                            {getOrderStatusLabel(order.status)}
                                        </span>
                                    </div>
                                </div>

                                {/* RECURSOS DEL PEDIDO */}
                                <ul className="rk-row-card-box rk-row-items">
                                    {order.items.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href={`/tienda/${item.product.slug}`}
                                                aria-label={item.product.name}
                                                className={`rk-media ${claseProporcion({
                                                    categoriaSlug: item.product.category?.slug,
                                                    pieceType: item.product.pieceType as never,
                                                })} rk-row-card-thumb`}
                                            >
                                                {item.product.coverUrl && (
                                                    <Image
                                                        src={item.product.coverUrl}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="52px"
                                                    />
                                                )}
                                            </Link>

                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/tienda/${item.product.slug}`}
                                                    className="rk-row-item-name"
                                                >
                                                    {item.product.name}
                                                </Link>

                                                <p className="rk-row-card-meta">
                                                    {formatMoney(item.price)}
                                                    {item.quantity > 1 &&
                                                        ` · ${item.quantity} unidades`}
                                                </p>
                                            </div>

                                            {/* La descarga vive en su página: la
                                                entrega el mismo registro real. */}
                                            {order.status === "PAID" ? (
                                                <Link
                                                    href="/mi-cuenta/descargas"
                                                    className="rk-btn rk-btn-buy"
                                                >
                                                    <DownloadIcon size={15} />
                                                    Descargar
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/tienda/${item.product.slug}`}
                                                    className="rk-btn rk-btn-line"
                                                >
                                                    Ver recurso
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {/* PAGO REAL, SOLO SI EXISTE */}
                                {order.payment && (
                                    <p className="rk-row-card-meta rk-row-card-foot">
                                        Pago: {order.payment.provider} · Estado:{" "}
                                        {order.payment.status}
                                    </p>
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
