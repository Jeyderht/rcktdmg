import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, LayoutGrid } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
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
        <section className="rk-fade-up relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-ink/[0.05] blur-[90px]"
          />

          <p className="rk-eyebrow">RCKTDMG</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl lg:text-5xl">
            Categorías
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Explora los recursos agrupados por categoría.
          </p>
        </section>

        {/* CATEGORÍAS */}
        {withProducts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={LayoutGrid}
              title="Todavía no hay categorías con recursos"
              description="En cuanto se publiquen recursos aparecerán aquí agrupados por categoría."
              action={{ href: "/tienda", label: "Ir a la tienda" }}
            />
          </div>
        ) : (
          <div className="rk-fade-up rk-enter-1 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="flex items-center gap-4 p-3.5">
                    {/* Portada real del recurso más reciente,
                        en 9:16 y siempre nítida. */}
                    <div className="rk-media rk-aspect-product relative w-16 shrink-0 overflow-hidden rounded-rk-sm">
                      {preview ? (
                        <Image
                          src={preview}
                          alt={category.name}
                          fill
                          className="object-cover transition-transform duration-slow ease-rk group-hover:scale-[1.04]"
                          sizes="64px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.2em] text-ink/45">
                          RK
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-semibold tracking-tight">
                        {category.name}
                      </h2>

                      {category.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/60">
                          {category.description}
                        </p>
                      )}

                      {/* Contador real de recursos publicados. */}
                      <p className="mt-1.5 text-xs text-ink/60">
                        {category._count.products}{" "}
                        {category._count.products === 1
                          ? "recurso"
                          : "recursos"}
                      </p>
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 transition-colors duration-normal ease-rk group-hover:bg-ink/[0.07] group-hover:text-ink">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
