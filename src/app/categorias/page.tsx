import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, LayoutGrid } from "lucide-react";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explora los recursos digitales de RCKTDMG por categoría.",
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,

      _count: {
        select: {
          products: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },

      products: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          coverUrl: true,

          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
            select: {
              url: true,
            },
          },
        },
      },
    },
  });

  const withProducts = categories.filter(
    (category) => category._count.products > 0
  );

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-5 lg:px-8 lg:pb-24 lg:pt-12">

        {/* ENCABEZADO */}
        <section className="rk-enter">
          <div className="rk-glass rounded-[2rem] px-5 py-8 sm:rounded-[2.5rem] sm:px-9 sm:py-10">
            <p className="rk-eyebrow">RCKTDMG</p>

            <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Categorías
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/50">
              Explora los recursos agrupados por categoría.
            </p>
          </div>
        </section>

        {/* CATEGORÍAS */}
        {withProducts.length === 0 ? (
          <div className="rk-enter rk-enter-1 rk-card mt-5 px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-ink/[0.05]">
              <LayoutGrid size={24} className="text-ink/35" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Todavía no hay categorías con recursos
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/45">
              En cuanto se publiquen recursos aparecerán aquí
              agrupados por categoría.
            </p>

            <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div className="rk-enter rk-enter-1 mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withProducts.map((category) => {
              const preview =
                category.products[0]?.coverUrl ||
                category.products[0]?.images[0]?.url ||
                null;

              return (
                <Link
                  key={category.id}
                  href={`/tienda?categoria=${category.slug}`}
                  className="rk-card rk-card-hover rk-press group relative overflow-hidden"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-t-[1.5rem] bg-gradient-to-br from-ink/[0.04] to-ink/[0.08]">
                    {preview ? (
                      <img
                        src={preview}
                        alt={category.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-rk group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-ink/20">
                          RCKTDMG
                        </span>
                      </div>
                    )}

                    {/* Contador flotante sobre la imagen */}
                    <span className="rk-glass-strong absolute right-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-rk-sm">
                      {category._count.products}{" "}
                      {category._count.products === 1
                        ? "recurso"
                        : "recursos"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-semibold tracking-tight">
                        {category.name}
                      </h2>

                      {category.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink/45">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/50 transition-all duration-300 ease-rk group-hover:bg-primary group-hover:text-onprimary">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
