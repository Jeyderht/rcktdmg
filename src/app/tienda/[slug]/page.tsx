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
import SugerenciasFlyers from "./SugerenciasFlyers";
import ProductCard from "@/components/ProductCard";
import { getPriceDisplay, formatPrice } from "@/lib/pricing";
import { getProductFileInfo } from "@/lib/product-file";
import { COLORES, TAG_PACK } from "@/lib/catalogo";
import { tagsVisibles } from "@/lib/tags-comun";
import Valoraciones from "@/components/Valoraciones";
import Estrellas from "@/components/Estrellas";
import { LICENCIAS } from "@/lib/licencias-comun";
import {
    MINIMO_RESENAS_SCHEMA,
    absoluta,
    imagenSocial,
    migasSchema,
    noEncontrado,
    paginaPublica,
} from "@/lib/seo";
import { listarVersiones, mostrarVersion } from "@/lib/versiones";
import {
    paraProducto,
    sugerenciasDeFicha,
    packsQueIncluyen,
} from "@/lib/recomendaciones";
import PackCard from "@/components/PackCard";
import { proporcionDeRecurso } from "@/lib/tipos-publicacion";
import { getSession } from "@/lib/session";
import { tieneProducto } from "@/lib/adquisiciones";
import YaAdquirido from "@/components/YaAdquirido";

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

            /*
              Todas las etiquetas: la de pack decide el
              distintivo, y las descriptivas se enseñan como
              enlaces al catálogo.
            */
            tags: {
                select: { tag: { select: { name: true, slug: true } } },
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

    /*
      getPublishedProduct devuelve null para todo lo que no
      esté PUBLISHED, así que un borrador, uno en revisión, uno
      rechazado o uno archivado cae aquí: la página dará 404 y
      además queda marcada como no indexable.
    */
    if (!product) {
        return noEncontrado("Recurso");
    }

    /*
      Imagen social: la portada pública o la primera imagen de
      la galería. `imagenSocial` descarta cualquier referencia
      al almacén privado, así que el archivo que se vende no
      puede acabar en una etiqueta og:image.
    */
    const imagen =
        product.coverUrl ?? product.images[0]?.url ?? null;

    const descripcion = product.description
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);

    return paginaPublica({
        titulo: product.name,
        descripcion,
        ruta: `/tienda/${product.slug}`,
        imagen,
        tipo: "article",
    });
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

    /*
     * Formato: primero el del archivo real; si no se pudo leer,
     * el que quedó guardado en el recurso. Si no hay ninguno,
     * la fila no se pinta.
     */
    const formato =
        fileInfo.format ??
        (product.fileFormat ? product.fileFormat.toUpperCase() : null);

    const colorEtiqueta =
        COLORES.find((c) => c.valor === product.color)?.etiqueta ?? null;

    const etiquetasProducto = product.tags.map((fila) => fila.tag);

    const esPack = etiquetasProducto.some(
        (tag) => tag.slug === TAG_PACK
    );

    // Las estructurales no se enseñan: ya están en el distintivo.
    const etiquetasVisibles = tagsVisibles(etiquetasProducto);

    const accessTypeLabel: Record<string, string> = {
        INDIVIDUAL: "Compra individual",
        PLAN: "Incluido en planes",
        BOTH: "Compra individual o plan",
    };

    /*
      Historial de versiones.

      listarVersiones NO devuelve fileUrl: esa referencia
      apunta al almacén privado y no sale del servidor. Aquí
      solo se pintan número, formato, fecha y cambios.
    */
    const versiones = await listarVersiones(product.id);

    const versionActual = versiones.find((v) => v.isCurrent) ?? null;

    const specs = [
        formato && {
            label: "Formato",
            value: formato,
        },
        colorEtiqueta && {
            label: "Color",
            value: colorEtiqueta,
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
            // Con qué condiciones se vende: el comprador debe
            // saberlo ANTES de pagar, no al recibir la licencia.
            label: "Licencia",
            value: LICENCIAS[product.licenseType].etiqueta,
        },
        versionActual && {
            label: "Versión",
            value: mostrarVersion(versionActual.version),
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
    /*
     * RECOMENDACIONES
     *
     * Bloques con señal propia: del mismo creador, de la misma
     * categoría y por parecido general. Cada uno se pinta solo
     * si tiene contenido, y el título dice de dónde sale, sin
     * prometer una personalización que aquí no existe.
     *
     * La puntuación vive en src/lib/recomendaciones.ts y no
     * sale hacia el navegador.
     */
    const session = await getSession();

    const packsConEste = await packsQueIncluyen(product.id);

    /*
      ¿Ya es suyo?

      Se consulta aquí, en el servidor, y no en el botón: el
      navegador no puede saberlo sin una llamada más, y la
      respuesta llegaría después de pintar un botón "Añadir al
      carrito" que acto seguido tendría que desaparecer.
    */
    const yaEsSuyo = await tieneProducto(session?.userId, product.id);

    /*
      LAS DOS LISTAS DE RECOMENDACIÓN, A LA VEZ

      `paraProducto` alimenta los bloques del pie —"Más de este
      creador", "Más de esta categoría"— y `sugerenciasDeFicha`
      la tira animada que va junto a la zona de compra.

      Van en paralelo porque no dependen una de otra: el tiempo
      de respuesta es el de la más lenta, no la suma.

      Son listas distintas a propósito. Arriba interesa el
      parecido con lo que se está viendo, sin agrupar por señal;
      abajo, la señal concreta que da título a cada bloque. Con
      un catálogo pequeño algún recurso puede aparecer en las
      dos, y eso es preferible a dejar la tira medio vacía por
      reservarle solo lo que ningún bloque haya usado.
    */
    const referenciaReco = {
        id: product.id,
        categoryId: product.categoryId,
        creatorId: product.creatorId,
        fileFormat: product.fileFormat,
        color: product.color,
        price: Number(product.price),
        tagSlugs: product.tags.map((fila) => fila.tag.slug),
    };

    const [bloques, sugerencias] = await Promise.all([
        paraProducto(
            {
                ...referenciaReco,
                categoriaNombre: product.category.name,
                creadorNombre: creatorName,
            },
            session?.userId ?? null
        ),
        sugerenciasDeFicha(referenciaReco, session?.userId ?? null),
    ]);


    // El perfil público solo existe si el creador tiene
    // username y está aprobado.
    const creatorProfileUrl =
        product.creator.username &&
        product.creator.creatorStatus === "APPROVED"
            ? `/creadores/${product.creator.username}`
            : null;

    /*
      DATOS ESTRUCTURADOS

      Solo campos con un dato real detrás. Se omiten a
      propósito `brand`, `sku`, `availability` y `review`: el
      modelo no los tiene y rellenarlos sería declarar a Google
      información que no existe.

      `aggregateRating` solo se publica a partir de
      MINIMO_RESENAS_SCHEMA reseñas. Con una sola opinión, unas
      estrellas en los resultados de búsqueda transmiten una
      confianza que el dato no respalda.
    */
    const imagenSchema = imagenSocial(
        product.coverUrl ?? product.images[0]?.url ?? null
    );

    const productoSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 500),
        url: absoluta(`/tienda/${product.slug}`),
        ...(imagenSchema ? { image: [imagenSchema] } : {}),
        category: product.category.name,
        offers: {
            "@type": "Offer",
            price: Number(product.price).toFixed(2),
            priceCurrency: "PEN",
            url: absoluta(`/tienda/${product.slug}`),
        },
        ...(product.reviewCount >= MINIMO_RESENAS_SCHEMA &&
        product.avgRating
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: Number(product.avgRating).toFixed(1),
                      reviewCount: product.reviewCount,
                      bestRating: 5,
                      worstRating: 1,
                  },
              }
            : {}),
    };

    // Migas: exactamente los niveles que se ven arriba.
    /*
      Las mismas migas que se ven debajo de la cabecera, con
      los mismos nombres y los mismos destinos. Si el schema
      declarara un nivel que el visitante no ve, sería una
      jerarquía inventada para el buscador.
    */
    const migas = migasSchema([
        { nombre: "Tienda", ruta: "/tienda" },
        {
            nombre: product.category.name,
            ruta: `/tienda?categoria=${product.category.slug}`,
        },
        { nombre: product.name, ruta: `/tienda/${product.slug}` },
    ]);
    return (
        <>
            <Navbar />
            {/*
              JSON-LD. Se genera en el servidor y solo contiene
              datos que ya son públicos en esta misma página.
            */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(productoSchema),
                }}
            />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(migas),
                }}
            />

            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-5 lg:pb-20 lg:pt-8">

                {/* ══════════ BREADCRUMBS ══════════ */}
                <nav
                    aria-label="Ruta de navegación"
                    className="rk-fade-up mb-3 flex items-center gap-1 overflow-x-auto text-[13px] text-ink/60"
                >
                    <Link
                        href="/tienda"
                        className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center rounded-full px-1.5 transition-colors hover:text-ink"
                    >
                        Tienda
                    </Link>

                    <ChevronRight size={13} className="shrink-0 text-ink/45" />

                    <Link
                        href={`/tienda?categoria=${product.category.slug}`}
                        className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center rounded-full px-1.5 transition-colors hover:text-ink"
                    >
                        {product.category.name}
                    </Link>

                    <ChevronRight size={13} className="shrink-0 text-ink/45" />

                    <span
                        aria-current="page"
                        className="inline-flex min-h-[2.75rem] items-center truncate px-1.5 font-medium text-ink/70"
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
                            /*
                              9:16 solo para la story de evento;
                              4:5 para el resto del catálogo. Lo
                              decide la misma función que exige
                              la medida al subir la portada.
                            */
                            proporcion={proporcionDeRecurso(
                                product.category.slug,
                                product.pieceType
                            )}
                            name={product.name}
                            coverUrl={product.coverUrl}
                            coverWidth={product.coverWidth}
                            coverHeight={product.coverHeight}
                            previewUrl={product.previewUrl}
                            images={product.images}
                            /*
                              Datos del modo story. El creador
                              solo se enlaza si tiene perfil
                              público de verdad.
                            */
                            story={{
                                id: product.id,
                                slug: product.slug,
                                price: Number(product.price),
                                creador: {
                                    nombre: creatorName,
                                    username: creatorProfileUrl
                                        ? product.creator.username
                                        : null,
                                    avatarUrl: product.creator.avatarUrl,
                                    isVerified: product.creator.isVerified,
                                },
                            }}
                        />
                    </div>

                    {/* ══════════ INFORMACIÓN ══════════ */}
                    <div className="rk-fade-up rk-enter-1 min-w-0">

                        <p className="rk-eyebrow">Recurso digital</p>

                        <h1 className="rk-title mt-2.5 text-[1.6rem] sm:text-3xl lg:text-[2.1rem]">
                            {product.name}
                        </h1>

                        {/*
                          VALORACIÓN
                          Solo aparece si hay reseñas de verdad.
                          Sin ellas no se pintan cinco estrellas
                          vacías: darían a entender que el recurso
                          fue valorado mal.
                        */}
                        {product.reviewCount > 0 && product.avgRating && (
                            <a
                                href="#valoraciones"
                                className="rk-press-sm mt-3 inline-flex min-h-[2.75rem] items-center gap-2 text-sm"
                            >
                                <Estrellas
                                    valor={Number(product.avgRating)}
                                    tamano={15}
                                />

                                <span className="font-medium tabular-nums">
                                    {Number(product.avgRating)
                                        .toFixed(1)
                                        .replace(".", ",")}
                                </span>

                                <span className="text-ink/55 underline underline-offset-4">
                                    {product.reviewCount}
                                    {product.reviewCount === 1
                                        ? " valoración"
                                        : " valoraciones"}
                                </span>
                            </a>
                        )}

                        {/* CATEGORÍA Y ACCESO: datos reales */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <Link
                                href={`/tienda?categoria=${product.category.slug}`}
                                className="rk-chip !py-1.5 !text-[12px]"
                            >
                                {product.category.name}
                            </Link>

                            {/* PACK: solo si el recurso lleva la etiqueta. */}
                            {esPack && (
                                <Link
                                    href="/tienda?pack=true"
                                    className="rk-chip rk-chip-active !py-1.5 !text-[12px] !font-bold !uppercase !tracking-[0.14em]"
                                >
                                    Pack
                                </Link>
                            )}

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
                                {yaEsSuyo ? (
                                    <YaAdquirido que="recurso" />
                                ) : (
                                    <AddToCartButton
                                        product={{
                                            id: product.id,
                                            pieceType: product.pieceType,
                                            categorySlug: product.category.slug,
                                            name: product.name,
                                            price: Number(product.price),
                                            slug: product.slug,
                                            coverUrl:
                                                product.coverUrl ||
                                                product.images[0]?.url ||
                                                null,
                                        }}
                                    />
                                )}

                                <AddToCollectionButton productId={product.id} />
                            </div>

                            {/* Condiciones reales del marketplace */}
                            <div className="rk-divider my-4" />

                            <ul className="grid gap-2.5 sm:grid-cols-2">
                                <li className="flex items-start gap-2">
                                    <Download
                                        size={14}
                                        className="mt-0.5 shrink-0 text-ink"
                                    />
                                    <span className="text-xs leading-5 text-ink/60">
                                        Descarga inmediata tras el pago
                                    </span>
                                </li>

                                <li className="flex items-start gap-2">
                                    <ShieldCheck
                                        size={14}
                                        className="mt-0.5 shrink-0 text-ink"
                                    />
                                    <span className="text-xs leading-5 text-ink/60">
                                        Acceso permanente desde tu cuenta
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/*
                            ── TAMBIÉN TE PUEDE INTERESAR ──

                            Va aquí, pegada al precio y al botón,
                            y no al pie de la ficha: es en este
                            punto donde se está decidiendo la
                            compra. Al pie quedaría detrás de las
                            valoraciones, las versiones y las
                            etiquetas, que es justo donde ya no
                            ayuda a decidir.

                            Hereda el ancho de la columna, así que
                            su desplazamiento horizontal no puede
                            arrastrar a la página.

                            Se pinta solo si hay recursos reales
                            que ofrecer: nunca un título con nada
                            debajo.
                        */}
                        {sugerencias.length > 0 && (
                            <SugerenciasFlyers productos={sugerencias} />
                        )}

                        {/* ── CREADOR ── */}
                        <div className="rk-card rk-hover-lift mt-4 flex items-center gap-3.5 p-3.5 sm:p-4">
                            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-onprimary">
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
                                            className="shrink-0 text-ink"
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
                                    className="rk-btn rk-btn-line shrink-0 !px-4 !text-xs"
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

                {/* ══════════ VALORACIONES ══════════ */}
                <section className="rk-fade-up rk-enter-1 mt-14 scroll-mt-28" id="valoraciones">
                    <h2 className="rk-title text-xl sm:text-2xl">
                        Valoraciones
                    </h2>

                    <Valoraciones
                        productId={product.id}
                        productSlug={product.slug}
                    />
                </section>

                {/* ══════════ HISTORIAL DE VERSIONES ══════════ */}
                {versiones.length > 0 && (
                    <section className="rk-fade-up rk-enter-1 mt-14">
                        <h2 className="rk-title text-xl sm:text-2xl">
                            Historial de versiones
                        </h2>

                        <p className="mt-2 text-[15px] leading-7 text-ink/60">
                            Quien compra este recurso descarga siempre la
                            versión vigente, también si compró antes.
                        </p>

                        <ol className="mt-6 space-y-4">
                            {versiones.map((v) => (
                                <li
                                    key={v.id}
                                    className="border-t border-line/10 pt-4 first:border-t-0 first:pt-0"
                                >
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold tabular-nums">
                                            {mostrarVersion(v.version)}
                                        </span>

                                        {v.isCurrent && (
                                            <span className="rk-badge rk-badge-neutral">
                                                Vigente
                                            </span>
                                        )}

                                        <span className="text-xs text-ink/45">
                                            {new Intl.DateTimeFormat("es-PE", {
                                                dateStyle: "medium",
                                            }).format(new Date(v.createdAt))}
                                        </span>
                                    </p>

                                    {v.changelog && (
                                        <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-7 text-ink/65">
                                            {v.changelog}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {/* ══════════ ETIQUETAS ══════════ */}
                {etiquetasVisibles.length > 0 && (
                    <section className="rk-fade-up rk-enter-1 mt-12">
                        <h2 className="rk-kicker">Etiquetas</h2>

                        <ul className="mt-3 flex flex-wrap gap-2">
                            {etiquetasVisibles.map((tag) => (
                                <li key={tag.slug}>
                                    <Link
                                        href={`/tienda?tag=${encodeURIComponent(
                                            tag.slug
                                        )}`}
                                        className="rk-press-sm inline-flex min-h-[2.75rem] items-center rounded-full border border-line/15 px-4 text-sm transition-colors duration-fast ease-rk hover:border-ink/40 hover:bg-ink/[0.04]"
                                    >
                                        {tag.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ══════════ PACKS QUE LO INCLUYEN ══════════ */}
                {packsConEste.length > 0 && (
                    <section className="rk-fade-up rk-enter-2 mt-14">
                        <p className="rk-eyebrow">Sale más barato</p>

                        <h2 className="rk-title mt-2 text-xl sm:text-2xl">
                            {packsConEste.length === 1
                                ? "Este recurso está en un pack"
                                : "Este recurso está en varios packs"}
                        </h2>

                        <p className="mt-1.5 text-sm text-ink/60">
                            Comprando el pack completo obtienes este recurso
                            y los demás que incluye.
                        </p>

                        <div className="rk-divider mt-4" />

                        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                            {packsConEste.map((pack) => (
                                <PackCard key={pack.id} pack={pack} />
                            ))}
                        </div>
                    </section>
                )}
                {/* ══════════ RECOMENDACIONES ══════════ */}
                {bloques.map((bloque, indice) => (
                    <section
                        key={bloque.titulo}
                        className={`rk-fade-up rk-enter-2 ${
                            indice === 0 ? "mt-14 lg:mt-20" : "mt-12"
                        }`}
                    >
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="min-w-0">
                                {indice === 0 && (
                                    <p className="rk-eyebrow">
                                        Sigue explorando
                                    </p>
                                )}

                                <h2 className="rk-title mt-2 text-xl sm:text-2xl">
                                    {bloque.titulo}
                                </h2>

                                {bloque.subtitulo && (
                                    <p className="mt-1.5 text-sm text-ink/60">
                                        {bloque.subtitulo}
                                    </p>
                                )}
                            </div>

                            <Link
                                href="/tienda"
                                className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center text-sm font-medium text-ink/60 transition-colors hover:text-ink"
                            >
                                Ver todos
                            </Link>
                        </div>

                        <div className="rk-divider mt-4" />

                        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                            {bloque.productos.map((item) => (
                                <ProductCard key={item.id} product={item} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            <Footer />
        </>
    );
}
