/**
 * Precio mostrado de un recurso.
 *
 * Hoy `Product` solo tiene `price` en la base de datos, así
 * que NUNCA se muestra un precio anterior ni un descuento:
 * inventarlos sería mentirle al cliente.
 *
 * La interfaz ya está preparada para promociones reales.
 * Cuando exista un campo de precio anterior en Prisma (por
 * ejemplo `compareAtPrice Decimal?`), basta con pasarlo en
 * `compareAtPrice` y el resto de la interfaz ya lo soporta:
 * tachado, precio actual destacado y porcentaje de descuento.
 */

export type PriceDisplay = {
  /** Precio que paga el cliente. */
  price: number;
  /** Precio anterior tachado, solo si hay promoción real. */
  compareAtPrice: number | null;
  /** Porcentaje entero de descuento, solo si hay promoción. */
  discountPercent: number | null;
  hasPromotion: boolean;
};

export function getPriceDisplay(
  price: number | string,
  compareAtPrice?: number | string | null
): PriceDisplay {
  const current = Number(price);

  const previous =
    compareAtPrice === undefined || compareAtPrice === null
      ? null
      : Number(compareAtPrice);

  // Solo hay promoción si el precio anterior es mayor y
  // ambos valores son números válidos.
  const hasPromotion =
    previous !== null &&
    Number.isFinite(previous) &&
    Number.isFinite(current) &&
    previous > current;

  return {
    price: current,
    compareAtPrice: hasPromotion ? previous : null,
    discountPercent: hasPromotion
      ? Math.round(((previous - current) / previous) * 100)
      : null,
    hasPromotion,
  };
}

export function formatPrice(value: number) {
  return `S/ ${value.toFixed(2)}`;
}
