import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import ColeccionCard from "@/components/ColeccionCard";
import type { ColeccionVista } from "@/lib/colecciones-comerciales-comun";

/**
 * Colecciones comerciales en la portada.
 *
 * Son las PUBLICADAS más recientes. No hay orden por
 * "popularidad": no existe ninguna métrica real de popularidad
 * de colecciones, y ordenar por una inventada sería decirle al
 * visitante algo que no sabemos.
 *
 * NO son las colecciones personales, que siguen apareciendo
 * en su propia sección dentro de SeccionesMarketplace.
 */
export default function SeccionColecciones({
  colecciones,
}: {
  colecciones: ColeccionVista[];
}) {
  if (colecciones.length === 0) return null;

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rk-kicker">Conjuntos</p>

            <h2 className="rk-title mt-3 text-[2rem] sm:text-4xl">
              Colecciones
            </h2>

            <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink/60">
              Varios recursos de una misma temática, con su licencia
              cada uno, por un precio único.
            </p>
          </div>

          <Link
            href="/colecciones-comerciales"
            className="rk-press group inline-flex items-center gap-2 text-sm font-semibold"
          >
            Ver todas
            <ArrowUpRight
              size={15}
              aria-hidden
              className="transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        <div className="rk-fade-up rk-enter-1 mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colecciones.map((coleccion) => (
            <ColeccionCard key={coleccion.id} coleccion={coleccion} />
          ))}
        </div>
      </div>
    </section>
  );
}
