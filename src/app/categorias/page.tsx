import type { Metadata } from "next";

import { paginaPublica } from "@/lib/seo";
import { LayoutGrid } from "lucide-react";

import CarpetasCategorias, {
  aCarpetas,
} from "@/components/categorias/CarpetasCategorias";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = paginaPublica({
  titulo: "Categorías",
  descripcion:
    "Explora los recursos digitales de RCKTDMG por categoría.",
  ruta: "/categorias",
});

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
        take: 3,
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
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full rk-halo-marca blur-[90px]"
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
          <CarpetasCategorias
            categorias={aCarpetas(withProducts)}
            className="rk-fade-up rk-enter-1 mt-10"
          />
        )}
      </main>

      <Footer />
    </>
  );
}
