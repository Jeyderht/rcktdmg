import Image from "next/image";
import Link from "next/link";
import { Layers } from "lucide-react";

import { formatPrice } from "@/lib/pricing";
import type { PackVista } from "@/lib/packs-comun";

/**
 * Tarjeta de pack.
 *
 * Misma gramática visual que ProductCard: la imagen manda, el
 * texto vive debajo y lo que flota encima es vidrio. La
 * portada nunca se deforma ni se desenfoca.
 *
 * Si el pack no tiene portada propia se usa la del primer
 * recurso incluido, que es una imagen real del contenido. Si
 * tampoco la hay, queda el marco vacío: no se inventa nada.
 */
export default function PackCard({ pack }: { pack: PackVista }) {
  const portada =
    pack.coverUrl ??
    pack.productos[0]?.image?.url ??
    pack.productos[0]?.coverUrl ??
    null;

  return (
    <div className="rx-pestana rx-pestana-bloque">
      <article className="rk-tarjeta group relative">
        <Link
          href={`/packs/${pack.slug}`}
          className="relative block"
          aria-label={pack.name}
        >
          <div className="rk-frame rk-aspect-product w-full overflow-hidden">
            {portada && (
              <Image
                src={portada}
                alt={pack.name}
                fill
                className="rk-card-zoom object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            )}

            {/* DISTINTIVO: cuántos recursos incluye. */}
            <span className="rk-glass-on-image pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
              <Layers size={11} aria-hidden />
              {pack.productos.length}{" "}
              {pack.productos.length === 1 ? "recurso" : "recursos"}
            </span>

            {/* AHORRO: solo si es real. */}
            {pack.ahorro && (
              <span className="rk-glass-on-image pointer-events-none absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums text-danger">
                −{pack.ahorro.porcentaje}%
              </span>
            )}
          </div>
        </Link>

        <div className="px-2 pb-1.5 pt-3">
          <Link href={`/packs/${pack.slug}`}>
            <h3 className="rk-tarjeta-nombre">{pack.name}</h3>
          </Link>

          <p className="rk-card-meta">
            <span className="rk-card-avatar">
              {pack.creador.nombre.charAt(0).toUpperCase()}
            </span>
            {pack.creador.username ? (
              <Link
                href={`/creadores/${pack.creador.username}`}
                className="truncate hover:text-ink"
              >
                {pack.creador.nombre}
              </Link>
            ) : (
              <span>{pack.creador.nombre}</span>
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <p className="rk-tarjeta-precio">
              {formatPrice(pack.price)}
            </p>

            {/* Referencia tachada: solo si de verdad se ahorra. */}
            {pack.ahorro && (
              <p className="text-[11px] text-ink/45 line-through tabular-nums">
                {formatPrice(pack.sumaIndividual)}
              </p>
            )}

            <span className="rk-tarjeta-formato">Pack</span>
          </div>
        </div>
      </article>
    </div>
  );
}
