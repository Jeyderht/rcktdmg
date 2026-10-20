import Link from "next/link";
import type { Metadata } from "next";

import { paginaPrivada, paginaPublica } from "@/lib/seo";
import { Suspense } from "react";
import {
  Briefcase,
  FileImage,
  Folder,
  Gem,
  LayoutGrid,
  LayoutTemplate,
  type LucideIcon,
  MessageCircleHeart,
  PartyPopper,
  Shapes,
  Smartphone,
  X,
} from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BuscadorSugerencias from "@/components/layout/BuscadorSugerencias";
import { ID_BUSCADOR_TIENDA } from "@/lib/busqueda-ui";
import { terminosDestacados } from "@/lib/busqueda";
import CajonFiltros, { BotonFiltros } from "./CajonFiltros";
import OrdenExplorar from "./OrdenExplorar";
import PanelFiltros from "./PanelFiltros";
import StoreResults, {
  StoreResultsSkeleton,
} from "./StoreResults";
import { prisma } from "@/lib/prisma";
import { facetasTienda } from "@/lib/catalogo-consulta";
import {
  COLORES,
  LICENCIAS,
  ORDENES,
  ORIENTACIONES,
  RANGOS_PRECIO,
  alternar,
  hayFiltros,
  leerParametros,
  lista,
  ordenPorDefecto,
  paginaActual,
  urlTienda,
  type OrdenCatalogo,
} from "@/lib/catalogo";

export const dynamic = "force-dynamic";

/** Orden de la fila de categorías; las que no están, después. */
const ORDEN_CATEGORIAS = [
  "flyers",
  "eventos",
  "corporativos",
  "social-media",
  "redes",
  "marca",
  "mockups",
  "plantillas",
  "general",
];

/** Ícono de cada categoría por su slug; las demás, una carpeta. */
const ICONO_CATEGORIA: Record<string, LucideIcon> = {
  flyers: FileImage,
  eventos: PartyPopper,
  corporativos: Briefcase,
  "social-media": MessageCircleHeart,
  redes: MessageCircleHeart,
  marca: Gem,
  mockups: Smartphone,
  plantillas: LayoutTemplate,
  general: Shapes,
};

/** Órdenes de Explorar (relevancia solo al buscar). Sin precio. */
const ORDENES_EXPLORAR: OrdenCatalogo[] = [
  "relevancia",
  "recientes",
  "populares",
  "descargas",
];

type StoreProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Metadata de la tienda.
 *
 * La tienda tiene nueve parámetros combinables (búsqueda,
 * categoría, etiqueta, formato, color, precio, packs, orden y
 * página). Si cada combinación declarase su propia canónica,
 * el mismo catálogo aparecería en los buscadores miles de
 * veces. Aquí solo dos filtros generan URL propia:
 *
 *   · categoria · es la única navegación por secciones del
 *     sitio y es la que publica el sitemap.
 *   · tag       · son los enlaces de /tags, que también se
 *     indexa.
 *
 * El resto (orden, color, formato, precio, packs) reordena o
 * recorta un listado que ya existe, así que canoniza al
 * listado del que sale. `page` se conserva porque la página 2
 * enseña recursos distintos: quitarla los dejaría fuera.
 *
 * La búsqueda (`q`) no se indexa: son resultados generados
 * por quien escribe en la caja, no páginas del catálogo.
 */
export async function generateMetadata({
  searchParams,
}: StoreProps): Promise<Metadata> {
  const parametros = leerParametros(await searchParams);

  if (parametros.q) {
    return paginaPrivada("Buscar recursos");
  }

  const categoria = parametros.categoria
    ? await prisma.category.findUnique({
        where: { slug: parametros.categoria },
        select: { name: true, slug: true },
      })
    : null;

  // Una categoría que no existe no merece página propia.
  const etiqueta = parametros.tag && !categoria ? parametros.tag : null;

  const canonicos = new URLSearchParams();

  if (categoria) canonicos.set("categoria", categoria.slug);
  else if (etiqueta) canonicos.set("tag", etiqueta);

  if (parametros.page) canonicos.set("page", parametros.page);

  const consulta = canonicos.toString();
  const ruta = consulta ? `/tienda?${consulta}` : "/tienda";

  const pagina = paginaActual(parametros);

  const titulo = categoria
    ? categoria.name
    : etiqueta
      ? `Recursos con la etiqueta ${etiqueta}`
      : "Recursos";

  const descripcion = categoria
    ? `Recursos digitales de la categoría ${categoria.name} en RcktX, listos para descargar.`
    : etiqueta
      ? `Recursos digitales etiquetados como ${etiqueta} en RcktX.`
      : "Explora y compra recursos digitales en RcktX.";

  return paginaPublica({
    // La página 2 en adelante lo dice en el título.
    titulo: pagina > 1 ? `${titulo} · Página ${pagina}` : titulo,
    descripcion,
    ruta,
  });
}

