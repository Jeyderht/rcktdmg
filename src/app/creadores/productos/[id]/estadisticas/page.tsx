"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, ChevronLeft, ExternalLink } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

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

function getStatusBadge(status: string) {
    switch (status) {
        case "PUBLISHED":
            return "rk-badge-success";

        case "PENDING_REVIEW":
            return "rk-badge-warning";

        case "REJECTED":
            return "rk-badge-danger";

        default:
            return "rk-badge-neutral";
    }
}

export default function ProductStatisticsPage() {
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
                <div className="h-4 w-28 animate-pulse rounded-full bg-ink/[0.06]" />
                <div className="mt-5 h-9 w-64 animate-pulse rounded-full bg-ink/[0.06]" />

                <div
                    className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    aria-busy="true"
                >
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="rk-card p-5">
                            <div className="h-3 w-20 animate-pulse rounded-full bg-ink/[0.06]" />
                            <div className="mt-4 h-8 w-24 animate-pulse rounded-full bg-ink/[0.07]" />
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
                <div
                    role="alert"
                    className="rk-fade rounded-rk-md border border-danger/25 bg-danger/10 p-6"
                >
                    <p className="text-sm text-danger">
                        {error || "No se pudo cargar el recurso."}
                    </p>

                    <Link
                        href="/creadores/panel/recursos"
                        className="rk-btn rk-btn-primary mt-5 !min-h-0 !px-4 !py-2.5 !text-sm"
                    >
                        Volver a mis recursos
                    </Link>
                </div>
            </main>
        );
    }

    const { product, stats } = data;

    const maxRevenue = Math.max(
        ...data.monthlyStats.map((month) => month.revenue),
        1
    );

    // Sin ventas ni descargas no se dibuja un gráfico vacío.
    const hasChartData = data.monthlyStats.some(
        (month) =>
            month.revenue > 0 || month.sales > 0 || month.downloads > 0
    );

    const maxDownloads = Math.max(
        ...data.monthlyStats.map((month) => month.downloads),
        1
    );

    return (
        <>
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

                {/* ========== CABECERA ========== */}
                <header className="rk-fade-up">
                    <Link
                        href="/creadores/panel/recursos"
                        className="rk-press-sm -ml-1 inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-accent"
                    >
                        <ChevronLeft size={15} />
                        Mis recursos
                    </Link>

                    <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                            {/* Contenido visual 9:16, siempre nítido. */}
                            <div className="rk-media rk-aspect-product relative w-16 shrink-0 overflow-hidden rounded-rk-md sm:w-20">
                                {product.coverUrl ? (
                                    <Image
                                        src={product.coverUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                                        RCKTDMG
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <p className="rk-eyebrow">
                                    Estadísticas
                                </p>

                                <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
                                    {product.name}
                                </h1>

                                <span
                                    className={`rk-badge mt-3 ${getStatusBadge(
                                        product.status
                                    )}`}
                                >
                                    {getStatusLabel(product.status)}
                                </span>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Link
                                href={`/creadores/productos/${product.id}`}
                                className="rk-btn rk-btn-glass !min-h-0 !px-4 !py-2.5 !text-sm"
                            >
                                Gestionar
                            </Link>

                            {product.status === "PUBLISHED" && (
                                <Link
                                    href={`/tienda/${product.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rk-btn rk-btn-primary !min-h-0 !px-4 !py-2.5 !text-sm"
                                >
                                    <ExternalLink size={15} />
                                    Ver publicación
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* ========== MÉTRICAS REALES ========== */}
                <section className="rk-fade-up rk-enter-1 mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                    <div className="rk-card border-accent/25 bg-accent/[0.06] p-5">
                        <p className="rk-eyebrow !text-accent">
                            Ingresos
                        </p>

                        <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight text-accent">
                            {formatMoney(stats.revenue)}
                        </p>

                        <p className="mt-2 text-xs text-ink/60">
                            Ventas pagadas
                        </p>
                    </div>

                    {[
                        {
                            label: "Ventas",
                            value: stats.sales,
                            hint: "Unidades vendidas",
                        },
                        {
                            label: "Descargas",
                            value: stats.downloads,
                            hint: "Descargas realizadas",
                        },
                        {
                            label: "Favoritos",
                            value: stats.favorites,
                            hint: "Veces guardado",
                        },
                    ].map((item) => (
                        <div key={item.label} className="rk-card p-5">
                            <p className="rk-eyebrow">{item.label}</p>

                            <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight">
                                {item.value}
                            </p>

                            <p className="mt-2 text-xs text-ink/60">
                                {item.hint}
                            </p>
                        </div>
                    ))}
                </section>

                {/* ========== EVOLUCIÓN ========== */}
                <section className="rk-fade-up rk-enter-2 mt-10">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="rk-eyebrow">Evolución</p>

                            <h2 className="rk-title mt-2 text-2xl">
                                Ingresos y descargas
                            </h2>
                        </div>

                        <p className="text-sm text-ink/60">
                            Últimos 6 meses
                        </p>
                    </div>

                    <div className="rk-divider mt-4" />

                    {hasChartData ? (
                        <div className="rk-card mt-5 p-5 sm:p-6">
                            {/* LEYENDA */}
                            <div className="flex flex-wrap gap-5 text-xs text-ink/60">
                                <span className="flex items-center gap-2">
                                    <span
                                        aria-hidden
                                        className="h-2.5 w-2.5 rounded-full bg-accent"
                                    />
                                    Ingresos
                                </span>

                                <span className="flex items-center gap-2">
                                    <span
                                        aria-hidden
                                        className="h-2.5 w-2.5 rounded-full border border-line/25 bg-ink/[0.08]"
                                    />
                                    Descargas
                                </span>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <div className="flex min-w-[520px] items-end gap-4 sm:gap-6">
                                    {data.monthlyStats.map((month) => {
                                        const revenueHeight =
                                            month.revenue > 0
                                                ? Math.max(
                                                      (month.revenue /
                                                          maxRevenue) *
                                                          100,
                                                      8
                                                  )
                                                : 3;

                                        const downloadsHeight =
                                            month.downloads > 0
                                                ? Math.max(
                                                      (month.downloads /
                                                          maxDownloads) *
                                                          100,
                                                      8
                                                  )
                                                : 3;

                                        return (
                                            <div
                                                key={month.month}
                                                className="flex min-w-0 flex-1 flex-col items-center"
                                            >
                                                <p className="truncate text-[11px] font-semibold tabular-nums">
                                                    {formatMoney(
                                                        month.revenue
                                                    )}
                                                </p>

                                                <p className="mt-0.5 text-[10px] text-ink/60">
                                                    {month.sales}{" "}
                                                    {month.sales === 1
                                                        ? "venta"
                                                        : "ventas"}
                                                </p>

                                                <div className="mt-2 flex h-44 w-full items-end justify-center gap-1.5">
                                                    <div className="flex h-full w-[42%] items-end">
                                                        <div
                                                            className="w-full rounded-t-rk-sm bg-accent/85 transition-[height] duration-slow ease-rk"
                                                            style={{
                                                                height: `${revenueHeight}%`,
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="flex h-full w-[42%] items-end">
                                                        <div
                                                            className="w-full rounded-t-rk-sm border border-line/20 bg-ink/[0.08] transition-[height] duration-slow ease-rk"
                                                            style={{
                                                                height: `${downloadsHeight}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <p className="mt-3 truncate text-[11px] font-medium text-ink/60">
                                                    {month.label}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5">
                            <EmptyState
                                icon={BarChart3}
                                title="Todavía no hay datos suficientes"
                                description="Cuando este recurso registre ventas o descargas verás aquí su evolución."
                            />
                        </div>
                    )}
                </section>

                {/* ========== PROMEDIOS REALES ========== */}
                <section className="rk-fade-up mt-10">
                    <p className="rk-eyebrow">Resumen</p>

                    <div className="rk-divider mt-3" />

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rk-card p-5">
                            <p className="rk-eyebrow">Precio actual</p>

                            <p className="mt-3 text-xl font-semibold tabular-nums">
                                {formatMoney(product.price)}
                            </p>
                        </div>

                        {/* Promedios calculados sobre ventas reales. */}
                        {stats.sales > 0 && (
                            <>
                                <div className="rk-card p-5">
                                    <p className="rk-eyebrow">
                                        Ingreso por venta
                                    </p>

                                    <p className="mt-3 text-xl font-semibold tabular-nums">
                                        {formatMoney(
                                            stats.revenue / stats.sales
                                        )}
                                    </p>
                                </div>

                                <div className="rk-card p-5">
                                    <p className="rk-eyebrow">
                                        Descargas por venta
                                    </p>

                                    <p className="mt-3 text-xl font-semibold tabular-nums">
                                        {(
                                            stats.downloads / stats.sales
                                        ).toFixed(1)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ========== ÚLTIMAS VENTAS ========== */}
                <section className="rk-fade-up mt-10">
                    <p className="rk-eyebrow">Actividad</p>

                    <h2 className="rk-title mt-2 text-2xl">
                        Últimas ventas
                    </h2>

                    <div className="rk-divider mt-4" />

                    {data.recentSales.length === 0 ? (
                        <div className="mt-5">
                            <EmptyState
                                icon={BarChart3}
                                title="Todavía no hay ventas de este recurso"
                                description="Aquí aparecerá cada compra en cuanto se registre."
                            />
                        </div>
                    ) : (
                        <div className="rk-card rk-divider-y mt-5 px-4 sm:px-6">
                            {data.recentSales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between gap-4 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {sale.buyerName}
                                        </p>

                                        <p className="mt-1 text-xs text-ink/60">
                                            {formatDate(sale.createdAt)}
                                            {" · "}
                                            {sale.quantity}{" "}
                                            {sale.quantity === 1
                                                ? "unidad"
                                                : "unidades"}
                                        </p>
                                    </div>

                                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                                        {formatMoney(sale.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </>
    );
}
