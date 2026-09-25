import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Library } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AnadirColeccionAlCarrito from "@/components/AnadirColeccionAlCarrito";
import YaAdquirido from "@/components/YaAdquirido";
import { getSession } from "@/lib/session";
import { tieneColeccion } from "@/lib/adquisiciones";
import { obtenerColeccionPublica } from "@/lib/colecciones-comerciales";
import { formatPrice } from "@/lib/pricing";
import {
  absoluta,
  imagenSocial,
  migasSchema,
  noEncontrado,
  paginaPublica,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const coleccion = await obtenerColeccionPublica(slug);

  /*
    obtenerColeccionPublica exige status PUBLISHED, así que
    los borradores y las archivadas caen aquí: 404 y sin
    indexar.
  */
  if (!coleccion) return noEncontrado("Colección");

  return paginaPublica({
    titulo: coleccion.name,
    descripcion: coleccion.description
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    ruta: `/colecciones-comerciales/${coleccion.slug}`,
    imagen: coleccion.coverUrl,
    tipo: "article",
  });
}

/**
 * Ficha pública de una colección comercial.
 *
 * Solo se abre si está PUBLICADA: los borradores y las
 * archivadas devuelven 404, igual que un recurso sin publicar.
 *
 * NO es una colección personal. Aquellas viven en
 * /colecciones/[id], son listas privadas de quien las guarda y
 * no se venden.
 */
