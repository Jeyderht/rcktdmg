import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  ShoppingBag,
  Download,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SeccionesMarketplace from "@/components/home/SeccionesMarketplace";
import Recomendados from "@/components/home/Recomendados";
import SelectorBusqueda from "@/components/home/SelectorBusqueda";
import HeroFlyers from "@/components/home/HeroFlyers";
import SliderPortadas from "@/components/home/SliderPortadas";
import CarpetasCategorias, {
  aCarpetas,
} from "@/components/categorias/CarpetasCategorias";
import StoriesEventos from "@/components/home/StoriesEventos";
import SliceCorporativos from "@/components/home/SliceCorporativos";
import SeccionColecciones from "@/components/home/SeccionColecciones";
import CarruselCreadores from "@/components/home/CarruselCreadores";
import Ecosistema from "@/components/home/Ecosistema";
import MasDisenos from "@/components/home/MasDisenos";
import CtaModelo from "@/components/home/CtaModelo";
import PreguntasFrecuentes from "@/components/PreguntasFrecuentes";
import {
  conteosDeDisenos,
  creadoresDestacados,
  corporativosParaSlice,
  flyersParaStories,
} from "@/lib/home";
import { listarColeccionesPublicas } from "@/lib/colecciones-comerciales";
import { portadasActivas } from "@/lib/portadas";
import { prisma } from "@/lib/prisma";
import { SELECCION_TARJETA, aTarjeta } from "@/lib/catalogo";
import { SITIO, absoluta, paginaPublica } from "@/lib/seo";
import { IconoBuscar } from "@/components/iconos";

export const dynamic = "force-dynamic";

/*
  La home es la portada del sitio. Su título no lleva el
  sufijo "· RcktX" de la plantilla porque ya es la marca;
  por eso se declara como `absolute`.
*/
export const metadata: Metadata = {
  ...paginaPublica({
    titulo: SITIO.nombre,
    descripcion: SITIO.descripcion,
    ruta: "/",
  }),
  title: {
    absolute: `${SITIO.nombre} · Marketplace de recursos digitales`,
  },
};

