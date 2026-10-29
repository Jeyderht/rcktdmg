import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Compass,
  CreditCard,
  Download,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SelectorBusqueda from "@/components/home/SelectorBusqueda";
import CatalogoInicio from "@/components/home/CatalogoInicio";
import CarruselFlyers, { type FlyerCarrusel } from "@/components/home/CarruselFlyers";
import PalabrasEscritas from "@/components/home/PalabrasEscritas";
import SliderPortadas from "@/components/home/SliderPortadas";
import CarruselCreadores from "@/components/home/CarruselCreadores";
import Ecosistema from "@/components/home/Ecosistema";
import CtaModelo from "@/components/home/CtaModelo";
import SeparadorSeccion from "@/components/home/SeparadorSeccion";
import PreguntasFrecuentes from "@/components/ui/PreguntasFrecuentes";
import {
  creadoresDestacados,
  datosCatalogoInicio,
  datosQueBuscas,
} from "@/lib/home";
import { portadasActivas } from "@/lib/portadas";
import { SITIO, absoluta, paginaPublica } from "@/lib/seo";
import { IconoBuscar } from "@/components/iconos";
import PlaceholderAnimado from "@/components/layout/PlaceholderAnimado";
import { terminosDestacados } from "@/lib/busqueda";

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

/* Los tres pasos reales para conseguir un recurso. «Explora» va sin
   descripción: el icono y el título bastan. */
const PASOS: {
  numero: string;
  icono: typeof Compass;
  tono: string;
  titulo: string;
  texto?: string;
}[] = [
  {
    numero: "01",
    icono: Compass,
    tono: "rk-step-frio",
    titulo: "Explora",
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
    creadoresHome,
    promos,
    destacadosBusqueda,
    queBuscas,
    catalogo,
  ] = await Promise.all([
    creadoresDestacados(12),

    /* Portadas del slider de arriba (PromoSlide). Si la tabla
       falla o está vacía, la home sigue sin slider. */
    portadasActivas().catch(() => []),

    /* Frases del buscador que se escribe solo: los mismos
       términos de «Populares ahora». Sin ellos, no se anima. */
    terminosDestacados(6).catch(() => []),

    /* «¿Qué estás buscando?»: portadas y cifras de cada opción. */
    datosQueBuscas(),

    /* Catálogo por categoría: 4 categorías, hasta 8 por pestaña. */
    datosCatalogoInicio(),
  ]);

  /*
    Carrusel del hero: solo flyers de EVENTOS, los 7 más recientes
    con imagen. Sin relleno: con 1 o 2 flyers se ven 1 o 2.
  */
  const flyers: FlyerCarrusel[] = catalogo.eventos.recientes.slice(0, 7).flatMap((p) => {
    const imagen = p.coverUrl || p.images[0]?.url;

    return imagen
      ? [{
          id: p.id,
          slug: p.slug,
          name: p.name,
          price: Number(p.price),
          imagen,
          creador: p.creator.publicName || p.creator.name || "Creador",
        }]
      : [];
  });

  /* «Populares ahora»: los tres primeros términos reales. */
  const populares = destacadosBusqueda.slice(0, 3);

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

      <main className="rk-inicio">

        {/* ══════════ SLIDER DE PORTADAS ══════════
            Primer elemento, justo bajo el menú: es el espacio de
            anuncios. Sin portadas activas, el hero queda primero. */}
        {promos.length > 0 && <SliderPortadas portadas={promos} />}

        {/* ══════════ HERO ══════════ */}
        <section className="relative overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-5 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="grid items-center gap-12">
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
                  className="mx-auto mt-9 max-w-md"
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

                    <PlaceholderAnimado
                      frases={destacadosBusqueda.map((d) => d.etiqueta)}
                    />

                    {/*
                      Centrado sin transform: el :hover y el :active
                      del botón ponían su propio transform, pisaban el
                      -translate-y-1/2 y el botón bajaba media altura.
                      A 9 px del borde (+1 px de borde = 10 px), lo
                      mismo que arriba y abajo.
                    */}
                    <div className="absolute inset-y-0 right-[9px] flex items-center">
                      <button
                        type="submit"
                        className="rk-buscador-accion"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>
                </form>

                {/* POPULARES AHORA: términos reales; sin datos, no se pinta. */}
                {populares.length > 0 && (
                  <div className="rkp-populares">
                    <span>Populares ahora</span>
                    {populares.map((t) => (
                      <Link
                        key={t.etiqueta}
                        href={`/tienda?q=${encodeURIComponent(t.etiqueta)}`}
                        className="rkp-chip"
                      >
                        {t.etiqueta}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Hero a una columna: buscador y botones centrados bajo el titular. */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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

                {/* CARRUSEL DE FLYERS DE EVENTOS (sin flyers, no se pinta) */}
                <CarruselFlyers flyers={flyers} />

                <ul className="rkp-confianza">
                  <li>
                    <Zap size={14} aria-hidden />
                    Descarga inmediata
                  </li>
                  <li>
                    <CreditCard size={14} aria-hidden />
                    Yape, Plin y tarjeta
                  </li>
                  <li>
                    <ShieldCheck size={14} aria-hidden />
                    Licencia de uso
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════ ¿QUÉ ESTÁS BUSCANDO? ══════════
            El título queda solo para lectores de pantalla. */}
        <SelectorBusqueda datos={queBuscas} />

        {/*
          ══════════ CATÁLOGO POR CATEGORÍA ══════════

          Eventos, General, Colecciones y Packs, cada una con sus
          pestañas Recientes / Populares / Packs. Eventos sale
          elegida en cada carga.
        */}
        <CatalogoInicio datos={catalogo} />

        <SeparadorSeccion />

        {/* ══════════ CÓMO FUNCIONA ══════════ */}
        <section>
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <div className="rk-fade-up max-w-2xl">
              <h2 className="rk-title text-[2rem] sm:text-5xl">
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
                      {paso.texto && <p className="rk-step-text">{paso.texto}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <SeparadorSeccion />

        {/* ══════════ CTA (con la modelo), justo tras los pasos ══════════ */}
        {/* Precio más bajo publicado: eventos + diseños generales
            cubren todo el catálogo publicado. */}
        <CtaModelo
          precioDesde={
            [queBuscas.eventos.precioMinimo, queBuscas.generales.precioMinimo]
              .filter((p): p is number => p !== null)
              .reduce<number | null>((min, p) => (min === null || p < min ? p : min), null)
          }
        />

        {/* ══════════ ECOSISTEMA CREATIVO ══════════ */}
        <Ecosistema />

        <SeparadorSeccion />

        {/*
          ══════════ CREADORES ══════════

          Carrusel que cabe en una línea aunque haya veinte
          creadores.
        */}
        <CarruselCreadores creadores={creadoresHome} />


        <SeparadorSeccion />

        {/* ══════════ PREGUNTAS FRECUENTES ══════════ */}
        <PreguntasFrecuentes sinEtiquetas />
      </main>

      <Footer />
    </>
  );
}
