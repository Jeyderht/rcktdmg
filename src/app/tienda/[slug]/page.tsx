import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    BadgeCheck,
    ChevronRight,
    Download,
    ShieldCheck,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import AddToCartButton from "./AddToCartButton";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCollectionButton from "@/components/AddToCollectionButton";
import ProductGallery from "./ProductGallery";
import ProductCard from "@/components/ProductCard";
import { getPriceDisplay, formatPrice } from "@/lib/pricing";
import { getProductFileInfo } from "@/lib/product-file";

export const dynamic = "force-dynamic";

type ProductPageProps = {
    params: Promise<{ slug: string }>;
};

async function getPublishedProduct(slug: string) {
    const product = await prisma.product.findUnique({
        where: {
            slug,
        },
        include: {
            category: true,
            creator: {
                select: {
                    id: true,
                    name: true,
                    publicName: true,
                    username: true,
                    avatarUrl: true,
                    isVerified: true,
                    creatorStatus: true,
                },
            },
            images: {
                orderBy: {
                    sortOrder: "asc",
                },
            },
        },
    });

    // Los recursos DRAFT, PENDING_REVIEW, REJECTED y
    // ARCHIVED nunca son visibles públicamente.
    if (!product || product.status !== "PUBLISHED") {
        return null;
    }

    return product;
}

export async function generateMetadata({
    params,
}: ProductPageProps): Promise<Metadata> {
    const { slug } = await params;

    const product = await getPublishedProduct(slug);

    if (!product) {
        return {
            title: "Recurso no encontrado",
        };
    }

    return {
        title: product.name,
        description: product.description.slice(0, 160),
    };
}