/* Los tres pasos reales para conseguir un recurso. */
const PASOS = [
  {
    numero: "01",
    icono: Compass,
    tono: "rk-step-frio",
    titulo: "Explora",
    texto:
      "Busca por categoría, formato, color o precio hasta dar con lo que necesitas.",
  },
  {
    numero: "02",
    icono: ShoppingBag,
    tono: "rk-step-neutro",
    titulo: "Elige",
    texto:
      "Abre el recurso, revisa sus imágenes y su ficha, y añádelo al carrito.",
  },
  {
    numero: "03",
    icono: Download,
    tono: "rk-step-calido",
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
    flyers,
    corporativos,
    colecciones,
    creadoresHome,
    conteosDisenos,
    promos,
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
        // Hasta tres portadas reales: asoman de la carpeta.
        products: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            coverUrl: true,
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true },
            },
          },
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
      /*
        Siete flyers: los que la escena del hero puede relevar sin
        que la rueda se note corta, y ni una imagen más de las que
        alguien va a ver.
      */
      take: 7,
      select: {
        id: true,
        name: true,
        slug: true,
        coverUrl: true,
        price: true,
        /* Deciden el marco de cada flyer del hero. */
        pieceType: true,
        category: { select: { slug: true, name: true } },
      },
    }),

    /*
      Las tres secciones nuevas entran en el MISMO Promise.all
      que las anteriores: son tres consultas más en paralelo,
      no tres viajes extra en serie. Cada una con su tope y su
      select mínimo.
    */
    flyersParaStories(12),

    corporativosParaSlice(9),

    listarColeccionesPublicas(6),

    creadoresDestacados(12),

    conteosDeDisenos(),

    /* Portadas del slider de arriba (PromoSlide). Si la tabla
       falla o está vacía, la home sigue sin slider. */
    portadasActivas().catch(() => []),
  ]);

  /*
    Datos estructurados de la home.

    WebSite declara el buscador interno para que Google pueda
    enseñar una caja de búsqueda del sitio; el destino es la
    misma ruta que usa el formulario de la cabecera, así que
    no se anuncia nada que no funcione.

    Organization se queda en lo comprobable: nombre y sitio.
    Sin logo (no hay un archivo de marca publicado), sin redes
    y sin datos de contacto inventados.
  */
  const sitioSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITIO.nombre,
    description: SITIO.descripcion,
    url: absoluta("/"),
    inLanguage: "es",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluta("/tienda")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizacionSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITIO.nombre,
    url: absoluta("/"),
  };

  return (
    <>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sitioSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizacionSchema),
        }}
      />

      <main>

        {/* ══════════ SLIDER DE PORTADAS ══════════ */}
        {promos.length > 0 && <SliderPortadas portadas={promos} />}

        {/* ══════════ CATEGORÍAS (debajo del slider) ══════════ */}
        {categories.length > 0 && (
          <section className="rk-home-categorias">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-8">
              <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="rk-kicker">Explora</p>

                  <h2 className="rk-title mt-2 text-2xl sm:text-3xl">
                    Categorías
                  </h2>
                </div>

                <Link
                  href="/categorias"
                  className="rk-press rk-link-seccion group gap-2 text-sm font-semibold"
                >
                  Ver todas
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              <CarpetasCategorias
                categorias={aCarpetas(categories)}
                nivelTitulo="h3"
                className="rk-fade-up rk-enter-1 mt-6 sm:mt-8"
              />
            </div>
          </section>
        )}

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
                  {/*
                    La superficie es esta caja, no el campo. El
                    campo que había aquí se volvía sólido y de
                    borde oscuro al enfocarlo, y perdía el vidrio.
                  */}
                  <div className="rk-buscador rk-buscador-hero">
                    <IconoBuscar
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
                      spellCheck={false}
                      className="rk-buscador-campo"
                    />

                    <button
                      type="submit"
                      className="rk-buscador-accion absolute right-1.5 top-1/2 -translate-y-1/2"
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

              {/*
                ── ESCENA DE FLYERS ──

                Los recursos reales del catálogo, relevándose.
                Antes eran tres portadas quietas y escalonadas;
                ahora el destacado manda en el centro, los demás
                lo acompañan a los lados —más pequeños y más
                apagados cuanto más lejos— y el turno va pasando.

                El título, el precio y el botón de debajo hablan
                siempre del flyer activo, así que la composición
                no es un adorno: es por donde se entra al
                recurso.

                Los precios se convierten a número aquí. Un
                `Decimal` de Prisma no cruza la frontera al
                cliente, y es en este punto donde se sabe que va
                a cruzarla.
              */}
              {portadas.length > 0 && (
                <HeroFlyers
                  flyers={portadas.map((recurso) => ({
                    id: recurso.id,
                    name: recurso.name,
                    slug: recurso.slug,
                    coverUrl: recurso.coverUrl as string,
                    price: Number(recurso.price),
                    categoriaNombre: recurso.category?.name ?? null,
                    categoriaSlug: recurso.category?.slug ?? null,
                    pieceType: recurso.pieceType,
                  }))}
                />
              )}
            </div>
          </div>
        </section>

        {/* ══════════ ¿QUÉ ESTÁS BUSCANDO? ══════════ */}
        <SelectorBusqueda />

        {/* ══════════ STORIES DE EVENTOS ══════════ */}
        <StoriesEventos flyers={flyers.flyers} />

        {/* ══════════ COLECCIONES ══════════ */}
        <SeccionColecciones colecciones={colecciones} />

        {/* ══════════ CORPORATIVOS ══════════ */}
        <SliceCorporativos recursos={corporativos.recursos} />

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
                className="rk-press rk-link-seccion group gap-2 text-sm font-semibold"
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
              <div className="rk-fade-up rk-enter-1 mt-10 rk-rejilla">
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

        {/* Recomendaciones: contextual o personal, según haya datos. */}
        <Recomendados />

        {/*
          ══════════ CREADORES ══════════

          Era una rejilla de cuatro. Ahora es un carrusel que
          cabe en una línea aunque haya veinte creadores. Es
          la MISMA sección, no una segunda: se sustituye, no
          se duplica.
        */}
        <CarruselCreadores creadores={creadoresHome} />

        {/* ══════════ MÁS DISEÑOS PARA TU NEGOCIO ══════════ */}
        <MasDisenos conteos={conteosDisenos} />

        {/* ══════════ ECOSISTEMA CREATIVO ══════════ */}
        <Ecosistema />

        {/* ══════════ CÓMO FUNCIONA ══════════ */}
        <section className="border-t border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <div className="rk-fade-up max-w-2xl">
              <p className="rk-kicker">Cómo funciona</p>

              <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
                Del catálogo a tu proyecto en tres pasos
              </h2>
            </div>

            <div className="rk-steps rk-fade-up rk-enter-1 mt-12 sm:grid-cols-3">
              {PASOS.map((paso) => {
                const Icono = paso.icono;

                return (
                  <article
                    key={paso.numero}
                    className={`rk-step ${paso.tono}`}
                  >
                    <span className="rk-step-num" aria-hidden="true">
                      <Icono />
                    </span>

                    <div className="rk-step-body">
                      <h3 className="rk-step-title">{paso.titulo}</h3>
                      <p className="rk-step-text">{paso.texto}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════ PREGUNTAS FRECUENTES ══════════ */}
        <PreguntasFrecuentes />

        {/* ══════════ CTA FINAL (con la modelo) ══════════ */}
        <CtaModelo />
      </main>

      <Footer />
    </>
  );
}
