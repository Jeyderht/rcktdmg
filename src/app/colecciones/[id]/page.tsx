import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { SELECCION_TARJETA, aTarjeta } from "@/lib/catalogo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Vista pública de una colección.
 *
 * Solo existe si su dueño la marcó como pública. Una colección
 * privada devuelve 404, igual que una inexistente: desde fuera
 * no se distingue una cosa de la otra.
 */
async function obtenerColeccion(id: string) {
  return prisma.collection.findFirst({
    where: {
      id,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          publicName: true,
          username: true,
          creatorStatus: true,
        },
      },
      items: {
        where: { product: { status: "PUBLISHED" } },
        orderBy: { createdAt: "desc" },
        select: { product: { select: SELECCION_TARJETA } },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const coleccion = await obtenerColeccion(id);

  if (!coleccion) {
    return { title: "Colección no encontrada" };
  }

  return {
    title: coleccion.name,
    description: `Colección de recursos digitales en RCKTDMG.`,
  };
}

export default async function ColeccionPublicaPage({
  params,
}: PageProps) {
  const { id } = await params;

  const coleccion = await obtenerColeccion(id);

  if (!coleccion) {
    notFound();
  }

  const autor =
    coleccion.user.publicName || coleccion.user.name || "Creador";

  const perfilPublico =
    coleccion.user.username &&
    coleccion.user.creatorStatus === "APPROVED"
      ? `/creadores/${coleccion.user.username}`
      : null;

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
        <Link
          href="/tienda"
          className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
        >
          <ChevronLeft size={15} />
          Tienda
        </Link>

        <header className="rk-fade-up mt-4">
          <p className="rk-kicker">Colección</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl">
            {coleccion.name}
          </h1>

          <p className="mt-3 text-[15px] text-ink/60">
            {perfilPublico ? (
              <>
                Por{" "}
                <Link
                  href={perfilPublico}
                  className="font-medium underline underline-offset-4 hover:text-ink"
                >
                  {autor}
                </Link>
              </>
            ) : (
              <>Por {autor}</>
            )}

            {" · "}
            {coleccion.items.length}{" "}
            {coleccion.items.length === 1 ? "recurso" : "recursos"}
          </p>
        </header>

        <div className="rk-divider mt-8" />

        {coleccion.items.length === 0 ? (
          <p className="mt-8 text-sm text-ink/60">
            Esta colección todavía no tiene recursos publicados.
          </p>
        ) : (
          <div className="rk-fade-up mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {coleccion.items.map(({ product }) => (
              <ProductCard key={product.id} product={aTarjeta(product)} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
