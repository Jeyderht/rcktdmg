import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Library } from "lucide-react";

import { formatPrice } from "@/lib/pricing";
import type { ColeccionVista } from "@/lib/colecciones-comerciales-comun";

/**
 * Tarjeta de colección comercial.
 *
 * Más ancha que la de pack a propósito: una colección se vende
 * por lo que reúne, así que la tarjeta enseña el desglose
 * —valor individual, precio y ahorro— en lugar de un precio
 * suelto. Todas las cifras salen de la base; el ahorro solo se
 * pinta cuando existe de verdad.
 */
export default function ColeccionCard({
  coleccion,
}: {
  coleccion: ColeccionVista;
}) {
  // La portada la sube el creador; no se deduce del contenido.
  const portada = coleccion.coverUrl;

  const ruta = `/colecciones-comerciales/${coleccion.slug}`;

  // Hasta tres miniaturas del contenido, si las hay.
  const miniaturas = coleccion.productos
    .slice(0, 3)
    .map((p) => p.image?.url ?? p.coverUrl)
    .filter((url): url is string => Boolean(url));

  return (
    <article className="group rk-tile overflow-hidden rounded-rk-lg">
      <Link
        href={ruta}
        className="rk-frame block aspect-[16/10] w-full overflow-hidden"
      >
        {portada && (
          <Image
            src={portada}
            alt={coleccion.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}

        <span className="rk-glass-on-image absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
          <Library size={11} aria-hidden />
          {coleccion.productos.length} recursos
        </span>

        {coleccion.ahorro && (
          <span className="rk-glass-on-image absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums">
            −{coleccion.ahorro.porcentaje}%
          </span>
        )}
      </Link>

      <div className="p-4">
        <Link href={ruta}>
          <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight transition-opacity group-hover:opacity-60">
            {coleccion.name}
          </h3>
        </Link>

        <p className="mt-1 flex min-w-0 items-center gap-1 text-[13px] text-ink/55">
          <span className="truncate">{coleccion.creador.nombre}</span>

          {coleccion.creador.isVerified && (
            <BadgeCheck
              size={12}
              aria-label="Creador verificado"
              className="shrink-0"
            />
          )}
        </p>

        {/* Miniaturas del contenido: el mejor argumento es verlo. */}
        {miniaturas.length > 0 && (
          <div aria-hidden className="mt-3 flex gap-1.5">
            {miniaturas.map((url) => (
              <span
                key={url}
                className="rk-frame relative block h-10 w-10 shrink-0 overflow-hidden rounded-rk-sm"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </span>
            ))}

            {coleccion.productos.length > miniaturas.length && (
              <span className="flex h-10 items-center px-1.5 text-[11px] tabular-nums text-ink/50">
                +{coleccion.productos.length - miniaturas.length}
              </span>
            )}
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-lg font-semibold tabular-nums tracking-tight">
            {formatPrice(coleccion.price)}
          </p>

          {coleccion.ahorro && (
            <p className="text-[13px] tabular-nums text-ink/45 line-through">
              {formatPrice(coleccion.sumaIndividual)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