export default async function ProductPage({
    params,
}: ProductPageProps) {
    const { slug } = await params;

    const product = await getPublishedProduct(slug);

    if (!product) {
        notFound();
    }

    const creatorName =
        product.creator.publicName ||
        product.creator.name ||
        "Creador RCKTDMG";

    /*
     * Precio y promoción.
     *
     * Hoy `Product` solo guarda `price`, así que nunca hay
     * promoción y se muestra un único precio. Ver
     * src/lib/pricing.ts para activarla cuando exista un
     * campo de precio anterior en la base de datos.
     */
    const pricing = getPriceDisplay(Number(product.price));

    // Ficha técnica: solo datos que existen de verdad.
    const fileInfo = await getProductFileInfo(product.fileUrl);

    const accessTypeLabel: Record<string, string> = {
        INDIVIDUAL: "Compra individual",
        PLAN: "Incluido en planes",
        BOTH: "Compra individual o plan",
    };

    const specs = [
        fileInfo.format && {
            label: "Formato",
            value: fileInfo.format,
        },
        fileInfo.size && {
            label: "Tamaño",
            value: fileInfo.size,
        },
        product.images.length > 0 && {
            label: "Imágenes",
            value: String(product.images.length),
        },
        accessTypeLabel[product.accessType] && {
            label: "Acceso",
            value: accessTypeLabel[product.accessType],
        },
        {
            label: "Actualizado",
            value: new Intl.DateTimeFormat("es-PE", {
                dateStyle: "medium",
            }).format(product.updatedAt),
        },
    ].filter(Boolean) as { label: string; value: string }[];

    /*
     * SUGERENCIAS
     * Productos reales, publicados y distintos del actual.
     * Primero los de la misma categoría; si faltan, se
     * completa con otros publicados. Si no hay ninguno, la
     * sección no se muestra.
     */
    const suggestionSelect = {
        id: true,
        name: true,
        slug: true,
        price: true,
        coverUrl: true,
        category: { select: { name: true, slug: true } },
        creator: {
            select: {
                name: true,
                publicName: true,
                username: true,
                creatorStatus: true,
            },
        },
        images: {
            orderBy: { sortOrder: "asc" as const },
            take: 1,
            select: { url: true, alt: true },
        },
    };

    const sameCategory = await prisma.product.findMany({
        where: {
            status: "PUBLISHED",
            categoryId: product.categoryId,
            id: { not: product.id },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: suggestionSelect,
    });

    const others =
        sameCategory.length < 6
            ? await prisma.product.findMany({
                  where: {
                      status: "PUBLISHED",
                      id: {
                          notIn: [
                              product.id,
                              ...sameCategory.map((item) => item.id),
                          ],
                      },
                  },
                  orderBy: { createdAt: "desc" },
                  take: 6 - sameCategory.length,
                  select: suggestionSelect,
              })
            : [];

    const suggestions = [...sameCategory, ...others];

    // El perfil público solo existe si el creador tiene
    // username y está aprobado.
    const creatorProfileUrl =
        product.creator.username &&
        product.creator.creatorStatus === "APPROVED"
            ? `/creadores/${product.creator.username}`
            : null;

    return (
        <>
            <Navbar />

            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-5 lg:pb-20 lg:pt-8">

                {/* ══════════ BREADCRUMBS ══════════ */}
                <nav
                    aria-label="Ruta de navegación"
                    className="rk-fade-up mb-6 flex items-center gap-1.5 overflow-x-auto text-[13px] text-ink/60"
                >
                    <Link
                        href="/tienda"
                        className="rk-press shrink-0 transition-colors hover:text-accent"
                    >
                        Tienda
                    </Link>

                    <ChevronRight size={13} className="shrink-0 text-ink/45" />

                    <Link
                        href={`/tienda?categoria=${product.category.slug}`}
                        className="rk-press shrink-0 transition-colors hover:text-accent"
                    >
                        {product.category.name}
                    </Link>

                    <ChevronRight size={13} className="shrink-0 text-ink/45" />

                    <span
                        aria-current="page"
                        className="truncate font-medium text-ink/70"
                    >
                        {product.name}
                    </span>
                </nav>

                {/*
                    La galería lleva el peso visual, pero con un
                    ancho acotado: el contenido es 9:16 y una
                    columna ancha lo volvería desproporcionadamente
                    alto en escritorio.
                */}
                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-10">

                    {/* ══════════ GALERÍA ══════════ */}
                    <div className="rk-fade-up w-full min-w-0">
                        <ProductGallery
                            name={product.name}
                            coverUrl={product.coverUrl}
                            previewUrl={product.previewUrl}
                            images={product.images}
                        />
                    </div>

                    {/* ══════════ INFORMACIÓN ══════════ */}
                    <div className="rk-fade-up rk-enter-1 min-w-0">

                        <p className="rk-eyebrow">Recurso digital</p>

                        <h1 className="rk-title mt-2.5 text-[1.6rem] sm:text-3xl lg:text-[2.1rem]">
                            {product.name}
                        </h1>

                        {/* CATEGORÍA Y ACCESO: datos reales */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <Link
                                href={`/tienda?categoria=${product.category.slug}`}
                                className="rk-chip !py-1.5 !text-[12px]"
                            >
                                {product.category.name}
                            </Link>

                            {accessTypeLabel[product.accessType] && (
                                <span className="rk-badge rk-badge-accent">
                                    {accessTypeLabel[product.accessType]}
                                </span>
                            )}
                        </div>

                        {/* ── PRECIO Y COMPRA ── */}
                        <div className="rk-glass mt-6 rounded-rk-lg p-4 sm:p-5">
                            <div className="flex items-end justify-between gap-4">
                                <div className="min-w-0">
                                    {pricing.hasPromotion ? (
                                        <>
                                            {/* Precio anterior: secundario y tachado */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-ink/60">
                                                    Antes
                                                </span>

                                                <span className="text-sm text-ink/60 line-through">
                                                    {formatPrice(
                                                        pricing.compareAtPrice as number
                                                    )}
                                                </span>

                                                <span className="rk-badge rk-badge-danger">
                                                    {pricing.discountPercent}% OFF
                                                </span>
                                            </div>

                                            <p className="mt-1 text-[2rem] font-semibold leading-none tracking-tight">
                                                {formatPrice(pricing.price)}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="rk-eyebrow !tracking-[0.16em]">
                                                Precio
                                            </p>

                                            <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight">
                                                {formatPrice(pricing.price)}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <FavoriteButton productId={product.id} />
                            </div>

                            <div className="mt-5 space-y-2">
                                <AddToCartButton
                                    product={{
                                        id: product.id,
                                        name: product.name,
                                        price: Number(product.price),
                                        slug: product.slug,
                                        coverUrl:
                                            product.coverUrl ||
                                            product.images[0]?.url ||
                                            null,
                                    }}
                                />

                                <AddToCollectionButton productId={product.id} />
                            </div>

                            {/* Condiciones reales del marketplace */}
                            <div className="rk-divider my-4" />

                            <ul className="grid gap-2.5 sm:grid-cols-2">
                                <li className="flex items-start gap-2">
                                    <Download
                                        size={14}
                                        className="mt-0.5 shrink-0 text-accent"
                                    />
                                    <span className="text-xs leading-5 text-ink/60">
                                        Descarga inmediata tras el pago
                                    </span>
                                </li>

                                <li className="flex items-start gap-2">
                                    <ShieldCheck
                                        size={14}
                                        className="mt-0.5 shrink-0 text-accent"
                                    />
                                    <span className="text-xs leading-5 text-ink/60">
                                        Acceso permanente desde tu cuenta
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* ── CREADOR ── */}
                        <div className="rk-card rk-hover-lift mt-4 flex items-center gap-3.5 p-3.5 sm:p-4">
                            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-rk-sm bg-primary text-lg font-semibold text-onprimary">
                                {product.creator.avatarUrl ? (
                                    <Image
                                        src={product.creator.avatarUrl}
                                        alt={creatorName}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                ) : (
                                    creatorName.charAt(0).toUpperCase()
                                )}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="rk-eyebrow !tracking-[0.16em]">
                                    Creador
                                </p>

                                <p className="mt-1 flex items-center gap-1.5">
                                    <span className="truncate text-[14px] font-semibold">
                                        {creatorName}
                                    </span>

                                    {product.creator.isVerified && (
                                        <BadgeCheck
                                            size={14}
                                            className="shrink-0 text-accent"
                                            aria-label="Creador verificado"
                                        />
                                    )}
                                </p>

                                {product.creator.username && (
                                    <p className="truncate text-[11px] text-ink/60">
                                        @{product.creator.username}
                                    </p>
                                )}
                            </div>

                            {creatorProfileUrl && (
                                <Link
                                    href={creatorProfileUrl}
                                    className="rk-btn rk-btn-glass shrink-0 !min-h-0 !px-4 !py-2 !text-xs"
                                >
                                    Ver perfil
                                </Link>
                            )}
                        </div>

                        {/* ── DESCRIPCIÓN ── */}
                        <section className="rk-card mt-4 p-4 sm:p-5">
                            <h2 className="text-sm font-semibold">
                                Sobre este recurso
                            </h2>

                            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-ink/60">
                                {product.description}
                            </p>
                        </section>

                        {/*
                            ── DETALLES DEL ARCHIVO ──
                            Solo datos que existen de verdad: formato y
                            tamaño salen del archivo en disco, el resto
                            de la base de datos. Lo que no se conoce,
                            no se muestra.
                        */}
                        {specs.length > 0 && (
                            <section className="rk-card mt-4 p-4 sm:p-5">
                                <h2 className="text-sm font-semibold">
                                    Detalles del recurso
                                </h2>

                                <dl className="rk-divider-y mt-3">
                                    {specs.map((spec) => (
                                        <div
                                            key={spec.label}
                                            className="flex items-center justify-between gap-4 py-2.5"
                                        >
                                            <dt className="text-sm text-ink/60">
                                                {spec.label}
                                            </dt>

                                            <dd className="text-right text-sm font-medium">
                                                {spec.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        )}
                    </div>
                </div>

                {/* ══════════ MÁS RECURSOS ══════════ */}
                {suggestions.length > 0 && (
                    <section className="rk-fade-up rk-enter-2 mt-14 lg:mt-20">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="rk-eyebrow">Sigue explorando</p>

                                <h2 className="rk-title mt-2 text-xl sm:text-2xl">
                                    También te puede interesar
                                </h2>
                            </div>

                            <Link
                                href="/tienda"
                                className="rk-press text-sm font-medium text-ink/60 transition-colors hover:text-accent"
                            >
                                Ver todos
                            </Link>
                        </div>

                        <div className="rk-divider mt-4" />

                        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                            {suggestions.map((item) => (
                                <ProductCard
                                    key={item.id}
                                    product={{
                                        id: item.id,
                                        name: item.name,
                                        slug: item.slug,
                                        price: Number(item.price),
                                        coverUrl: item.coverUrl,
                                        image: item.images[0] ?? null,
                                        category: item.category,
                                        creator: {
                                            name:
                                                item.creator.publicName ||
                                                item.creator.name ||
                                                "Creador",
                                            username:
                                                item.creator.creatorStatus ===
                                                "APPROVED"
                                                    ? item.creator.username
                                                    : null,
                                        },
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </>
    );
}
