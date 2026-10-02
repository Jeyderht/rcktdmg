import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Layers } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AddPackToCartButton from "./AddPackToCartButton";
import { obtenerPackPublico } from "@/lib/packs";
import { formatPrice } from "@/lib/pricing";
import {
  absoluta,
  imagenSocial,
  migasSchema,
  noEncontrado,
  paginaPublica,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type PackPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PackPageProps): Promise<Metadata> {
  const { slug } = await params;

  const pack = await obtenerPackPublico(slug);

  /*
    obtenerPackPublico exige status PUBLISHED, así que los
    borradores y los archivados caen aquí: 404 y sin indexar.
  */
  if (!pack) return noEncontrado("Pack");

  // Portada propia o, si no la hay, la del primer recurso.
  const imagen =
    pack.coverUrl ??
    pack.productos[0]?.image?.url ??
    pack.productos[0]?.coverUrl ??
    null;

  return paginaPublica({
    titulo: pack.name,
    descripcion: pack.description
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    ruta: `/packs/${pack.slug}`,
    imagen,
    tipo: "article",
  });
}

/**
 * Ficha pública de un pack.
 *
 * Solo se abre si está PUBLICADO: los borradores y los
 * archivados devuelven 404, igual que un recurso no publicado.
 */
export default async function PackPage({ params }: PackPageProps) {
  const { slug } = await params;

  const pack = await obtenerPackPublico(slug);

  if (!pack) {
    notFound();
  }

  const portada =
    pack.coverUrl ??
    pack.productos[0]?.image?.url ??
    pack.productos[0]?.coverUrl ??
    null;

  /*
    Datos estructurados del pack.

    Es un producto que se vende, así que se describe como
    Product con su oferta. `isSimilarTo` no: lo que lleva
    dentro se declara con hasPart, que es lo que de verdad
    contiene. Sin aggregateRating: los packs todavía no
    tienen reseñas propias.
  */
  const imagenSchema = imagenSocial(portada);

  const packSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.name,
    description: pack.description,
    url: absoluta(`/packs/${pack.slug}`),
    ...(imagenSchema ? { image: imagenSchema } : {}),
    /*
      Sin `brand`, sin `sku` y sin `availability`: son campos
      que este catálogo no tiene: el creador es una persona,
      no una marca registrada, y un archivo descargable no
      lleva control de existencias. Declararlos sería rellenar
      el schema con datos que no existen.
    */
    offers: {
      "@type": "Offer",
      // `price` ya viene en soles, no en céntimos.
      price: Number(pack.price).toFixed(2),
      priceCurrency: "PEN",
      url: absoluta(`/packs/${pack.slug}`),
    },
    // Los recursos incluidos, tal y como se listan en la ficha.
    hasPart: pack.productos.map((producto) => ({
      "@type": "Product",
      name: producto.name,
      url: absoluta(`/tienda/${producto.slug}`),
    })),
  };

  // Las mismas migas que se ven arriba, ni una más.
  const migas = migasSchema([
    { nombre: "Packs", ruta: "/packs" },
    { nombre: pack.name, ruta: `/packs/${pack.slug}` },
  ]);

  return (
    <>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(migas) }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-5 lg:pb-20 lg:pt-8">

        {/* ══════════ BREADCRUMBS ══════════ */}
        <nav
          aria-label="Ruta de navegación"
          className="rk-fade-up mb-3 flex items-center gap-1 overflow-x-auto text-[13px] text-ink/60"
        >
          <Link
            href="/packs"
            className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center rounded-full px-1.5 transition-colors hover:text-ink"
          >
            Packs
          </Link>

          <ChevronRight size={13} aria-hidden className="shrink-0" />

          <span
            aria-current="page"
            className="inline-flex min-h-[2.75rem] items-center truncate px-1.5 font-medium text-ink/70"
          >
            {pack.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">

          {/* ══════════ PORTADA ══════════ */}
          <div className="rk-fade-up w-full min-w-0">
            <div className="rk-frame rk-aspect-product w-full overflow-hidden rounded-rk-lg">
              {portada && (
                <Image
                  src={portada}
                  alt={pack.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 26rem"
                />
              )}

              <span className="rk-glass-on-image absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <Layers size={12} aria-hidden />
                Pack
              </span>
            </div>
          </div>

          {/* ══════════ INFORMACIÓN ══════════ */}
          <div className="rk-fade-up rk-enter-1 min-w-0">
            <p className="rk-eyebrow">Colección</p>

            <h1 className="rk-title mt-2.5 text-[1.6rem] sm:text-3xl lg:text-[2.1rem]">
              {pack.name}
            </h1>

            {/* CREADOR */}
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="rk-media relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {pack.creador.avatarUrl ? (
                  <Image
                    src={pack.creador.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <span className="text-xs font-semibold text-ink/55">
                    {pack.creador.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              <p className="flex min-w-0 items-center gap-1.5 text-sm">
                {pack.creador.username ? (
                  <Link
                    href={`/creadores/${pack.creador.username}`}
                    className="truncate font-medium underline-offset-4 hover:underline"
                  >
                    {pack.creador.nombre}
                  </Link>
                ) : (
                  <span className="truncate font-medium">
                    {pack.creador.nombre}
                  </span>
                )}

                {pack.creador.isVerified && (
                  <BadgeCheck
                    size={14}
                    aria-label="Creador verificado"
                    className="shrink-0 text-ink/55"
                  />
                )}
              </p>
            </div>

            <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-ink/65">
              {pack.description}
            </p>

            {/* ══════════ PRECIO ══════════ */}
            <div className="mt-7 rounded-rk-md border border-line/12 p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {formatPrice(pack.price)}
                </p>

                {/*
                  La suma individual es una REFERENCIA, y solo
                  se enseña si comprar el pack sale más barato.
                  Si no hay ahorro no se pinta: un tachado sin
                  descuento real sería publicidad engañosa.
                */}
                {pack.ahorro && (
                  <>
                    <p className="text-[15px] text-ink/45 line-through tabular-nums">
                      {formatPrice(pack.sumaIndividual)}
                    </p>

                    <span className="rk-badge rk-badge-neutral tabular-nums">
                      Ahorras {formatPrice(pack.ahorro.importe)} ·{" "}
                      {pack.ahorro.porcentaje}%
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2 text-sm text-ink/60 tabular-nums">
                {pack.productos.length}{" "}
                {pack.productos.length === 1 ? "recurso" : "recursos"}{" "}
                incluidos, cada uno con su licencia.
              </p>

              <div className="mt-5">
                <AddPackToCartButton
                  pack={{
                    id: pack.id,
                    name: pack.name,
                    price: pack.price,
                    slug: pack.slug,
                    coverUrl: portada,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ CONTENIDO ══════════ */}
        <section className="rk-fade-up rk-enter-2 mt-14">
          <h2 className="rk-title text-xl sm:text-2xl">
            Qué incluye
          </h2>

          <p className="mt-2 text-[15px] leading-7 text-ink/60">
            Al comprar el pack recibes cada recurso por separado,
            con su propia descarga y su propia licencia.
          </p>

          <div className="mt-6 rk-rejilla">
            {pack.productos.map((producto) => (
              <ProductCard
                key={producto.id}
                product={{
                  id: producto.id,
                  name: producto.name,
                  slug: producto.slug,
                  price: producto.price,
                  coverUrl: producto.coverUrl,
                  image: producto.image,
                  category: producto.category,
                }}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
