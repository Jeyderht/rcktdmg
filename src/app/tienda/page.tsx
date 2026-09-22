import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoreResults, {
  StoreResultsSkeleton,
} from "./StoreResults";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recursos",
  description:
    "Explora y compra recursos digitales en RCKTDMG.",
};

export const dynamic = "force-dynamic";

type StoreProps = {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
  }>;
};

export default async function Store({ searchParams }: StoreProps) {
  const params = await searchParams;

  const query =
    typeof params.q === "string" ? params.q.trim() : "";

  const categorySlug =
    typeof params.categoria === "string"
      ? params.categoria.trim()
      : "";

  // Las categorías se necesitan para pintar los filtros, que
  // van por encima de los resultados.
  const categories = await prisma.category.findMany({
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
  });

  const activeCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  // Conserva el otro filtro al cambiar de categoría.
  function categoryHref(slug?: string) {
    const search = new URLSearchParams();

    if (query) {
      search.set("q", query);
    }

    if (slug) {
      search.set("categoria", slug);
    }

    const queryString = search.toString();

    return queryString ? `/tienda?${queryString}` : "/tienda";
  }

  // Quitar solo la búsqueda, conservando la categoría activa.
  const clearQueryHref = categorySlug
    ? `/tienda?categoria=${categorySlug}`
    : "/tienda";

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">

        {/* ══════════ CABECERA ══════════ */}
        <section className="rk-fade-up relative overflow-hidden">
          {/* Decoración CSS sutil: un halo y nada más. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-accent/12 blur-[90px]"
          />

          <p className="rk-eyebrow">RCKTDMG Store</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl lg:text-5xl">
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
            {/* Mantiene la categoría activa al buscar. */}
            {categorySlug && (
              <input
                type="hidden"
                name="categoria"
                value={categorySlug}
              />
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
                className="h-14 w-full rounded-rk-md border border-line/10 bg-surface/70 pl-14 pr-[6.5rem] text-[15px] outline-none backdrop-blur-rk transition-colors duration-normal ease-rk placeholder:text-ink/60 hover:border-line/20 focus:border-accent/55 focus:bg-surface focus:shadow-[0_0_0_4px_var(--rk-accent-soft)]"
              />

              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {/* Limpiar: navegación real, conserva la categoría. */}
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
                  className="rk-btn rk-btn-primary !min-h-0 !px-4 !py-2.5 !text-sm"
                >
                  Buscar
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* ══════════ FILTROS ══════════ */}
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
                  href={categoryHref()}
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
                      href={categoryHref(category.slug)}
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

        {/*
          ══════════ RESULTADOS ══════════
          El límite de carga vive aquí, no en un loading.tsx de
          segmento: así no afecta a /tienda/[slug], que necesita
          poder devolver un 404 real.
        */}
        <Suspense
          key={`${query}|${categorySlug}`}
          fallback={<StoreResultsSkeleton />}
        >
          <StoreResults
            query={query}
            categorySlug={categorySlug}
            activeCategoryName={activeCategory?.name ?? null}
          />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
