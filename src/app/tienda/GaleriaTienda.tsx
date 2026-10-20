import Image from "next/image";
import Link from "next/link";

import FavoriteButton from "@/components/tienda/FavoriteButton";
import type { ProductCardData } from "@/components/tienda/ProductCard";

/**
 * Resultados de Explorar en modo galería.
 *
 * Solo las portadas (4/5), en una rejilla de 2 columnas en móvil,
 * 3 en tablet y 4 en escritorio, con el corazón de guardar arriba a
 * la derecha. Sin nombre, precio ni insignias: al tocar una se abre
 * la ficha del recurso, que es donde están el precio y la info.
 *
 * La paginación la sigue dando StoreResults.
 */
export default function GaleriaTienda({
  productos,
}: {
  productos: ProductCardData[];
}) {
  return (
    <ul className="rk-ex-rejilla" aria-label="Recursos">
      {productos.map((p) => {
        const imagen = p.coverUrl || p.image?.url || null;

        return (
          <li key={p.id} className="rk-ex-item">
            <Link
              href={`/tienda/${p.slug}`}
              className="rk-ex-tarjeta"
              aria-label={`${p.name}: ver precio e información`}
            >
              {imagen ? (
                <Image
                  src={imagen}
                  alt={p.image?.alt || p.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                />
              ) : (
                <span className="rk-galeria-vacio">RcktX</span>
              )}
            </Link>

            {/* Fuera del enlace: un botón no puede ir dentro de él. */}
            <span className="rk-ex-guardar">
              <FavoriteButton productId={p.id} size="sm" onImage />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