export default async function ColeccionComercialPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const coleccion = await obtenerColeccionPublica(slug);

  if (!coleccion) {
    notFound();
  }

  /*
    ¿Ya la compró quien está mirando?

    Se resuelve en el servidor, junto a la colección, para que
    la página se pinte una sola vez y ya correcta. Para
    cualquier otra persona —y para quien no ha entrado— sigue
    estando a la venta con normalidad.
  */
  const session = await getSession();

  const yaEsSuya = await tieneColeccion(session?.userId, coleccion.id);

  /*
    La portada es la que subió el creador. Si no hay, el marco
    queda vacío: NO se toma prestado el primer recurso, porque
    entonces la imagen de la colección cambiaría sola al
    reordenar su contenido y no sería una decisión de nadie.
  */
  const portada = coleccion.coverUrl;

  const imagenSchemaUrl = imagenSocial(portada);

  const ruta = `/colecciones-comerciales/${coleccion.slug}`;

  const coleccionSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: coleccion.name,
    description: coleccion.description,
    url: absoluta(ruta),
    ...(imagenSchemaUrl ? { image: imagenSchemaUrl } : {}),
    offers: {
      "@type": "Offer",
      price: coleccion.price.toFixed(2),
      priceCurrency: "PEN",
      url: absoluta(ruta),
    },
    hasPart: coleccion.productos.map((producto) => ({
      "@type": "Product",
      name: producto.name,
      url: absoluta(`/tienda/${producto.slug}`),
    })),
  };

  // Las mismas migas que se ven arriba, ni una más.
  const migas = migasSchema([
    { nombre: "Colecciones", ruta: "/colecciones-comerciales" },
    { nombre: coleccion.name, ruta },
  ]);

  return (
    <>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(coleccionSchema),
        }}
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
            href="/colecciones-comerciales"
            className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center rounded-full px-1.5 transition-colors hover:text-ink"
          >
            Colecciones
          </Link>

          <ChevronRight size={13} aria-hidden className="shrink-0" />

          <span
            aria-current="page"
            className="inline-flex min-h-[2.75rem] items-center truncate px-1.5 font-medium text-ink/70"
          >
            {coleccion.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">

          {/* ══════════ PORTADA ══════════ */}
          <div className="rk-fade-up w-full min-w-0">
            <div className="rk-frame rk-aspect-product w-full overflow-hidden rounded-rk-lg">
              {portada && (
                <Image
                  src={portada}
                  alt={coleccion.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 26rem"
                />
              )}

              <span className="rk-glass-on-image absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <Library size={12} aria-hidden />
                Colección
              </span>
            </div>
          </div>

          {/* ══════════ INFORMACIÓN ══════════ */}
          <div className="rk-fade-up rk-enter-1 min-w-0">
            <p className="rk-eyebrow">Colección completa</p>

            <h1 className="rk-title mt-2.5 text-[1.6rem] sm:text-3xl lg:text-[2.1rem]">
              {coleccion.name}
            </h1>

            {/* CREADOR */}
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="rk-media relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {coleccion.creador.avatarUrl ? (
                  <Image
                    src={coleccion.creador.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <span className="text-xs font-semibold text-ink/55">
                    {coleccion.creador.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              <p className="flex min-w-0 items-center gap-1.5 text-sm">
                {coleccion.creador.username ? (
                  <Link
                    href={`/creadores/${coleccion.creador.username}`}
                    className="truncate font-medium underline-offset-4 hover:underline"
                  >
                    {coleccion.creador.nombre}
                  </Link>
                ) : (
                  <span className="truncate font-medium">
                    {coleccion.creador.nombre}
                  </span>
                )}

                {coleccion.creador.isVerified && (
                  <BadgeCheck
                    size={14}
                    aria-label="Creador verificado"
                    className="shrink-0 text-ink/55"
                  />
                )}
              </p>
            </div>

            <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-ink/65">
              {coleccion.description}
            </p>

            {/* ══════════ PRECIO ══════════ */}
            <div className="mt-7 rounded-rk-md border border-line/12 p-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink/60">Valor individual</dt>
                  <dd className="tabular-nums text-ink/60 line-through">
                    {formatPrice(coleccion.sumaIndividual)}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-medium">Precio de la colección</dt>
                  <dd className="text-2xl font-semibold tabular-nums tracking-tight">
                    {formatPrice(coleccion.price)}
                  </dd>
                </div>

                {/*
                  El ahorro solo se enseña si existe de verdad.
                  Si la colección no sale más barata que comprar
                  sus piezas, anunciarlo sería mentir.
                */}
                {coleccion.ahorro && (
                  <div className="flex items-baseline justify-between gap-4 pt-1">
                    <dt className="text-ink/60">Ahorras</dt>
                    <dd>
                      <span className="rk-badge rk-badge-neutral tabular-nums">
                        {formatPrice(coleccion.ahorro.importe)} ·{" "}
                        {coleccion.ahorro.porcentaje}%
                      </span>
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-4 text-sm text-ink/60 tabular-nums">
                {coleccion.productos.length} recursos incluidos, cada uno
                con su descarga y su licencia.
              </p>

              {/*
                COMPRA ÚNICA

                Se dice antes del botón, no debajo en letra
                pequeña: es la diferencia entre una colección y
                una suscripción, y es lo primero que alguien
                necesita saber antes de decidir.
              */}
              <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70">
                Compra única
              </p>

              <div className="mt-3">
                {yaEsSuya ? (
                  <YaAdquirido que="colección" />
                ) : (
                  <AnadirColeccionAlCarrito
                    coleccion={{
                      id: coleccion.id,
                      name: coleccion.name,
                      price: coleccion.price,
                      slug: coleccion.slug,
                      coverUrl: portada,
                    }}
                  />
                )}
              </div>

              <p className="mt-3 text-center text-[13px] text-ink/55">
                {yaEsSuya
                  ? "Ya la pagaste. Descárgala cuantas veces quieras."
                  : "Un solo pago. Sin suscripción ni cobros por recurso."}
              </p>
            </div>
          </div>
        </div>

        {/* ══════════ CONTENIDO ══════════ */}
        <section className="rk-fade-up rk-enter-2 mt-14">
          <h2 className="rk-title text-xl sm:text-2xl">Qué incluye</h2>

          <p className="mt-2 text-[15px] leading-7 text-ink/60">
            Al comprar la colección recibes cada recurso por separado,
            con su propia descarga y su propia licencia.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            {coleccion.productos.map((producto) => (
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
