"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

type Product = {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    price: number;
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

function getOrderStatusClass(status: string) {
    const classes: Record<string, string> = {
        PENDING: "bg-warning/12 text-warning",
        PAID: "bg-success/12 text-success",
        CANCELED: "bg-danger/10 text-danger",
        REFUNDED: "bg-ink/[0.05] text-ink/60",
    };

    return classes[status] || "bg-ink/[0.05] text-ink/60";
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
            <Navbar />

            <main className="mx-auto max-w-6xl px-4 sm:px-5 py-10 sm:py-16">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
                            RCKTDMG
                        </p>

                        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                            Mis compras
                        </h1>

                        <p className="mt-3 max-w-2xl text-ink/50">
                            Consulta tus pedidos, recursos adquiridos y estado
                            de tus compras.
                        </p>
                    </div>

                    <Link
                        href="/tienda"
                        className="w-fit rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
                    >
                        Explorar recursos
                    </Link>
                </div>

                {loading && (
                    <div className="mt-10 rk-card p-10">
                        <p className="text-sm text-ink/50">
                            Cargando tus compras...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="mt-10 rounded-3xl border border-danger/25 bg-danger/10 p-6">
                        <p className="text-sm text-danger">{error}</p>

                        <button
                            type="button"
                            onClick={loadOrders}
                            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary"
                        >
                            Intentar nuevamente
                        </button>
                    </div>
                )}

                {!loading && !error && orders.length === 0 && (
                    <div className="mt-10 rk-card p-12 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink/30">
                            Todavía no tienes compras
                        </p>

                        <h2 className="mt-3 text-2xl font-semibold">
                            Empieza a explorar recursos
                        </h2>

                        <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">
                            Cuando realices una compra, tus pedidos aparecerán
                            aquí.
                        </p>

                        <Link
                            href="/tienda"
                            className="mt-7 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary"
                        >
                            Ir a la tienda
                        </Link>
                    </div>
                )}

                {!loading && !error && orders.length > 0 && (
                    <section className="mt-10 space-y-5">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className="overflow-hidden rk-card"
                            >
                                <div className="border-b border-ink/[0.07] p-6">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                                                Pedido
                                            </p>

                                            <p className="mt-1 break-all font-mono text-sm">
                                                #{order.id}
                                            </p>

                                            <p className="mt-2 text-sm text-ink/45">
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs text-ink/40">
                                                    Total
                                                </p>

                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatMoney(order.total)}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${getOrderStatusClass(
                                                    order.status
                                                )}`}
                                            >
                                                {getOrderStatusLabel(
                                                    order.status
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-ink/[0.07]">
                                    {order.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-ink/[0.05]">
                                                    {item.product.coverUrl ? (
                                                        <img
                                                            src={
                                                                item.product
                                                                    .coverUrl
                                                            }
                                                            alt={
                                                                item.product
                                                                    .name
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-[9px] tracking-widest text-ink/25">
                                                            RCKTDMG
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="font-semibold">
                                                        {item.product.name}
                                                    </p>

                                                    <p className="mt-1 text-sm text-ink/45">
                                                        Cantidad:{" "}
                                                        {item.quantity}
                                                    </p>

                                                    <p className="mt-1 text-sm text-ink/45">
                                                        Precio:{" "}
                                                        {formatMoney(
                                                            item.price
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/tienda/${item.product.slug}`}
                                                    className="rounded-full border border-ink/10 px-4 py-2.5 text-sm font-medium transition hover:bg-primary hover:text-onprimary"
                                                >
                                                    Ver recurso
                                                </Link>

                                                {order.status === "PAID" && (
                                                    <Link
                                                        href="/mi-cuenta"
                                                        className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                                                    >
                                                        Mis recursos
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {order.payment && (
                                    <div className="border-t border-ink/[0.07] bg-ink/[0.05] px-6 py-4">
                                        <div className="flex flex-col gap-2 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between">
                                            <span>
                                                Pago:{" "}
                                                {order.payment.provider}
                                            </span>

                                            <span>
                                                Estado del pago:{" "}
                                                {order.payment.status}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </main>
        </>
    );
}