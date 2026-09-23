"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download as DownloadIcon, Inbox } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

type Download = {
    id: string;
    downloadCount: number;
    status: string;
    expiresAt: string | null;
    product: {
        id: string;
        name: string;
        slug: string;
        coverUrl: string | null;
        description: string | null;
        fileUrl: string | null;
    };
    order: {
        id: string;
        createdAt: string;
        status: string;
    };
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
        ACTIVE: "Disponible",
        EXPIRED: "Expirada",
        REVOKED: "Revocada",
    };

    return labels[status] || status;
}

function getStatusBadge(status: string) {
    const classes: Record<string, string> = {
        ACTIVE: "rk-badge-success",
        EXPIRED: "rk-badge-warning",
        REVOKED: "rk-badge-danger",
    };

    return classes[status] || "rk-badge-neutral";
}

export default function MisDescargasPage() {
    const [downloads, setDownloads] = useState<Download[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] = useState<string | null>(
        null
    );

    async function loadDownloads() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/downloads", {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudieron cargar tus descargas."
                );
            }

            setDownloads(data.downloads || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar tus descargas."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDownloads();
    }, []);

    async function handleDownload(downloadId: string) {
        try {
            setDownloadingId(downloadId);

            const response = await fetch(
                `/api/downloads/${downloadId}`
            );

            if (!response.ok) {
                const data = await response.json().catch(() => null);

                throw new Error(
                    data?.error || "No se pudo descargar el archivo."
                );
            }

            const blob = await response.blob();

            const contentDisposition =
                response.headers.get("Content-Disposition");

            let filename = "recurso-rcktdmg";

            const filenameMatch = contentDisposition?.match(
                /filename="([^"]+)"/
            );

            if (filenameMatch?.[1]) {
                filename = filenameMatch[1];
            }

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            await loadDownloads();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo descargar el archivo."
            );
        } finally {
            setDownloadingId(null);
        }
    }

    return (
        <>
            <Navbar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
                <AccountPageHeader
                    title="Mis descargas"
                    subtitle="Accede a los recursos que tienes disponibles."
                />

                {/* CARGANDO */}
                {loading && (
                    <div
                        className="mt-8 grid gap-3 md:grid-cols-2"
                        aria-busy="true"
                    >
                        {[0, 1].map((index) => (
                            <div
                                key={index}
                                className="rk-card flex gap-4 p-4"
                            >
                                <div className="rk-aspect-product w-20 shrink-0 animate-pulse rounded-rk-sm bg-ink/[0.06]" />

                                <div className="min-w-0 flex-1">
                                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-ink/[0.06]" />
                                    <div className="mt-2.5 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
                                    <div className="mt-6 h-9 w-full animate-pulse rounded-full bg-ink/[0.06]" />
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
                            onClick={loadDownloads}
                            className="rk-btn rk-btn-primary mt-4 rk-btn-compact !px-4 !py-2.5 !text-sm"
                        >
                            Intentar nuevamente
                        </button>
                    </div>
                )}

                {/* VACÍO */}
                {!loading && !error && downloads.length === 0 && (
                    <div className="mt-8">
                        <EmptyState
                            icon={Inbox}
                            title="No tienes descargas disponibles"
                            description="Cuando un pedido quede pagado, su recurso aparecerá aquí listo para descargar."
                            action={{
                                href: "/tienda",
                                label: "Explorar recursos",
                            }}
                            secondaryAction={{
                                href: "/mi-cuenta/compras",
                                label: "Ver mis compras",
                            }}
                        />
                    </div>
                )}

                {/* RECURSOS */}
                {!loading && !error && downloads.length > 0 && (
                    <>
                        <div className="rk-fade-up mt-8 flex items-baseline justify-between gap-4">
                            <p className="text-[15px] text-ink/60">
                                Tus recursos
                            </p>

                            <span className="text-sm font-medium text-ink/60">
                                {downloads.length}{" "}
                                {downloads.length === 1
                                    ? "recurso"
                                    : "recursos"}
                            </span>
                        </div>

                        <div className="rk-divider mt-4" />

                        <section className="rk-fade-up rk-enter-1 mt-5 grid gap-3 md:grid-cols-2">
                            {downloads.map((download) => {
                                const isActive =
                                    download.status === "ACTIVE" &&
                                    download.order.status === "PAID";

                                const isDownloading =
                                    downloadingId === download.id;

                                return (
                                    <article
                                        key={download.id}
                                        className="rk-card flex gap-4 p-4"
                                    >
                                        {/* Contenido visual 9:16, siempre nítido. */}
                                        <Link
                                            href={`/tienda/${download.product.slug}`}
                                            className="rk-press-sm shrink-0"
                                            aria-label={
                                                download.product.name
                                            }
                                        >
                                            <div className="rk-media rk-aspect-product relative w-20 overflow-hidden rounded-rk-sm sm:w-24">
                                                {download.product
                                                    .coverUrl ? (
                                                    <Image
                                                        src={
                                                            download.product
                                                                .coverUrl
                                                        }
                                                        alt={
                                                            download.product
                                                                .name
                                                        }
                                                        fill
                                                        className="object-cover"
                                                        sizes="96px"
                                                    />
                                                ) : (
                                                    <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                                                        RCKTDMG
                                                    </span>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <div className="flex items-start justify-between gap-3">
                                                <Link
                                                    href={`/tienda/${download.product.slug}`}
                                                    className="min-w-0"
                                                >
                                                    <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug transition-opacity hover:opacity-70">
                                                        {
                                                            download.product
                                                                .name
                                                        }
                                                    </h2>
                                                </Link>

                                                <span
                                                    className={`rk-badge shrink-0 ${getStatusBadge(
                                                        download.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        download.status
                                                    )}
                                                </span>
                                            </div>

                                            {/* Datos reales del registro. La fecha de
                                                vencimiento solo se muestra si existe. */}
                                            <dl className="mt-2.5 space-y-1 text-xs text-ink/60">
                                                <div className="flex gap-1.5">
                                                    <dt>Comprado:</dt>
                                                    <dd className="font-medium text-ink/60">
                                                        {formatDate(
                                                            download.order
                                                                .createdAt
                                                        )}
                                                    </dd>
                                                </div>

                                                {download.expiresAt && (
                                                    <div className="flex gap-1.5">
                                                        <dt>Disponible hasta:</dt>
                                                        <dd className="font-medium text-ink/60">
                                                            {formatDate(
                                                                download.expiresAt
                                                            )}
                                                        </dd>
                                                    </div>
                                                )}

                                                {download.downloadCount >
                                                    0 && (
                                                    <div className="flex gap-1.5">
                                                        <dt>Descargas:</dt>
                                                        <dd className="font-medium tabular-nums text-ink/60">
                                                            {
                                                                download.downloadCount
                                                            }
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>

                                            <div className="mt-auto pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDownload(
                                                            download.id
                                                        )
                                                    }
                                                    disabled={
                                                        !isActive ||
                                                        isDownloading
                                                    }
                                                    className="rk-btn rk-btn-primary rk-btn-compact w-full !py-2.5 !text-sm"
                                                >
                                                    <DownloadIcon
                                                        size={15}
                                                    />

                                                    {isDownloading
                                                        ? "Descargando..."
                                                        : isActive
                                                          ? "Descargar"
                                                          : "No disponible"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    </>
                )}
            </main>

            <Footer />
        </>
    );
}
