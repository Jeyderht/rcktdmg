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
import PalabrasEscritas from "@/components/home/PalabrasEscritas";
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
import { programasPorCategoria } from "@/lib/programas-categoria";
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

  /* Solo 3 carpetas en el inicio; sus programas en una consulta. */
  const categoriasInicio = categories.slice(0, 3);
  const programasInicio = await programasPorCategoria(
    categoriasInicio.map((c) => c.id)
  );

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

        {/*
          Separador entre la barra superior y el slider: la línea
          con nodos del separador del pie, sin el isotipo.
        */}
        <div aria-hidden className="rk-separador rk-separador-arriba">
          <span className="rk-separador-linea" />
        </div>

        {/* ══════════ SLIDER DE PORTADAS ══════════ */}
        {promos.length > 0 && <SliderPortadas portadas={promos} />}

        {/* ══════════ HERO ══════════ */}
        <section className="relative overflow-hidden">
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
                <div className="rk-hc">
                  {/* Puntos solo detrás del titular */}
                  <div aria-hidden className="rk-hc-puntos" />
                <svg aria-hidden className="rk-hc-sello" viewBox="0 0 120 120">
                  <defs>
                    <path id="rk-hc-circulo" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                  </defs>
                  <text className="rk-hc-sello-texto">
                    <textPath href="#rk-hc-circulo">PLANTILLAS PREMIUM · RCKTX · </textPath>
                  </text>
                  <path className="rk-hc-sello-flecha" d="M68 52 L52 68 M52 56 L52 68 L64 68" />
                </svg>
                {/*
                  Titular partido en tres líneas. La «e» de «crear»
                  es un interruptor que se enciende y se apaga; el
                  texto accesible va completo en aria-label.
                */}
                <h1
                  className="rk-hc-titulo"
                  aria-label="Todo lo que necesitas para crear mejor, más rápido, con estilo y sin límites."
                >
                  <span aria-hidden className="rk-hc-l1">
                    Todo lo que necesitas para
                  </span>
                  <span aria-hidden className="rk-hc-gigante">
                    <span className="rk-hc-letras">cr</span>
                    <span className="rk-hc-switch">
                      <i />
                    </span>
                    <span className="rk-hc-letras">ar</span>
                  </span>
                  <span aria-hidden className="rk-hc-l3">
                    <PalabrasEscritas
                      palabras={[
                        "mejor.",
                        "más rápido.",
                        "con estilo.",
                        "sin límites.",
                      ]}
                    />
                  </span>
                </h1>

                </div>

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

        {/* ══════════ CATEGORÍAS (debajo del hero) ══════════ */}
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
                categorias={aCarpetas(categoriasInicio, programasInicio)}
                nivelTitulo="h3"
                className="rk-fade-up rk-enter-1 mt-6 sm:mt-8"
              />
            </div>
          </section>
        )}

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
