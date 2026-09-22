import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { SearchX, X } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

type StoreResultsProps = {
  query: string;
  categorySlug: string;
  activeCategoryName: string | null;
};

/**
 * Resultados de la tienda.
 *
 * Va dentro de un <Suspense> en la página para que la
 * cabecera y los filtros se pinten de inmediato mientras se
 * resuelve la consulta.
 *
 * El límite de carga vive AQUÍ y no en un `loading.tsx` de
 * segmento: un loading.tsx en /tienda también envolvería a
 * /tienda/[slug], y al empezar el streaming la respuesta se
 * comprometería como 200, impidiendo que notFound() devuelva
 * un 404 real en un producto inexistente.
 */
export default async function StoreResults({
  query,
  categorySlug,
  activeCategoryName,
}: StoreResultsProps) {
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

  const products = await prisma.product.findMany({
    where,

    include: {
      category: true,

      // El autor real, para mostrarlo en la tarjeta.
      creator: {
        select: {
          name: true,
          publicName: true,
          username: true,
          creatorStatus: true,
        },
      },

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
  });

  const hasFilters = Boolean(query || categorySlug);

  return (
    <>
      {/* CONTADOR Y CONTEXTO */}
      <section className="rk-fade-up mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {query ? (
            <p className="text-[15px] text-ink/60">
              Resultados para{" "}
              <span className="font-semibold text-ink">“{query}”</span>

              {activeCategoryName && (
                <>
                  {" en "}
                  <span className="font-semibold text-ink">
                    {activeCategoryName}
                  </span>
                </>
              )}
            </p>
          ) : activeCategoryName ? (
            <p className="text-[15px] text-ink/60">
              Categoría{" "}
              <span className="font-semibold text-ink">
                {activeCategoryName}
              </span>
            </p>
          ) : (
            <p className="text-[15px] text-ink/60">
              Todos los recursos
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Contador real, nunca estimado. */}
          <span className="text-sm font-medium text-ink/60">
            {products.length}{" "}
            {products.length === 1 ? "recurso" : "recursos"}
          </span>

          {hasFilters && (
            <Link
              href="/tienda"
              className="rk-press inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-75"
            >
              <X size={14} />
              Limpiar filtros
            </Link>
          )}
        </div>
      </section>

      <div className="rk-divider mt-4" />

      {/* RESULTADOS */}
      {products.length > 0 ? (
        <div className="rk-fade-up rk-enter-1 mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
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
                creator: {
                  name:
                    product.creator.publicName ||
                    product.creator.name ||
                    "Creador",
                  username:
                    product.creator.creatorStatus === "APPROVED"
                      ? product.creator.username
                      : null,
                },
              }}
            />
          ))}
        </div>
      ) : (
        /* SIN RESULTADOS */
        <div className="rk-fade-up rk-card mt-6 px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-rk-md bg-accent/10 text-accent">
            <SearchX size={26} />
          </div>

          <h2 className="rk-title mt-5 text-xl">
            {hasFilters
              ? "Sin resultados"
              : "Todavía no hay recursos publicados"}
          </h2>

          <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-ink/60">
            {hasFilters
              ? "No encontramos recursos que coincidan con tu búsqueda."
              : "Vuelve pronto: los creadores están preparando sus recursos."}
          </p>

          {hasFilters && (
            <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
              <X size={15} />
              Limpiar filtros
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/** Skeleton mostrado mientras se resuelven los resultados. */
export function StoreResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando recursos">
      <div className="mt-6 flex items-baseline justify-between gap-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink/[0.06]" />
        <div className="h-4 w-20 animate-pulse rounded-full bg-ink/[0.06]" />
      </div>

      <div className="rk-divider mt-4" />

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="rk-card overflow-hidden !rounded-rk-md"
          >
            <div className="rk-aspect-product w-full animate-pulse bg-ink/[0.06]" />

            <div className="p-2.5 sm:p-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-ink/[0.06]" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-ink/[0.05]" />
              <div className="mt-3 h-4 w-16 animate-pulse rounded-full bg-ink/[0.07]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
