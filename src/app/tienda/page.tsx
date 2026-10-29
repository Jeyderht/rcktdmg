import Link from "next/link";
import type { Metadata } from "next";

import { paginaPrivada, paginaPublica } from "@/lib/seo";
import { Suspense } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BuscadorSugerencias from "@/components/layout/BuscadorSugerencias";
import { ID_BUSCADOR_TIENDA } from "@/lib/busqueda-ui";
import { terminosDestacados } from "@/lib/busqueda";
import FiltrosMoviles from "./FiltrosMoviles";
import FiltrosSidebar from "./FiltrosSidebar";
import StoreResults, {
  StoreResultsSkeleton,
} from "./StoreResults";
import { prisma } from "@/lib/prisma";
import {
  COLORES,
  RANGOS_PRECIO,
  TAG_PACK,
  leerParametros,
  ordenPorDefecto,
  paginaActual,
  ordenesDisponibles,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";
import { esTagProtegido } from "@/lib/tags-comun";
import { CATEGORIA_SOCIAL_MEDIA } from "@/lib/home";

export const dynamic = "force-dynamic";

/** Categorías que van primero en la tienda (y la primera, por defecto). */
const CATEGORIAS_PRIMERO = ["eventos", "general"];

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

  /*
    Una categoría sin recursos publicados no se enseña: la página
    cae en la categoría por defecto, así que tampoco tiene título
    ni canónica propios (los de /tienda).
  */
  const categoria = parametros.categoria
    ? await prisma.category.findFirst({
        where: {
          slug: parametros.categoria,
          products: { some: { status: "PUBLISHED" } },
        },
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

  const query = parametros.q ?? "";
  const categorySlug = parametros.categoria ?? "";

  /*
    Las opciones de filtro salen del catálogo real: solo se
    ofrecen formatos y colores que de verdad tienen recursos
    publicados detrás, para que ningún filtro lleve a una
    lista vacía.
  */
  const [
    categories,
    formatosCrudos,
    coloresCrudos,
    etiquetasCrudas,
    totalPacks,
    destacadosBusqueda,
  ] = await Promise.all([
      /*
        Las categorías con recursos publicados, como siempre, y
        además Eventos y General aunque hoy estén vacías: sus
        chips salen siempre (desactivados si no tienen nada).
      */
      prisma.category.findMany({
        where: {
          OR: [
            { products: { some: { status: "PUBLISHED" } } },
            { slug: { in: CATEGORIAS_PRIMERO } },
          ],
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: { where: { status: "PUBLISHED" } } } },
        },
      }),

      prisma.product.groupBy({
        by: ["fileFormat"],
        where: {
          status: "PUBLISHED",
          fileFormat: { not: null },
        },
        _count: { _all: true },
      }),

      prisma.product.groupBy({
        by: ["color"],
        where: {
          status: "PUBLISHED",
          color: { not: null },
        },
        _count: { _all: true },
      }),

      /*
        Etiquetas con recursos publicados detrás, las más
        usadas primero. Igual que formatos y colores: ninguna
        opción del panel puede llevar a una lista vacía.
      */
      prisma.tag.findMany({
        where: { products: { some: { product: { status: "PUBLISHED" } } } },
        orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
        take: 12,
        select: {
          name: true,
          slug: true,
          _count: {
            select: {
              products: { where: { product: { status: "PUBLISHED" } } },
            },
          },
        },
      }),

      prisma.product.count({
        where: {
          status: "PUBLISHED",
          tags: { some: { tag: { slug: TAG_PACK } } },
        },
      }),

      /* Frases del buscador que se escribe solo: los mismos
         términos de «Populares ahora». Sin ellos, no se anima. */
      terminosDestacados(6).catch(() => []),
    ]);

  const formatos = formatosCrudos
    .filter((fila) => Boolean(fila.fileFormat))
    .map((fila) => ({
      valor: fila.fileFormat as string,
      etiqueta: (fila.fileFormat as string).toUpperCase(),
      conteo: fila._count._all,
    }))
    .sort((a, b) => b.conteo - a.conteo || a.valor.localeCompare(b.valor));

  // Se respeta el orden de la paleta, no el alfabético.
  const colores = COLORES.flatMap((definicion) => {
    const fila = coloresCrudos.find(
      (c) => c.color === definicion.valor
    );

    if (!fila) return [];

    return [
      {
        valor: definicion.valor,
        etiqueta: definicion.etiqueta,
        conteo: fila._count._all,
      },
    ];
  });

  /*
    La etiqueta "pack" no se ofrece aquí como una etiqueta
    más: ya tiene su propio interruptor ("Solo packs") y
    verla dos veces con nombres distintos confundiría.
  */
  const etiquetas = etiquetasCrudas
    .filter((fila) => !esTagProtegido(fila.slug))
    .map((fila) => ({
      valor: fila.slug,
      etiqueta: fila.name,
      conteo: fila._count.products,
    }));

  /*
    SIEMPRE HAY UNA CATEGORÍA ACTIVA (no existe «Todos»).
    Orden de los chips: Eventos, General y después el resto por
    nombre. Activa: la de la URL si existe y tiene recursos; si
    no (sin categoría, «todos», un slug viejo o una categoría
    vacía), la primera con recursos: Eventos.
  */
  const rango = (slug: string) => {
    const i = CATEGORIAS_PRIMERO.indexOf(slug);
    return i === -1 ? CATEGORIAS_PRIMERO.length : i;
  };
  const categorias = [...categories].sort(
    (a, b) => rango(a.slug) - rango(b.slug) || a.name.localeCompare(b.name, "es")
  );
  const conRecursos = (c: (typeof categorias)[number]) => c._count.products > 0;

  const activeCategory =
    categorias.find((c) => c.slug === categorySlug && conRecursos(c)) ??
    categorias.find(conRecursos) ??
    null;

  /* Los parámetros con los que se consulta y se construyen los
     enlaces: los de la URL, con la categoría activa ya puesta. */
  const parametrosActivos: ParametrosTienda = {
    ...parametros,
    categoria: activeCategory?.slug,
  };

  /* Filtros aplicados, cada uno con su propia forma de quitarse.
     La categoría no va aquí: se cambia con sus chips. */
  const aplicados: { clave: keyof ParametrosTienda; etiqueta: string }[] =
    [];

  if (parametros.precio) {
    const rango = RANGOS_PRECIO.find(
      (r) => r.valor === parametros.precio
    );

    if (rango) {
      aplicados.push({ clave: "precio", etiqueta: rango.etiqueta });
    }
  }

  if (parametros.tag) {
    /*
      El nombre bonito sale de la lista ya consultada; si la
      etiqueta de la URL no existe, se enseña el slug tal cual
      en vez de esconder el filtro y dejar los resultados sin
      explicación.
    */
    const etiqueta = etiquetas.find((e) => e.valor === parametros.tag);

    aplicados.push({
      clave: "tag",
      etiqueta: etiqueta?.etiqueta ?? parametros.tag,
    });
  }

  if (parametros.formato) {
    aplicados.push({
      clave: "formato",
      etiqueta: parametros.formato.toUpperCase(),
    });
  }

  if (parametros.color) {
    const color = COLORES.find((c) => c.valor === parametros.color);

    if (color) {
      aplicados.push({ clave: "color", etiqueta: color.etiqueta });
    }
  }

  if (parametros.pack === "true") {
    aplicados.push({ clave: "pack", etiqueta: "Solo packs" });
  }

  const hayBusqueda = Boolean(parametros.q);

  const disponibles = ordenesDisponibles(hayBusqueda);

  const ordenActual =
    disponibles.find((o) => o.valor === parametros.sort) ??
    disponibles.find(
      (o) => o.valor === ordenPorDefecto(hayBusqueda)
    ) ??
    disponibles[0];

  return (
    <>
      <Navbar />

      {/* El margen lateral (16/24/32 px + zona segura) lo pone .rk-explorar en el CSS. */}
      <main className="rk-explorar mx-auto w-full max-w-7xl pb-16 pt-6 lg:pb-20 lg:pt-10">

        {/* ══════════ CABECERA ══════════ */}
        {/* Sin cabecera visible: las pestañas van justo bajo la barra.
            El h1 queda para lectores de pantalla. */}
        <h1 className="sr-only">Explora recursos digitales</h1>

        {/* ══════════ CATEGORÍAS ══════════ */}
        {categorias.length > 0 && (
          <section className="rk-fade-up rk-enter-2 rk-explorar-cats">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal
                size={15}
                className="hidden shrink-0 text-ink/60 sm:block"
                aria-hidden
              />

              {/*
                Scroll horizontal: los filtros nunca ganan alto
                ni desbordan la página, por muchos que haya.
              */}
              <div
                role="group"
                aria-label="Filtrar por categoría"
                className="rk-explorar-chips flex flex-1 gap-2 overflow-x-auto pb-1"
              >
                {/* Sin «Todos»: siempre hay una categoría activa. */}
                {categorias.map((category) => {
                  const active = category.slug === activeCategory?.slug;

                  /*
                    «Diseño general» lleva a Social Media, igual que
                    «Diseños generales» en el inicio (si Social Media
                    tiene recursos). Al llegar, el chip activo es el
                    de Social Media.
                  */
                  const socialMedia = categorias.find(
                    (c) => c.slug === CATEGORIA_SOCIAL_MEDIA && conRecursos(c)
                  );
                  if (category.slug === "general" && socialMedia) {
                    return (
                      <Link
                        key={category.id}
                        href={urlTienda(parametrosActivos, {
                          categoria: socialMedia.slug,
                        })}
                        className="rk-chip shrink-0"
                      >
                        {category.name}
                      </Link>
                    );
                  }

                  // Sin recursos publicados: el chip se ve, pero no lleva a ningún sitio.
                  if (!conRecursos(category)) {
                    return (
                      <span
                        key={category.id}
                        aria-disabled="true"
                        title="Todavía no hay recursos en esta categoría"
                        className="rk-chip rk-chip-vacio shrink-0"
                      >
                        {category.name}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={category.id}
                      href={urlTienda(parametrosActivos, {
                        categoria: category.slug,
                      })}
                      aria-current={active ? "true" : undefined}
                      className={`rk-chip shrink-0 ${
                        active ? "rk-chip-active" : ""
                      }`}
                    >
                      {category.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══════════ FILTROS Y RESULTADOS ══════════ */}
        {/* Ritmo vertical de la cabecera (16/12/16/16 en móvil): en el CSS. */}
        <div className="rk-explorar-cuerpo flex gap-8">
          <FiltrosSidebar
            actuales={parametrosActivos}
            formatos={formatos}
            colores={colores}
            etiquetas={etiquetas}
            totalPacks={totalPacks}
          />

          <div className="min-w-0 flex-1">
            {/* ══════════ BUSCADOR ══════════ */}
            {/*
              relative z-20: la animación de entrada deja un transform
              en la sección y la convierte en contexto de apilamiento,
              así que el z-50 de las sugerencias no salía de ella y los
              chips y botones de abajo se pintaban encima. Por debajo
              del Navbar (40) y del menú inferior (50).
            */}
            <section className="rk-fade-up rk-enter-1 relative z-20">
              {/*
                Una búsqueda nueva no debe tirar los filtros que ya
                estaban puestos: viajan como campos ocultos dentro
                del formulario.
              */}
              <BuscadorSugerencias
                valorInicial={query}
                idInput={ID_BUSCADOR_TIENDA}
                frasesAnimadas={destacadosBusqueda.map((d) => d.etiqueta)}
                className="rk-explorar-buscador"
                ocultos={{
                  categoria: parametrosActivos.categoria,
                  tag: parametros.tag,
                  formato: parametros.formato,
                  color: parametros.color,
                  precio: parametros.precio,
                  pack: parametros.pack,
                  sort: parametros.sort,
                }}
              />
            </section>

            {/* En móvil, los filtros viven en una hoja inferior. */}
            <FiltrosMoviles
              actuales={parametrosActivos}
              formatos={formatos}
              colores={colores}
              etiquetas={etiquetas}
              totalPacks={totalPacks}
            />

            {/* Lo que está aplicado, y cómo quitarlo. */}
            {aplicados.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {aplicados.map((filtro) => (
                  <Link
                    key={filtro.clave}
                    href={urlTienda(parametrosActivos, {
                      [filtro.clave]: undefined,
                    })}
                    className="rk-chip rk-chip-active rk-hit-44-y"
                  >
                    {filtro.etiqueta}
                    <X size={12} aria-hidden />
                    <span className="sr-only">
                      Quitar filtro {filtro.etiqueta}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* El orden activo también se ve en escritorio. */}
            {parametros.sort && (
              <p className="mt-3 hidden text-xs text-ink/45 lg:block">
                Orden: {ordenActual.etiqueta}
              </p>
            )}

            {/*
              El límite de carga vive aquí, no en un loading.tsx de
              segmento: así no afecta a /tienda/[slug], que necesita
              poder devolver un 404 real.
            */}
            <Suspense
              key={JSON.stringify(parametrosActivos)}
              fallback={<StoreResultsSkeleton />}
            >
              <StoreResults
                parametros={parametrosActivos}
                activeCategoryName={activeCategory?.name ?? null}
              />
            </Suspense>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
