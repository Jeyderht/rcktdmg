import Image from "next/image";

import {
  proporcionDeRecurso,
  type TipoPieza,
} from "@/lib/tipos-publicacion";
import Link from "next/link";

import FavoriteButton from "@/components/FavoriteButton";
import { getPriceDisplay, formatPrice } from "@/lib/pricing";
import Estrellas from "@/components/Estrellas";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  /**
   * Precio anterior real. Hoy la base de datos no lo tiene,
   * así que llega undefined y no se muestra promoción.
   */
  compareAtPrice?: number | null;
  coverUrl: string | null;
  image?: { url: string; alt?: string | null } | null;
  /** El slug es opcional: la tarjeta solo pinta el nombre. */
  category?: { name: string; slug?: string } | null;
  /**
   * Pieza declarada, cuando la hay. Junto a la categoría
   * decide con qué proporción se enseña la tarjeta: una story
   * es 9:16 y el resto del catálogo 4:5.
   */
  pieceType?: TipoPieza | null;
  /** Autor real del recurso. Opcional: solo se pinta si llega. */
  creator?: { name: string; username: string | null } | null;
  /** Formato real del archivo. Solo se pinta si existe. */
  fileFormat?: string | null;
  /** true cuando el recurso lleva la etiqueta "pack". */
  esPack?: boolean;
  /** Media de las reseñas publicadas. null si no tiene. */
  avgRating?: number | null;
  reviewCount?: number;
};

/**
 * Tarjeta de recurso compartida por la home, la tienda, las
 * categorías y los perfiles de creador.
 *
 * La imagen manda: ocupa la tarjeta entera en 9:16 y el texto
 * vive debajo, sin marco ni sombra que compitan con ella. Todo
 * lo que flota encima de la imagen es vidrio; la imagen en sí
 * permanece SIEMPRE nítida y con `object-cover`, sin
 * deformarse.
 *
 * La tarjeta es compacta a propósito: prioriza ver muchos
 * recursos a la vez sobre el tamaño de cada uno.
 */
export default function ProductCard({
  product,
  showFavorite = true,
}: {
  product: ProductCardData;
  showFavorite?: boolean;
}) {
  // Si el recurso no tiene portada, se usa la primera
  // imagen de la galería.
  const image = product.coverUrl || product.image?.url || null;
  const imageAlt = product.image?.alt || product.name;

  const pricing = getPriceDisplay(
    product.price,
    product.compareAtPrice
  );

  /*
    El envoltorio existe solo para la lengüeta luminosa: la
    dibuja su ::before y queda POR DETRÁS de la tarjeta. No
    recorta nada, porque un overflow oculto aquí se la comería.
  */
  return (
    <div className="rx-pestana rx-pestana-bloque">
      <article className="rk-tarjeta group relative">

      {/* CONTENIDO VISUAL 9:16 */}
      <Link
        href={`/tienda/${product.slug}`}
        className="relative block"
        aria-label={product.name}
      >
        {/*
          EL MARCO LO DECIDE EL RECURSO, no una proporción
          fija. Antes todas las tarjetas eran 9:16, así que una
          pieza 4:5 —hoy, casi todas— perdía por recorte la
          quinta parte de su alto. Social Media y los recursos
          sin tipo declarado conservan el 4:5 como marco por
          defecto: es el del catálogo, y recortar un poco es
          mejor que estirar.
        */}
        <div
          /*
            `rk-card-glow` lleva el resplandor y la elevación;
            `overflow-hidden` es lo que impide que el
            acercamiento de la imagen se salga del marco y
            rompa la proporción que acaba de fijarse.
          */
          className="rk-frame w-full overflow-hidden"
          style={{
            aspectRatio:
              proporcionDeRecurso(
                product.category?.slug,
                product.pieceType
              ) ?? "1080 / 1350",
          }}
        >
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              /*
                `cover` recorta lo que sobre, nunca estira. Con
                el marco ya ajustado al recurso, en la mayoría
                de los casos no sobra nada.
              */
              className="rk-card-zoom object-cover"
              sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, (max-width: 1280px) 22vw, 15vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[9px] uppercase tracking-[0.3em] text-ink/30">
                RCKTDMG
              </span>
            </div>
          )}

          {/* CATEGORÍA: vidrio sobre la imagen, imagen nítida */}
          {product.category && (
            <span className="rk-glass-on-image pointer-events-none absolute left-2 top-2 max-w-[calc(100%-3.25rem)] truncate rounded-full px-2.5 py-1 text-[10px] font-medium">
              {product.category.name}
            </span>
          )}

          {/* PACK: distintivo en blanco y negro, solo si lo es. */}
          {product.esPack && (
            <span className="rk-glass-on-image pointer-events-none absolute bottom-2 left-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em]">
              Pack
            </span>
          )}

          {/* DESCUENTO REAL: solo si existe promoción */}
          {pricing.hasPromotion && (
            <span className="rk-glass-on-image pointer-events-none absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-bold text-danger">
              {pricing.discountPercent}% OFF
            </span>
          )}
        </div>
      </Link>

      {/* FAVORITO: control de vidrio flotante */}
      {showFavorite && (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton productId={product.id} onImage size="xs" />
        </div>
      )}

      {/* INFORMACIÓN */}
      <div className="px-1 pb-0.5 pt-2.5">
        <Link href={`/tienda/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.1rem] text-[13px] font-semibold leading-[1.05rem] tracking-tight transition-opacity group-hover:opacity-60">
            {product.name}
          </h3>
        </Link>

        {/* CREADOR: solo si se pasa el dato real. */}
        {product.creator && (
          <p className="mt-1 truncate text-[11px] text-ink/45">
            {product.creator.username ? (
              <Link
                href={`/creadores/${product.creator.username}`}
                className="transition-colors hover:text-ink"
              >
                {product.creator.name}
              </Link>
            ) : (
              product.creator.name
            )}
          </p>
        )}

        {/*
          VALORACIÓN
          Sin reseñas no se pinta nada: cinco estrellas vacías
          se leen como "valorado mal", no como "sin valorar".
        */}
        {product.avgRating != null && (product.reviewCount ?? 0) > 0 && (
          <p className="mt-1 flex items-center gap-1">
            <Estrellas valor={product.avgRating} tamano={11} />

            <span className="text-[10px] tabular-nums text-ink/45">
              ({product.reviewCount})
            </span>
          </p>
        )}

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <p className="text-[14px] font-semibold tabular-nums tracking-tight">
            {formatPrice(pricing.price)}
          </p>

          {pricing.compareAtPrice !== null && (
            <p className="text-[11px] text-ink/45 line-through">
              {formatPrice(pricing.compareAtPrice)}
            </p>
          )}

          {/* Formato real del archivo, nunca supuesto. */}
          {product.fileFormat && (
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink/40">
              {product.fileFormat}
            </span>
          )}
        </div>
      </div>
    </article>
    </div>
  );
}
