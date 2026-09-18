import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Search, SearchX, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
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

  // Solo se muestran recursos PUBLISHED: los estados
  // DRAFT, PENDING_REVIEW, REJECTED y ARCHIVED nunca
  // deben aparecer públicamente.
  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
  };

  if (categorySlug) {
    where.category = {
      slug: categorySlug,
    };
  }

  if (query) {
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        category: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,

      include: {
        category: true,

        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
          select: {
            url: true,
            alt: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

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
  ]);

  const activeCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  const hasFilters = Boolean(query || categorySlug);

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

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-5 lg:px-8 lg:pb-24 lg:pt-12">

        {/* ENCABEZADO + BUSCADOR */}
        <section className="rk-enter">
          <div className="rk-glass rounded-[2rem] px-5 py-8 sm:rounded-[2.5rem] sm:px-9 sm:py-10">
            <p className="rk-eyebrow">RCKTDMG</p>

            <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight sm:text-4xl lg:text-5xl">
              {activeCategory ? activeCategory.name : "Recursos"}
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/50">
              Explora recursos digitales para potenciar tus proyectos.
            </p>

            {/* BUSCADOR */}
            <form action="/tienda" method="GET" className="mt-7">
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
                  className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/35"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Buscar recursos..."
                  aria-label="Buscar recursos"
                  autoComplete="off"
                  className="h-14 w-full rounded-[1.25rem] border border-ink/[0.07] bg-surface/75 pl-14 pr-28 text-[15px] outline-none backdrop-blur-xl transition duration-300 ease-rk placeholder:text-ink/35 focus:border-accent/40 focus:bg-surface focus:shadow-[0_0_0_4px_var(--rk-accent-soft)]"
                />

                <button
                  type="submit"
                  className="rk-press absolute right-2 top-1/2 -translate-y-1/2 rounded-[0.9rem] bg-primary px-5 py-2.5 text-sm font-medium text-onprimary shadow-rk-sm"
                >
                  Buscar
                </button>
              </div>
            </form>

            {/* CATEGORÍAS */}
            {categories.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={categoryHref()}
                  className={`rk-chip ${
                    categorySlug ? "" : "rk-chip-active"
                  }`}
                >
                  Todas
                </Link>

                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={categoryHref(category.slug)}
                    className={`rk-chip ${
                      category.slug === categorySlug
                        ? "rk-chip-active"
                        : ""
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RESUMEN DE BÚSQUEDA */}
        {hasFilters && (
          <div className="rk-enter rk-enter-1 mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink/50">
              {query && (
                <>
                  Resultados para{" "}
                  <span className="font-medium text-ink">
                    “{query}”
                  </span>
                  {activeCategory && " "}
                </>
              )}

              {activeCategory && (
                <>
                  en{" "}
                  <span className="font-medium text-ink">
                    {activeCategory.name}
                  </span>
                </>
              )}

              {" · "}
              {products.length}{" "}
              {products.length === 1
                ? "recurso encontrado"
                : "recursos encontrados"}
            </p>

            <Link href="/tienda" className="rk-chip">
              <X size={13} />
              Limpiar búsqueda
            </Link>
          </div>
        )}

        {/* PRODUCTOS */}
        {products.length > 0 ? (
          <div className="rk-enter rk-enter-2 mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: Number(product.price),
                  coverUrl: product.coverUrl,
                  image: product.images[0] ?? null,
                  category: product.category,
                }}
              />
            ))}
          </div>
        ) : (
          /* SIN RESULTADOS */
          <div className="rk-enter rk-enter-1 rk-card mt-6 px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-ink/[0.05]">
              <SearchX size={26} className="text-ink/35" />
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              {hasFilters
                ? "No encontramos recursos"
                : "Todavía no hay recursos publicados"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/45">
              {hasFilters
                ? "No hay recursos publicados que coincidan con tu búsqueda. Prueba con otro término."
                : "Vuelve pronto: los creadores están preparando sus recursos."}
            </p>

            {hasFilters && (
              <Link
                href="/tienda"
                className="rk-btn rk-btn-primary mt-7"
              >
                Ver todos los recursos
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
