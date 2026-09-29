import Link from "next/link";
import type { Metadata } from "next";

import { paginaPrivada, paginaPublica } from "@/lib/seo";
import { Suspense } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BuscadorSugerencias from "@/components/BuscadorSugerencias";
import { ID_BUSCADOR_TIENDA } from "@/lib/busqueda-ui";
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

export const dynamic = "force-dynamic";

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
    ? `Recursos digitales de la categoría ${categoria.name} en RCKTDMG, listos para descargar.`
    : etiqueta
      ? `Recursos digitales etiquetados como ${etiqueta} en RCKTDMG.`
      : "Explora y compra recursos digitales en RCKTDMG.";

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
  ] = await Promise.all([
      prisma.category.findMany({
        where: {
          products: {
            some: {
              status: "PUBLISHED",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
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

  const activeCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  /* Filtros aplicados, cada uno con su propia forma de quitarse. */
  const aplicados: { clave: keyof ParametrosTienda; etiqueta: string }[] =
    [];

  if (activeCategory) {
    aplicados.push({
      clave: "categoria",
      etiqueta: activeCategory.name,
    });
  }

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

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">

        {/* ══════════ CABECERA ══════════ */}
        <section className="rk-fade-up relative overflow-hidden">
          {/* Decoración CSS sutil: un halo y nada más. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-ink/[0.05] blur-[90px]"
          />

          <p className="rk-kicker">RCKTDMG Store</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl lg:text-5xl">
            Explora recursos digitales
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Plantillas y packs creados por diseñadores, listos
            para descargar y usar en tus proyectos.
          </p>
        </section>

        {/* ══════════ BUSCADOR ══════════ */}
        <section className="rk-fade-up rk-enter-1 mt-7">
          {/*
            Una búsqueda nueva no debe tirar los filtros que ya
            estaban puestos: viajan como campos ocultos dentro
            del formulario.
          */}
          <BuscadorSugerencias
            valorInicial={query}
            idInput={ID_BUSCADOR_TIENDA}
            className="max-w-2xl"
            ocultos={{
              categoria: parametros.categoria,
              tag: parametros.tag,
              formato: parametros.formato,
              color: parametros.color,
              precio: parametros.precio,
              pack: parametros.pack,
              sort: parametros.sort,
            }}
          />
        </section>

        {/* ══════════ CATEGORÍAS ══════════ */}
        {categories.length > 0 && (
          <section className="rk-fade-up rk-enter-2 mt-4">
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
                className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
              >
                <Link
                  href={urlTienda(parametros, { categoria: undefined })}
                  aria-current={!categorySlug ? "true" : undefined}
                  className={`rk-chip shrink-0 ${
                    categorySlug ? "" : "rk-chip-active"
                  }`}
                >
                  Todos
                </Link>

                {categories.map((category) => {
                  const active = category.slug === categorySlug;

                  return (
                    <Link
                      key={category.id}
                      href={urlTienda(parametros, {
                        categoria: active ? undefined : category.slug,
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
        <div className="mt-5 flex gap-6">
          <FiltrosSidebar
            actuales={parametros}
            formatos={formatos}
            colores={colores}
            etiquetas={etiquetas}
            totalPacks={totalPacks}
          />

          <div className="min-w-0 flex-1">
            {/* En móvil, los filtros viven en una hoja inferior. */}
            <FiltrosMoviles
              actuales={parametros}
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
                    href={urlTienda(parametros, {
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
              key={JSON.stringify(parametros)}
              fallback={<StoreResultsSkeleton />}
            >
              <StoreResults
                parametros={parametros}
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
