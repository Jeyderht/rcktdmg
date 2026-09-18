import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Download, ShieldCheck } from "lucide-react";

import Navbar from "@/components/Navbar";
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
    const sameCategory = await prisma.product.findMany({
        where: {
            status: "PUBLISHED",
            categoryId: product.categoryId,
            id: { not: product.id },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            coverUrl: true,
            category: { select: { name: true, slug: true } },
            images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true, alt: true },
            },
        },
    });

    const others =
        sameCategory.length < 4
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
                  take: 4 - sameCategory.length,
                  select: {
                      id: true,
                      name: true,
                      slug: true,
                      price: true,
                      coverUrl: true,
                      category: { select: { name: true, slug: true } },
                      images: {
                          orderBy: { sortOrder: "asc" },
                          take: 1,
                          select: { url: true, alt: true },
                      },
                  },
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

            {/*
                Ficha centrada y con ancho acotado: en pantallas
                grandes deja aire a los lados en lugar de ocupar
                todo el ancho disponible.
            */}
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-8">

                {/* VOLVER */}
                <Link
                    href="/tienda"
                    className="rk-press mb-5 inline-flex items-center gap-1.5 text-sm text-ink/50 transition-colors hover:text-ink"
                >
                    <ArrowLeft size={15} />
                    Volver a recursos
                </Link>

                <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)] lg:gap-7">

                    {/* GALERÍA */}
                    <div className="rk-enter w-full min-w-0">
                        <ProductGallery
                            name={product.name}
                            coverUrl={product.coverUrl}
                            previewUrl={product.previewUrl}
                            images={product.images}
                        />
                    </div>

                    {/* INFORMACIÓN */}
                    <div className="rk-enter rk-enter-1 min-w-0 space-y-4">

                        <div className="rk-glass rounded-[1.5rem] p-4 sm:p-5">
                            <Link
                                href={`/tienda?categoria=${product.category.slug}`}
                                className="rk-eyebrow !tracking-[0.18em] transition-colors hover:text-ink"
                            >
                                {product.category.name}
                            </Link>

                            <h1 className="mt-2 text-[1.45rem] font-semibold leading-tight sm:text-2xl lg:text-[1.75rem]">
                                {product.name}
                            </h1>

                            <div className="mt-4 flex items-end justify-between gap-4">
                                <div>
                                    {pricing.hasPromotion ? (
                                        <>
                                            {/* PRECIO ANTERIOR: secundario y tachado */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-ink/40">
                                                    Antes
                                                </span>

                                                <span className="text-sm text-ink/40 line-through">
                                                    {formatPrice(
                                                        pricing.compareAtPrice as number
                                                    )}
                                                </span>

                                                <span className="rk-badge rk-badge-danger">
                                                    {pricing.discountPercent}% OFF
                                                </span>
                                            </div>

                                            {/* PRECIO ACTUAL: el que paga el cliente */}
                                            <p className="mt-1 text-[1.7rem] font-semibold tracking-tight">
                                                {formatPrice(pricing.price)}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-ink/40">
                                                Precio
                                            </p>

                                            <p className="text-[1.7rem] font-semibold tracking-tight">
                                                {formatPrice(pricing.price)}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <FavoriteButton productId={product.id} />
                            </div>

                            <div className="mt-4 space-y-2">
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

                            {/* GARANTÍAS */}
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink/[0.07] pt-4">
                                <div className="flex items-start gap-2">
                                    <Download
                                        size={15}
                                        className="mt-0.5 shrink-0 text-ink/40"
                                    />
                                    <span className="text-xs leading-5 text-ink/50">
                                        Descarga inmediata tras el pago
                                    </span>
                                </div>

                                <div className="flex items-start gap-2">
                                    <ShieldCheck
                                        size={15}
                                        className="mt-0.5 shrink-0 text-ink/40"
                                    />
                                    <span className="text-xs leading-5 text-ink/50">
                                        Acceso permanente desde tu cuenta
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CREADOR */}
                        <div className="rk-card flex items-center gap-3 p-3.5 sm:p-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-primary shadow-rk-sm">
                                {product.creator.avatarUrl ? (
                                    <img
                                        src={product.creator.avatarUrl}
                                        alt={creatorName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-lg font-semibold text-onprimary">
                                        {creatorName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="rk-eyebrow !tracking-[0.16em]">
                                    Creador
                                </p>

                                <p className="mt-1 flex items-center gap-1.5 truncate font-medium">
                                    <span className="truncate">{creatorName}</span>

                                    {product.creator.isVerified && (
                                        <BadgeCheck
                                            size={15}
                                            className="shrink-0 fill-ink text-background"
                                        />
                                    )}
                                </p>
                            </div>

                            {creatorProfileUrl && (
                                <Link
                                    href={creatorProfileUrl}
                                    className="rk-btn rk-btn-glass shrink-0 !px-4 !py-2 !text-xs"
                                >
                                    Ver perfil
                                </Link>
                            )}
                        </div>

                        {/* DESCRIPCIÓN */}
                        <div className="rk-card p-4 sm:p-5">
                            <h2 className="text-sm font-semibold">
                                Sobre este recurso
                            </h2>

                            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-ink/55">
                                {product.description}
                            </p>
                        </div>

                        {/*
                            FICHA TÉCNICA
                            Solo se muestran los datos que existen
                            realmente: formato y tamaño salen del
                            archivo en disco, el resto de la base
                            de datos. Nada se inventa.
                        */}
                        {specs.length > 0 && (
                            <div className="rk-card p-4 sm:p-5">
                                <h2 className="text-sm font-semibold">
                                    Detalles del recurso
                                </h2>

                                <dl className="mt-3 divide-y divide-ink/[0.07]">
                                    {specs.map((spec) => (
                                        <div
                                            key={spec.label}
                                            className="flex items-center justify-between gap-4 py-2.5"
                                        >
                                            <dt className="text-sm text-ink/45">
                                                {spec.label}
                                            </dt>

                                            <dd className="text-sm font-medium">
                                                {spec.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}
                    </div>
                </div>

                {/* TAMBIÉN TE PUEDE INTERESAR */}
                {suggestions.length > 0 && (
                    <section className="rk-enter rk-enter-2 mt-12">
                        <h2 className="text-xl font-semibold sm:text-2xl">
                            También te puede interesar
                        </h2>

                        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
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
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </>
    );
}
