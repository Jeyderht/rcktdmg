import Link from "next/link";

import ProductCard from "@/components/ProductCard";
import { paraUsuario } from "@/lib/recomendaciones";
import { getSession } from "@/lib/session";

/**
 * Bloque de recomendaciones de la home.
 *
 * El título depende de si hay historial real: con compras o
 * favoritos dice "Recomendado para ti"; sin ellos dice lo que
 * de verdad está mostrando —lo mejor valorado y más
 * guardado—, en lugar de fingir una personalización que no
 * existe.
 *
 * Si no hay recursos que mostrar, no se pinta nada.
 */
export default async function Recomendados() {
  const session = await getSession();

  const bloque = await paraUsuario(session?.userId ?? null, 5);

  if (!bloque) return null;

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="rk-kicker">Para ti</p>

            <h2 className="rk-title mt-2.5 text-2xl sm:text-3xl">
              {bloque.titulo}
            </h2>

            {bloque.subtitulo && (
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-ink/60">
                {bloque.subtitulo}
              </p>
            )}
          </div>

          <Link
            href="/tienda"
            className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Ver todo
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {bloque.productos.map((producto) => (
            <ProductCard key={producto.id} product={producto} />
          ))}
        </div>
      </div>
    </section>
  );
}
