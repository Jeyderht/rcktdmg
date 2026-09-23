import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltrosMoviles from "./FiltrosMoviles";
import FiltrosSidebar from "./FiltrosSidebar";
import StoreResults, {
  StoreResultsSkeleton,
} from "./StoreResults";
import { prisma } from "@/lib/prisma";
import {
  COLORES,
  ORDENES,
  RANGOS_PRECIO,
  TAG_PACK,
  leerParametros,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Recursos",
  description:
    "Explora y compra recursos digitales en RCKTDMG.",
};

export const dynamic = "force-dynamic";

type StoreProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
  const [categories, formatosCrudos, coloresCrudos, totalPacks] =
    await Promise.all([
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

  const activeCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  // Quitar solo la búsqueda, conservando el resto de filtros.
  const clearQueryHref = urlTienda(parametros, { q: undefined });

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

  const ordenActual =
    ORDENES.find((o) => o.valor === parametros.sort) ?? ORDENES[0];

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
          <form action="/tienda" method="GET">
            {/*
              Una búsqueda nueva no debe tirar los filtros que ya
              estaban puestos: viajan como campos ocultos.
            */}
            {(
              ["categoria", "formato", "color", "precio", "pack", "sort"] as const
            ).map((clave) =>
              parametros[clave] ? (
                <input
                  key={clave}
                  type="hidden"
                  name={clave}
                  value={parametros[clave]}
                />
              ) : null
            )}

            <div className="relative max-w-2xl">
              <Search
                size={18}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/60"
              />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Buscar recursos..."
                aria-label="Buscar recursos"
                autoComplete="off"
                className="h-14 w-full rounded-rk-md border border-line/10 bg-surface/70 pl-14 pr-[6.5rem] text-[15px] outline-none backdrop-blur-rk transition-colors duration-normal ease-rk placeholder:text-ink/60 hover:border-line/20 focus:border-ink/40 focus:bg-surface focus:shadow-[0_0_0_4px_var(--rk-accent-soft)]"
              />

              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {/* Limpiar: navegación real, conserva los filtros. */}
                {query && (
                  <Link
                    href={clearQueryHref}
                    aria-label="Limpiar búsqueda"
                    title="Limpiar búsqueda"
                    className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <X size={15} />
                  </Link>
                )}

                <button
                  type="submit"
                  className="rk-btn rk-btn-ink !px-4 !py-3 !text-sm"
                >
                  Buscar
                </button>
              </div>
            </div>
          </form>
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
            totalPacks={totalPacks}
          />

          <div className="min-w-0 flex-1">
            {/* En móvil, los filtros viven en una hoja inferior. */}
            <FiltrosMoviles
              actuales={parametros}
              formatos={formatos}
              colores={colores}
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
                    className="rk-chip rk-chip-active"
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
