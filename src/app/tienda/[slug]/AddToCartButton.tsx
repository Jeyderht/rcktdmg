"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import {
  anadirAlCarrito,
  useEnCarrito,
} from "@/components/hooks/useCartCount";
import { IconoBolsaCompra } from "@/components/iconos";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
    /** Pieza del recurso: decide el marco de su miniatura. */
    pieceType?: string | null;
    /** Categoría del recurso: con la pieza decide su marco. */
    categorySlug?: string | null;
  };
};

/**
 * «Agregar al carrito» de la ficha.
 *
 * Una licencia por recurso: usa anadirAlCarrito, que no suma otra
 * unidad si ya está. Si ya está en el carrito, el botón dice «En el
 * carrito» y lleva a él.
 */
export default function AddToCartButton({ product }: Props) {
  const [added, setAdded] = useState(false);
  const enCarrito = useEnCarrito(product.id);

  useEffect(() => {
    if (!added) return;

    const timer = setTimeout(() => setAdded(false), 2000);

    return () => clearTimeout(timer);
  }, [added]);

  function addToCart() {
    const cambio = anadirAlCarrito({
      id: product.id,
      name: product.name,
      price: product.price,
      slug: product.slug,
      coverUrl: product.coverUrl,
      pieceType: product.pieceType ?? null,
      categorySlug: product.categorySlug ?? null,
    });

    if (cambio) setAdded(true);
  }

  if (added) {
    return (
      <button type="button" className="rk-btn rk-btn-added w-full">
        <Check size={17} />
        Agregado al carrito
      </button>
    );
  }

  if (enCarrito) {
    return (
      <Link href="/carrito" className="rk-btn rk-btn-added w-full">
        <Check size={17} />
        En el carrito
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      className="rk-btn rk-btn-primary rk-btn-cta w-full"
    >
      <IconoBolsaCompra size={17} />
      Agregar al carrito
    </button>
  );
}