export default async function Store({ searchParams }: StoreProps) {
  const parametros = leerParametros(await searchParams);

  /*
    Las categorías salen de la base: no se inventa ninguna, y solo
    se ofrecen las que tienen recursos publicados (o la que llega
    en la URL). La fila sigue ORDEN_CATEGORIAS y las demás van
    después, por nombre.

    Dos juegos de contadores: `facetas` cuenta cada grupo con los
    demás filtros activos; `base`, el catálogo publicado entero,
    decide qué opciones existen de verdad. Sin filtros son el mismo.
  */
  const hayFiltrosPanel = hayFiltros(parametros) || Boolean(parametros.sin);

  const [categoriasCrudas, facetas, base, destacadosBusqueda, etiquetaTag] =
    await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { name: true, slug: true },
      }),

      facetasTienda(parametros),

      hayFiltrosPanel ? facetasTienda({}) : null,

      /* Frases del buscador que se escribe solo: los mismos
         términos de «Populares ahora». Sin ellos, no se anima. */
      terminosDestacados(6).catch(() => []),

      // Nombre de la etiqueta de la URL (?tag=, enlaces de /tags).
      parametros.tag
        ? prisma.tag.findUnique({
            where: { slug: parametros.tag },
            select: { name: true },
          })
        : null,
    ]);

  const posicion = (slug: string) => {
    const i = ORDEN_CATEGORIAS.indexOf(slug);
    return i === -1 ? ORDEN_CATEGORIAS.length : i;
  };

  const conteoBase = base ?? facetas;
  const categoriasMarcadas = lista(parametros.categoria);

  const categorias = categoriasCrudas
    .filter(
      (c) =>
        (conteoBase.categorias[c.slug] ?? 0) > 0 ||
        categoriasMarcadas.includes(c.slug)
    )
    .sort(
      (a, b) =>
        posicion(a.slug) - posicion(b.slug) || a.name.localeCompare(b.name)
    );

  /*
    Filtros aplicados: una píldora por VALOR, cada una con la URL
    sin ese valor. Incluye lo que llega de otros sitios (búsqueda,
    etiqueta de /tags, packs, tramo de precio) aunque el panel no
    lo ofrezca: un filtro activo siempre se ve y se puede quitar.
  */
  const aplicados: { clave: string; etiqueta: string; href: string }[] = [];

  const porValor = (
    clave: "categoria" | "licencia" | "formato" | "color" | "orientacion",
    nombre: (valor: string) => string
  ) => {
    for (const valor of lista(parametros[clave])) {
      aplicados.push({
        clave: `${clave}-${valor}`,
        etiqueta: nombre(valor),
        href: urlTienda(parametros, {
          [clave]: alternar(parametros[clave], valor),
        }),
      });
    }
  };

  if (parametros.q) {
    aplicados.push({
      clave: "q",
      etiqueta: `«${parametros.q}»`,
      href: urlTienda(parametros, { q: undefined }),
    });
  }

  porValor("categoria", (v) => categorias.find((c) => c.slug === v)?.name ?? v);
  porValor("licencia", (v) => LICENCIAS.find((l) => l.valor === v)?.etiqueta ?? v);
  porValor("formato", (v) => v.toUpperCase());
  porValor("color", (v) => COLORES.find((c) => c.valor === v)?.etiqueta ?? v);
  porValor(
    "orientacion",
    (v) => ORIENTACIONES.find((o) => o.valor === v)?.etiqueta ?? v
  );

  if (parametros.tag) {
    aplicados.push({
      clave: "tag",
      etiqueta: etiquetaTag?.name ?? parametros.tag,
      href: urlTienda(parametros, { tag: undefined }),
    });
  }

  if (parametros.pack === "true") {
    aplicados.push({
      clave: "pack",
      etiqueta: "Solo packs",
      href: urlTienda(parametros, { pack: undefined }),
    });
  }

  const rango = RANGOS_PRECIO.find((r) => r.valor === parametros.precio);

  if (rango) {
    aplicados.push({
      clave: "precio",
      etiqueta: rango.etiqueta,
      href: urlTienda(parametros, { precio: undefined }),
    });
  }

  const hayBusqueda = Boolean(parametros.q);
  const ordenes = ORDENES.filter(
    (o) =>
      ORDENES_EXPLORAR.includes(o.valor) &&
      (!o.soloConBusqueda || hayBusqueda)
  );
  // Un orden de la URL que Explorar no ofrece (p. ej. por precio)
  // sigue funcionando, pero el selector enseña el de por defecto.
  const ordenActual =
    ordenes.find((o) => o.valor === parametros.sort)?.valor ??
    ordenPorDefecto(hayBusqueda);

  const activosPanel = aplicados.filter((a) => a.clave !== "q").length;
  const total = facetas.total;

  return (
    <>
      <Navbar />

      <main className="rk-explorar mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ══════════ CABECERA ══════════ */}
        <section className="rk-ex-cab">
          <h1>Explorar</h1>

          {/* Total real del catálogo filtrado, no de la página. */}
          <p>
            {total} {total === 1 ? "recurso" : "recursos"}
          </p>
        </section>

        {/* ══════════ CATEGORÍAS ══════════ */}
        <nav aria-label="Categorías" className="rk-ex-categorias">
          <Link
            href={urlTienda(parametros, { categoria: undefined })}
            className="rk-ex-cat"
            aria-current={categoriasMarcadas.length === 0 ? "true" : undefined}
            scroll={false}
          >
            <LayoutGrid size={22} aria-hidden />
            Todos
          </Link>

          {categorias.map((categoria) => {
            const Icono = ICONO_CATEGORIA[categoria.slug] ?? Folder;
            const activa = categoriasMarcadas.includes(categoria.slug);

            return (
              <Link
                key={categoria.slug}
                href={urlTienda(parametros, {
                  // La fila elige UNA categoría; varias, en el panel.
                  categoria:
                    activa && categoriasMarcadas.length === 1
                      ? undefined
                      : categoria.slug,
                })}
                className="rk-ex-cat"
                aria-current={activa ? "true" : undefined}
                scroll={false}
              >
                <Icono size={22} aria-hidden />
                {categoria.name}
              </Link>
            );
          })}
        </nav>

        {/* ══════════ FILTROS Y RESULTADOS ══════════ */}
        <div className="rk-ex-cuerpo">
          <CajonFiltros total={total}>
            <PanelFiltros
              parametros={parametros}
              facetas={facetas}
              base={conteoBase}
              categorias={categorias}
            />
          </CajonFiltros>

          <div className="min-w-0">
            {/*
              relative z-20: las sugerencias del buscador se pintan
              encima de la rejilla. Por debajo del Navbar (40) y del
              menú inferior (50).
            */}
            <div className="rk-ex-barra relative z-20">
              {/*
                Una búsqueda nueva no tira los filtros que ya
                estaban puestos: viajan como campos ocultos.
              */}
              <BuscadorSugerencias
                valorInicial={parametros.q ?? ""}
                idInput={ID_BUSCADOR_TIENDA}
                frasesAnimadas={destacadosBusqueda.map((d) => d.etiqueta)}
                className="rk-ex-buscador"
                ocultos={{
                  categoria: parametros.categoria,
                  licencia: parametros.licencia,
                  formato: parametros.formato,
                  color: parametros.color,
                  orientacion: parametros.orientacion,
                  tag: parametros.tag,
                  precio: parametros.precio,
                  pack: parametros.pack,
                  sort: parametros.sort,
                }}
              />

              <div className="rk-ex-barra-acciones">
                <OrdenExplorar
                  actual={ordenActual}
                  opciones={ordenes.map((o) => ({
                    valor: o.valor,
                    etiqueta: o.etiqueta,
                    href: urlTienda(parametros, { sort: o.valor }),
                  }))}
                />

                <BotonFiltros activos={activosPanel} />
              </div>
            </div>

            {/* Lo que está aplicado, y cómo quitarlo uno a uno. */}
            {aplicados.length > 0 && (
              <ul className="rk-ex-aplicados" aria-label="Filtros aplicados">
                {aplicados.map((filtro) => (
                  <li key={filtro.clave}>
                    <Link
                      href={filtro.href}
                      className="rk-chip rk-hit-44-y"
                      scroll={false}
                    >
                      {filtro.etiqueta}
                      <X size={12} aria-hidden />
                      <span className="sr-only">
                        Quitar filtro {filtro.etiqueta}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/*
              El límite de carga vive aquí, no en un loading.tsx de
              segmento: así no afecta a /tienda/[slug], que necesita
              poder devolver un 404 real.
            */}
            <Suspense
              key={JSON.stringify(parametros)}
              fallback={<StoreResultsSkeleton />}
            >
              <StoreResults parametros={parametros} />
            </Suspense>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
