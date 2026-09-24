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
    <article className="group">
      <Link
        href={`/packs/${pack.slug}`}
        className="rk-frame rk-aspect-product block w-full overflow-hidden rounded-rk-md"
      >
        {portada && (
          <Image
            src={portada}
            alt={pack.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}

        {/* DISTINTIVO: cuántos recursos incluye. */}
        <span className="rk-glass-on-image absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
          <Layers size={11} aria-hidden />
          {pack.productos.length}{" "}
          {pack.productos.length === 1 ? "recurso" : "recursos"}
        </span>

        {/* AHORRO: solo si es real. */}
        {pack.ahorro && (
          <span className="rk-glass-on-image absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums">
            −{pack.ahorro.porcentaje}%
          </span>
        )}
      </Link>

      <div className="px-0.5 pt-2.5">
        <Link href={`/packs/${pack.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.1rem] text-[13px] font-semibold leading-[1.05rem] tracking-tight transition-opacity group-hover:opacity-60">
            {pack.name}
          </h3>
        </Link>

        <p className="mt-1 truncate text-[11px] text-ink/45">
          {pack.creador.username ? (
            <Link
              href={`/creadores/${pack.creador.username}`}
              className="transition-colors hover:text-ink"
            >
              {pack.creador.nombre}
            </Link>
          ) : (
            pack.creador.nombre
          )}
        </p>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <p className="text-[14px] font-semibold tabular-nums tracking-tight">
            {formatPrice(pack.price)}
          </p>

          {/* Referencia tachada: solo si de verdad se ahorra. */}
          {pack.ahorro && (
            <p className="text-[11px] text-ink/45 line-through tabular-nums">
              {formatPrice(pack.sumaIndividual)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
