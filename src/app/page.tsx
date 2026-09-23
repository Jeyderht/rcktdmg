import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Search,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SeccionesMarketplace from "@/components/home/SeccionesMarketplace";
import { prisma } from "@/lib/prisma";
import { SELECCION_TARJETA, aTarjeta } from "@/lib/catalogo";

export const dynamic = "force-dynamic";

/* Los tres pasos reales para conseguir un recurso. */
const PASOS = [
  {
    numero: "01",
    titulo: "Explora",
    texto:
      "Busca por categoría, formato, color o precio hasta dar con lo que necesitas.",
  },
  {
    numero: "02",
    titulo: "Elige",
    texto:
      "Abre el recurso, revisa sus imágenes y su ficha, y añádelo al carrito.",
  },
  {
    numero: "03",
    titulo: "Descarga",
    texto:
      "Tras el pago queda en tu cuenta, disponible para descargar cuando quieras.",
  },
];

export default async function Home() {
  /*
   * Todos los datos de la home salen de la base de datos.
   * No hay cifras, productos, categorías ni creadores de
   * ejemplo: si algo no existe, su sección no se pinta.
   */
  const [
    products,
    categories,
    creators,
    productCount,
    portadas,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: SELECCION_TARJETA,
    }),

    prisma.category.findMany({
      where: { products: { some: { status: "PUBLISHED" } } },
      orderBy: { name: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            products: { where: { status: "PUBLISHED" } },
          },
        },
        // Portadas reales para ilustrar la categoría.
        products: {
          where: { status: "PUBLISHED", coverUrl: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, coverUrl: true },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        role: { in: ["CREATOR", "ADMIN"] },
        creatorStatus: "APPROVED",
        username: { not: null },
        products: { some: { status: "PUBLISHED" } },
      },
      orderBy: [{ isVerified: "desc" }, { createdAt: "asc" }],
      take: 4,
      select: {
        id: true,
        name: true,
        publicName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        _count: {
          select: {
            products: { where: { status: "PUBLISHED" } },
          },
        },
      },
    }),

    prisma.product.count({ where: { status: "PUBLISHED" } }),

    /*
      Imágenes de la portada del inicio.

      Son recursos reales con imagen real. Hoy no todos los
      recursos publicados tienen portada, así que la
      composición se construye con las que existan: si no hay
      ninguna, el bloque visual no se pinta y el texto ocupa
      todo el ancho.
    */
    prisma.product.findMany({
      where: { status: "PUBLISHED", coverUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        coverUrl: true,
      },
    }),
  ]);

  return (
    <>
      <Navbar />

      <main>

        {/* ══════════ HERO ══════════ */}
        <section className="relative overflow-hidden">
          {/* Retícula fina: profundidad sin color. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(var(--rk-border) / 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--rk-border) / 0.14) 1px, transparent 1px)",
                backgroundSize:
                  "clamp(3rem, 6vw, 5rem) clamp(3rem, 6vw, 5rem)",
                maskImage:
                  "radial-gradient(75% 65% at 30% 0%, #000 20%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(75% 65% at 30% 0%, #000 20%, transparent 100%)",
              }}
            />
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-5 lg:px-8 lg:pb-24 lg:pt-20">
            <div
              className={`grid items-center gap-12 ${
                portadas.length > 0
                  ? "lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
                  : ""
              }`}
            >
              {/* TEXTO */}
              <div className="rk-fade-up min-w-0">
                <p className="rk-kicker">Recursos creativos</p>

                <h1 className="rk-display mt-6 max-w-[13ch]">
                  Todo lo que necesitas para crear mejor.
                </h1>

                <p className="mt-7 max-w-md text-base leading-8 text-ink/60 sm:text-lg">
                  Recursos digitales hechos por creadores, listos
                  para descargar y usar en tus proyectos.
                </p>

                {/* BUSCADOR: navegación real a la tienda. */}
                <form
                  action="/tienda"
                  method="GET"
                  className="mt-9 max-w-md"
                >
                  <div className="relative">
                    <Search
                      size={18}
                      aria-hidden
                      className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/45"
                    />

                    <input
                      type="search"
                      name="q"
                      placeholder="Buscar recursos..."
                      aria-label="Buscar recursos"
                      autoComplete="off"
                      className="h-14 w-full rounded-full border border-line/15 bg-surface/70 pl-14 pr-[7.5rem] text-[15px] outline-none backdrop-blur-rk transition-colors duration-normal ease-rk placeholder:text-ink/45 hover:border-line/30 focus:border-ink/40 focus:bg-surface"
                    />

                    <button
                      type="submit"
                      className="rk-btn rk-btn-ink rk-btn-compact absolute right-1.5 top-1/2 -translate-y-1/2 !px-5 !py-3 !text-sm"
                    >
                      Buscar
                    </button>
                  </div>
                </form>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/tienda"
                    className="rk-btn rk-btn-line"
                  >
                    Explorar recursos
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/creadores"
                    className="rk-btn rk-btn-ghost"
                  >
                    Ver creadores
                  </Link>
                </div>

                {/*
                  Cifras reales del catálogo. Son conteos de la
                  base de datos, no estimaciones.
                */}
                <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
                  {[
                    {
                      valor: productCount,
                      etiqueta:
                        productCount === 1 ? "recurso" : "recursos",
                    },
                    {
                      valor: categories.length,
                      etiqueta:
                        categories.length === 1
                          ? "categoría"
                          : "categorías",
                    },
                    {
                      valor: creators.length,
                      etiqueta:
                        creators.length === 1
                          ? "creador"
                          : "creadores",
                    },
                  ].map((dato) => (
                    <div key={dato.etiqueta}>
                      <dt className="sr-only">{dato.etiqueta}</dt>

                      <dd>
                        <span className="rk-title block text-3xl tabular-nums sm:text-4xl">
                          {dato.valor}
                        </span>

                        <span className="mt-1.5 block text-[11px] uppercase tracking-[0.18em] text-ink/45">
                          {dato.etiqueta}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* COMPOSICIÓN CON RECURSOS REALES */}
              {portadas.length > 0 && (
                <div className="rk-fade-up rk-enter-2 min-w-0">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {portadas.map((recurso, indice) => (
                      <Link
                        key={recurso.id}
                        href={`/tienda/${recurso.slug}`}
                        aria-label={recurso.name}
                        className={`group relative block min-w-0 flex-1 ${
                          // Escalonado: la composición respira.
                          indice === 1
                            ? "translate-y-6 sm:translate-y-10"
                            : indice === 2
                              ? "hidden translate-y-3 sm:block sm:translate-y-5"
                              : ""
                        }`}
                      >
                        <div className="rk-frame rk-aspect-product w-full shadow-rk-lg">
                          <Image
                            src={recurso.coverUrl as string}
                            alt={recurso.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 32vw, 16vw"
                            priority={indice === 0}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════════ CATEGORÍAS ══════════ */}
        {categories.length > 0 && (
          <section className="border-t border-line/10">
            <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
              <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="rk-kicker">Explora</p>

                  <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
                    Por categoría
                  </h2>
                </div>

                <Link
                  href="/categorias"
                  className="rk-press group inline-flex items-center gap-2 text-sm font-semibold"
                >
                  Ver todas
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              {/*
                Solo aparecen las categorías que tienen recursos
                publicados: la consulta ya descarta las vacías, así
                que nunca se pinta una tarjeta sin nada detrás.

                La rejilla se adapta al número real de categorías:
                con una sola, una tarjeta suelta dentro de cuatro
                columnas se vería rota.
              */}
              <div
                className={`rk-fade-up rk-enter-1 mt-10 grid gap-3 sm:gap-4 ${
                  categories.length === 1
                    ? "max-w-md"
                    : categories.length === 2
                      ? "sm:grid-cols-2"
                      : categories.length === 3
                        ? "sm:grid-cols-2 lg:grid-cols-3"
                        : "sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {categories.map((category) => {
                  const portada = category.products[0]?.coverUrl;

                  return (
                    <Link
                      key={category.id}
                      href={`/tienda?categoria=${category.slug}`}
                      className="rk-press group relative block overflow-hidden rounded-rk-lg"
                    >
                      {/* La imagen manda; el texto va encima. */}
                      <div className="rk-frame !rounded-rk-lg relative aspect-[4/3] w-full sm:aspect-[16/10]">
                        {portada ? (
                          <Image
                            src={portada}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.3em] text-ink/30"
                          >
                            RCKTDMG
                          </span>
                        )}

                        {/*
                          Velo oscuro solo sobre la zona del texto:
                          la imagen sigue nítida, sin desenfoque.
                        */}
                        <span
                          aria-hidden
                          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                        />

                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                              {category.name}
                            </h3>

                            <p className="mt-1 text-xs text-white/70">
                              {category._count.products}{" "}
                              {category._count.products === 1
                                ? "recurso"
                                : "recursos"}
                            </p>
                          </div>

                          <span
                            aria-hidden
                            className="rk-glass-on-image flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-normal ease-rk group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          >
                            <ArrowUpRight size={16} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══════════ RECURSOS DESTACADOS ══════════ */}
        <section className="border-t border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="rk-kicker">Novedades</p>

                <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
                  Recursos destacados
                </h2>
              </div>

              <Link
                href="/tienda"
                className="rk-press group inline-flex items-center gap-2 text-sm font-semibold"
              >
                Ver los {productCount}
                <ArrowUpRight
                  size={15}
                  className="transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="rk-tile mt-10 px-6 py-16 text-center">
                <p className="text-sm text-ink/60">
                  Todavía no hay recursos publicados.
                </p>
              </div>
            ) : (
              <div className="rk-fade-up rk-enter-1 mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={aTarjeta(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ══════════ COLECCIONES, PACKS Y MÁS GUARDADOS ══════════ */}
        <SeccionesMarketplace />

        {/* ══════════ CREADORES ══════════ */}
        {creators.length > 0 && (
          <section className="border-t border-line/10">
            <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
              <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="rk-kicker">Comunidad</p>

                  <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
                    Detrás de cada recurso
                  </h2>

                  <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink/60">
                    Cada archivo tiene autor, con su perfil público
                    y su catálogo.
                  </p>
                </div>

                <Link
                  href="/creadores"
                  className="rk-press group inline-flex items-center gap-2 text-sm font-semibold"
                >
                  Ver todos
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              <div
                className={`rk-fade-up rk-enter-1 mt-10 grid gap-3 sm:grid-cols-2 ${
                  creators.length > 2 ? "lg:grid-cols-4" : ""
                }`}
              >
                {creators.map((creator) => {
                  const displayName =
                    creator.publicName || creator.name || "Creador";

                  return (
                    <Link
                      key={creator.id}
                      href={`/creadores/${creator.username}`}
                      className="rk-tile rk-press group p-5 sm:p-6"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar real, o iniciales si no lo tiene. */}
                        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-onprimary">
                          {creator.avatarUrl ? (
                            <Image
                              src={creator.avatarUrl}
                              alt={displayName}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[17px] font-semibold tracking-tight">
                              {displayName}
                            </span>

                            {creator.isVerified && (
                              <BadgeCheck
                                size={15}
                                className="shrink-0 text-ink/45"
                                aria-label="Creador verificado"
                              />
                            )}
                          </span>

                          <span className="mt-0.5 block truncate text-[13px] text-ink/45">
                            @{creator.username}
                          </span>
                        </span>

                        <ArrowUpRight
                          size={17}
                          aria-hidden
                          className="shrink-0 text-ink/40 transition-transform duration-normal ease-rk group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </div>

                      {/* Biografía real; si no la hay, no se pinta. */}
                      {creator.bio && (
                        <p className="mt-4 line-clamp-2 text-[13px] leading-6 text-ink/60">
                          {creator.bio}
                        </p>
                      )}

                      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-ink/45">
                        {creator._count.products}{" "}
                        {creator._count.products === 1
                          ? "recurso publicado"
                          : "recursos publicados"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══════════ CÓMO FUNCIONA ══════════ */}
        <section className="border-t border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <div className="rk-fade-up max-w-2xl">
              <p className="rk-kicker">Cómo funciona</p>

              <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
                Del catálogo a tu proyecto en tres pasos
              </h2>
            </div>

            <div className="rk-fade-up rk-enter-1 mt-12 grid gap-px overflow-hidden rounded-rk-lg border border-line/10 bg-line/10 sm:grid-cols-3">
              {PASOS.map((paso) => (
                <div
                  key={paso.numero}
                  className="bg-background p-6 sm:p-8"
                >
                  <span className="rk-title block text-5xl tabular-nums text-ink/15 sm:text-6xl">
                    {paso.numero}
                  </span>

                  <h3 className="mt-6 text-xl font-semibold tracking-tight">
                    {paso.titulo}
                  </h3>

                  <p className="mt-2.5 text-sm leading-7 text-ink/60">
                    {paso.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CTA FINAL ══════════ */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-5 lg:px-8 lg:pb-24">
          <div className="rk-onyx rk-fade-up relative overflow-hidden rounded-rk-xl px-6 py-16 text-center sm:px-10 sm:py-24">
            {/* Retícula sobre la superficie oscura. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
                backgroundSize: "4rem 4rem",
                maskImage:
                  "radial-gradient(60% 60% at 50% 40%, #000 10%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(60% 60% at 50% 40%, #000 10%, transparent 100%)",
              }}
            />

            <div className="relative">
              <p className="rk-kicker justify-center">
                Descarga permanente
              </p>

              <h2 className="rk-display mx-auto mt-6 max-w-3xl !text-[clamp(2.25rem,6vw,4rem)]">
                Tu próximo proyecto empieza aquí.
              </h2>

              <p className="mx-auto mt-6 max-w-md text-[15px] leading-8 text-ink/60">
                Explora los recursos publicados y descarga el que
                necesites.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                  href="/tienda"
                  className="rk-btn rk-btn-paper"
                >
                  Ir a la tienda
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/registro"
                  className="rk-btn rk-btn-line"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
