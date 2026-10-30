"use client";

import { Check } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";

import {
  anadirAlCarrito,
  useEnCarrito,
} from "@/components/hooks/useCartCount";

/**
 * «Agregar» compacto de la tarjeta de recurso (catálogo del inicio).
 *
 * Usa el MISMO carrito que la ficha (anadirAlCarrito): una licencia
 * por recurso, así que si ya está en el carrito dice «En el carrito»
 * y no suma otra unidad. Sesión y
 * compras previas se resuelven en el carrito y en el pago, como con
 * el resto de botones.
 *
 * La tarjeta está rodeada de enlaces: el clic no navega
 * (preventDefault + stopPropagation).
 */
export default function AgregarTarjeta({
  product,
}: {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
    pieceType?: string | null;
    categorySlug?: string | null;
  };
}) {
  const [agregado, setAgregado] = useState(false);
  const enCarrito = useEnCarrito(product.id);

  useEffect(() => {
    if (!agregado) return;

    const reloj = setTimeout(() => setAgregado(false), 2000);

    return () => clearTimeout(reloj);
  }, [agregado]);

  function agregar(evento: MouseEvent<HTMLButtonElement>) {
    evento.preventDefault();
    evento.stopPropagation();

    const cambio = anadirAlCarrito({
      id: product.id,
      name: product.name,
      price: product.price,
      slug: product.slug,
      coverUrl: product.coverUrl,
      pieceType: product.pieceType ?? null,
      categorySlug: product.categorySlug ?? null,
    });

    if (cambio) setAgregado(true);
  }

  if (enCarrito && !agregado) {
    return (
      <span
        aria-label={`${product.name}: ya está en el carrito`}
        className="rk-btn rk-btn-ink rk-btn-compact rkp-agregar"
      >
        <Check size={13} aria-hidden />
        En el carrito
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={agregar}
      aria-label={agregado ? `${product.name}: agregado al carrito` : `Agregar ${product.name} al carrito`}
      className="rk-btn rk-btn-ink rk-btn-compact rkp-agregar"
    >
      {agregado ? (
        <>
          <Check size={13} aria-hidden />
          Agregado
        </>
      ) : (
        "Agregar"
      )}
    </button>
  );
}
