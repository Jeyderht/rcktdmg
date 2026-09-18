"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function formatDate(value: string | null) {
    if (!value) return "Sin vencimiento";

    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
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

function getStatusClass(status: string) {
    const classes: Record<string, string> = {
        ACTIVE: "bg-success/12 text-success",
        EXPIRED: "bg-warning/12 text-warning",
        REVOKED: "bg-danger/10 text-danger",
    };

    return classes[status] || "bg-ink/[0.05] text-ink/60";
}

export default function MisDescargasPage() {
    const [downloads, setDownloads] = useState<Download[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

            const filenameMatch =
                contentDisposition?.match(
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

            <main className="mx-auto max-w-6xl px-4 sm:px-5 py-10 sm:py-16">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
                            RCKTDMG
                        </p>

                        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                            Mis descargas
                        </h1>

                        <p className="mt-3 max-w-2xl text-ink/50">
                            Accede a los recursos digitales que has
                            adquirido.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/mi-cuenta/compras"
                            className="rk-btn rk-btn-glass"
                        >
                            Mis compras
                        </Link>

                        <Link
                            href="/tienda"
                            className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
                        >
                            Explorar recursos
                        </Link>
                    </div>
                </div>

                {loading && (
                    <div className="mt-10 rk-card p-10">
                        <p className="text-sm text-ink/50">
                            Cargando tus recursos...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="mt-10 rounded-3xl border border-danger/25 bg-danger/10 p-6">
                        <p className="text-sm text-danger">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadDownloads}
                            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary"
                        >
                            Intentar nuevamente
                        </button>
                    </div>
                )}

                {!loading &&
                    !error &&
                    downloads.length === 0 && (
                        <div className="mt-10 rk-card p-12 text-center">
                            <p className="text-xs uppercase tracking-[0.2em] text-ink/30">
                                Sin recursos
                            </p>

                            <h2 className="mt-3 text-2xl font-semibold">
                                Todavía no tienes descargas
                            </h2>

                            <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">
                                Cuando realices una compra y el pedido
                                sea pagado, tus recursos aparecerán aquí.
                            </p>

                            <Link
                                href="/tienda"
                                className="mt-7 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary"
                            >
                                Ir a la tienda
                            </Link>
                        </div>
                    )}

                {!loading &&
                    !error &&
                    downloads.length > 0 && (
                        <section className="mt-10 grid gap-5 md:grid-cols-2">
                            {downloads.map((download) => {
                                const isActive =
                                    download.status === "ACTIVE" &&
                                    download.order.status === "PAID";

                                return (
                                    <article
                                        key={download.id}
                                        className="overflow-hidden rk-card"
                                    >
                                        <div className="aspect-[16/7] overflow-hidden bg-ink/[0.05]">
                                            {download.product.coverUrl ? (
                                                <img
                                                    src={
                                                        download.product
                                                            .coverUrl
                                                    }
                                                    alt={
                                                        download.product
                                                            .name
                                                    }
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs tracking-[0.25em] text-ink/25">
                                                    RCKTDMG
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.2em] text-ink/35">
                                                        Recurso digital
                                                    </p>

                                                    <h2 className="mt-2 text-xl font-semibold">
                                                        {
                                                            download
                                                                .product
                                                                .name
                                                        }
                                                    </h2>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
                                                        download.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        download.status
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-6 grid gap-3 rounded-2xl bg-ink/[0.05] p-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-xs text-ink/40">
                                                        Comprado
                                                    </p>

                                                    <p className="mt-1 text-sm font-medium">
                                                        {formatDate(
                                                            download.order
                                                                .createdAt
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-ink/40">
                                                        Descargas
                                                    </p>

                                                    <p className="mt-1 text-sm font-medium">
                                                        {
                                                            download.downloadCount
                                                        }
                                                    </p>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <p className="text-xs text-ink/40">
                                                        Acceso
                                                    </p>

                                                    <p className="mt-1 text-sm font-medium">
                                                        {formatDate(
                                                            download.expiresAt
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDownload(
                                                            download.id
                                                        )
                                                    }
                                                    disabled={
                                                        !isActive ||
                                                        downloadingId ===
                                                            download.id
                                                    }
                                                    className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {downloadingId ===
                                                    download.id
                                                        ? "Descargando..."
                                                        : isActive
                                                          ? "Descargar recurso"
                                                          : "Descarga no disponible"}
                                                </button>

                                                <Link
                                                    href={`/tienda/${download.product.slug}`}
                                                    className="rounded-full border border-ink/10 px-5 py-3 text-center text-sm font-medium transition hover:bg-primary hover:text-onprimary"
                                                >
                                                    Ver recurso
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    )}
            </main>
        </>
    );
}