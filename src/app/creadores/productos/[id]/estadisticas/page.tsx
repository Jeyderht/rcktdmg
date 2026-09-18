"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type StatsData = {
    product: {
        id: string;
        name: string;
        slug: string;
        description: string;
        price: number;
        status: string;
        coverUrl: string | null;
        createdAt: string;
    };

    stats: {
        sales: number;
        revenue: number;
        downloads: number;
        favorites: number;
    };

    monthlyStats: {
        month: string;
        label: string;
        revenue: number;
        sales: number;
        downloads: number;
    }[];

    recentSales: {
        id: string;
        quantity: number;
        amount: number;
        buyerName: string;
        createdAt: string;
    }[];
};

function formatMoney(value: number) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2,
    }).format(value);
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

function getStatusLabel(status: string) {
    switch (status) {
        case "DRAFT":
            return "Borrador";

        case "PENDING_REVIEW":
            return "Pendiente de revisión";

        case "PUBLISHED":
            return "Publicado";

        case "REJECTED":
            return "Rechazado";

        case "ARCHIVED":
            return "Archivado";

        default:
            return status;
    }
}

export default function ProductStatisticsPage() {
    const params = useParams();
    const id = params.id as string;

    const [data, setData] =
        useState<StatsData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true);

                const response = await fetch(
                    `/api/creadores/productos/${id}/estadisticas`,
                    {
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        "No se pudieron cargar las estadísticas."
                    );
                }

                setData(result);
            } catch (error) {
                console.error(error);

                setError(
                    error instanceof Error
                        ? error.message
                        : "No se pudieron cargar las estadísticas."
                );
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            loadStats();
        }
    }, [id]);

    if (loading) {
        return (
            <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
                <div className="mx-auto max-w-6xl">
                    <div className="rk-card p-12 text-center">
                        <p className="text-sm text-ink/40">
                            Cargando estadísticas...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-3xl border border-danger/25 bg-danger/10 p-8">
                        <p className="text-sm text-danger">
                            {error ||
                                "No se pudo cargar el recurso."}
                        </p>

                        <Link
                            href="/creadores/panel/recursos"
                            className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-onprimary"
                        >
                            Volver a mis recursos
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const { product, stats } = data;

    const maxRevenue = Math.max(
        ...data.monthlyStats.map(
            (month) => month.revenue
        ),
        1
    );

    return (
        <main className="min-h-screen px-4 sm:px-5 py-10">
            <div className="mx-auto max-w-6xl">

                {/* HEADER */}

                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                    <div className="flex items-center gap-4">

                        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-ink/[0.05]">
                            {product.coverUrl ? (
                                <img
                                    src={product.coverUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-[9px] tracking-widest text-ink/25">
                                    RCKTDMG
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-ink/35">
                                Estadísticas del recurso
                            </p>

                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                                {product.name}
                            </h1>

                            <p className="mt-1 text-sm text-ink/40">
                                {getStatusLabel(product.status)}
                            </p>
                        </div>

                    </div>

                    <div className="flex gap-3">

                        <Link
                            href={`/creadores/productos/${product.id}`}
                            className="rounded-full border border-ink/10 bg-surface px-5 py-3 text-sm font-medium hover:bg-primary hover:text-onprimary"
                        >
                            Gestionar
                        </Link>

                        {product.status === "PUBLISHED" && (
                            <Link
                                href={`/tienda/${product.slug}`}
                                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary hover:opacity-80"
                            >
                                Ver recurso
                            </Link>
                        )}

                    </div>
                </div>

                {/* KPIs */}

                <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-3xl bg-primary p-6 text-onprimary">
                        <p className="text-sm text-onprimary/50">
                            Ingresos
                        </p>

                        <p className="mt-3 text-3xl font-semibold">
                            {formatMoney(stats.revenue)}
                        </p>

                        <p className="mt-2 text-xs text-onprimary/40">
                            Ventas pagadas
                        </p>
                    </div>

                    <div className="rk-card p-6">
                        <p className="text-sm text-ink/45">
                            Ventas
                        </p>

                        <p className="mt-3 text-3xl font-semibold">
                            {stats.sales}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Unidades vendidas
                        </p>
                    </div>

                    <div className="rk-card p-6">
                        <p className="text-sm text-ink/45">
                            Descargas
                        </p>

                        <p className="mt-3 text-3xl font-semibold">
                            {stats.downloads}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Descargas realizadas
                        </p>
                    </div>

                    <div className="rk-card p-6">
                        <p className="text-sm text-ink/45">
                            Favoritos
                        </p>

                        <p className="mt-3 text-3xl font-semibold">
                            {stats.favorites}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Veces guardado
                        </p>
                    </div>

                </section>

                {/* GRÁFICO */}

                {/* GRÁFICO */}
                <section className="mt-5 rk-card p-6 md:p-8">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                                Rendimiento
                            </p>

                            <h2 className="mt-1 text-xl font-semibold">
                                Rendimiento mensual
                            </h2>

                            <p className="mt-1 text-sm text-ink/40">
                                Evolución de ingresos y ventas
                            </p>
                        </div>

                        <p className="text-xs text-ink/35">
                            Últimos 6 meses
                        </p>

                    </div>

                    {/* LEYENDA */}

                    <div className="mt-6 flex gap-5 text-xs text-ink/50">

                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            Ingresos
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full border border-ink/30 bg-surface" />
                            Ventas
                        </div>

                    </div>

                    {/* GRÁFICO */}

                    <div className="mt-8 overflow-x-auto">
                        <div className="flex min-w-[620px] items-end gap-4 sm:gap-6">

                            {data.monthlyStats.map((month) => {

                                const revenueHeight =
                                    month.revenue > 0
                                        ? Math.max(
                                            (month.revenue / maxRevenue) * 100,
                                            8
                                        )
                                        : 3;

                                const salesHeight =
                                    month.sales > 0
                                        ? Math.max(
                                            (month.sales /
                                                Math.max(
                                                    ...data.monthlyStats.map(
                                                        (item) => item.sales
                                                    ),
                                                    1
                                                )) *
                                            100,
                                            8
                                        )
                                        : 3;

                                return (
                                    <div
                                        key={month.month}
                                        className="flex min-w-[80px] flex-1 flex-col items-center"
                                    >

                                        {/* DATOS */}

                                        <div className="mb-3 text-center">

                                            <p className="text-xs font-semibold">
                                                {formatMoney(month.revenue)}
                                            </p>

                                            <p className="mt-1 text-[10px] text-ink/40">
                                                {month.sales}{" "}
                                                {month.sales === 1
                                                    ? "venta"
                                                    : "ventas"}
                                            </p>

                                        </div>

                                        {/* BARRAS */}

                                        <div className="flex h-52 w-full items-end justify-center gap-1.5">

                                            {/* INGRESOS */}

                                            <div className="flex h-full w-[42%] items-end">
                                                <div
                                                    className="w-full rounded-t-xl bg-primary transition-all"
                                                    style={{
                                                        height: `${revenueHeight}%`,
                                                    }}
                                                />
                                            </div>

                                            {/* VENTAS */}

                                            <div className="flex h-full w-[42%] items-end">
                                                <div
                                                    className="w-full rounded-t-xl border border-ink/20 bg-surface transition-all"
                                                    style={{
                                                        height: `${salesHeight}%`,
                                                    }}
                                                />
                                            </div>

                                        </div>

                                        {/* MES */}

                                        <p className="mt-3 text-xs text-ink/40">
                                            {month.label}
                                        </p>

                                    </div>
                                );
                            })}

                        </div>
                    </div>

                </section>
                {/* RESUMEN */}

                <div className="mt-5 grid gap-4 md:grid-cols-3">

                    <div className="rk-card p-6">
                        <p className="text-xs uppercase tracking-[0.18em] text-ink/35">
                            Precio actual
                        </p>

                        <p className="mt-3 text-2xl font-semibold">
                            {formatMoney(product.price)}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Precio de venta del recurso
                        </p>
                    </div>

                    <div className="rk-card p-6">
                        <p className="text-xs uppercase tracking-[0.18em] text-ink/35">
                            Ingreso promedio
                        </p>

                        <p className="mt-3 text-2xl font-semibold">
                            {stats.sales > 0
                                ? formatMoney(stats.revenue / stats.sales)
                                : formatMoney(0)}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Ingreso promedio por unidad
                        </p>
                    </div>

                    <div className="rk-card p-6">
                        <p className="text-xs uppercase tracking-[0.18em] text-ink/35">
                            Descargas por venta
                        </p>

                        <p className="mt-3 text-2xl font-semibold">
                            {stats.sales > 0
                                ? (stats.downloads / stats.sales).toFixed(1)
                                : "0.0"}
                        </p>

                        <p className="mt-2 text-xs text-ink/40">
                            Promedio de descargas
                        </p>
                    </div>

                </div>

                {/* VENTAS RECIENTES */}

                <section className="mt-5 rk-card p-6 md:p-8">

                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                            Actividad
                        </p>

                        <h2 className="mt-1 text-xl font-semibold">
                            Últimas ventas
                        </h2>
                    </div>

                    <div className="mt-6 divide-y divide-ink/[0.07]">

                        {data.recentSales.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm text-ink/40">
                                    Todavía no hay ventas para este recurso.
                                </p>
                            </div>
                        ) : (
                            data.recentSales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between gap-4 py-5"
                                >

                                    <div>
                                        <p className="text-sm font-semibold">
                                            {sale.buyerName}
                                        </p>

                                        <p className="mt-1 text-xs text-ink/40">
                                            {formatDate(sale.createdAt)}
                                            {" · "}
                                            {sale.quantity}{" "}
                                            {sale.quantity === 1
                                                ? "unidad"
                                                : "unidades"}
                                        </p>
                                    </div>

                                    <p className="text-sm font-semibold">
                                        {formatMoney(sale.amount)}
                                    </p>

                                </div>
                            ))
                        )}

                    </div>
                </section>

                {/* VOLVER */}

                <div className="mt-6">
                    <Link
                        href="/creadores/panel/recursos"
                        className="text-sm text-ink/45 hover:text-ink"
                    >
                        ← Volver a mis recursos
                    </Link>
                </div>

            </div>
        </main>
    );
}