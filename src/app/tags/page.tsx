import Link from "next/link";
import type { Metadata } from "next";

import { paginaPublica } from "@/lib/seo";
import { Tag as TagIcon } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { esTagProtegido } from "@/lib/tags-comun";

export const metadata: Metadata = paginaPublica({
  titulo: "Etiquetas",
  descripcion:
    "Explora los recursos de RCKTDMG por etiqueta: temática, herramienta, formato y estilo.",
  ruta: "/tags",
});

export const dynamic = "force-dynamic";

/**
 * Listado público de etiquetas.
 *
 * Solo aparecen las que llevan a recursos publicados: una
 * etiqueta que lleva a una lista vacía no ayuda a nadie y,
 * de cara al buscador, sería una página sin contenido real.
 *
 * El tamaño del texto crece con el número de recursos, así
 * que la jerarquía que se ve es un dato, no una decoración.
 */
export default async function TagsPage() {
  const etiquetas = await prisma.tag.findMany({
    where: { products: { some: { product: { status: "PUBLISHED" } } } },
    orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          products: { where: { product: { status: "PUBLISHED" } } },
        },
      },
    },
  });

  // `pack` es estructural: tiene su propio filtro en la tienda.
  const visibles = etiquetas.filter(
    (etiqueta) => !esTagProtegido(etiqueta.slug)
  );

  const maximo = visibles[0]?._count.products ?? 1;

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-10">
        <section className="rk-fade-up">
          <p className="rk-kicker">Explorar</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl lg:text-5xl">
            Etiquetas
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Temáticas, herramientas y estilos con los que los
            creadores describen sus recursos.
          </p>
        </section>

        <div className="rk-divider mt-7" />

        {visibles.length > 0 ? (
          <ul className="rk-fade-up rk-enter-1 mt-7 flex flex-wrap gap-2.5">
            {visibles.map((etiqueta) => {
              const peso = etiqueta._count.products / maximo;

              return (
                <li key={etiqueta.id}>
                  <Link
                    href={`/tienda?tag=${encodeURIComponent(etiqueta.slug)}`}
                    className={`rk-press-sm inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-line/15 px-4 transition-colors duration-fast ease-rk hover:border-ink/40 hover:bg-ink/[0.04] ${
                      peso > 0.6
                        ? "text-base font-semibold"
                        : peso > 0.3
                          ? "text-[15px] font-medium"
                          : "text-sm"
                    }`}
                  >
                    <TagIcon
                      size={14}
                      aria-hidden
                      className="shrink-0 text-ink/40"
                    />

                    {etiqueta.name}

                    <span className="text-[11px] tabular-nums text-ink/45">
                      {etiqueta._count.products}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-7">
            <EmptyState
              icon={TagIcon}
              title="Todavía no hay etiquetas"
              description="Cuando los creadores etiqueten sus recursos, aparecerán aquí."
              action={{ href: "/tienda", label: "Ver recursos" }}
            />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
