"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
    /** Pieza del recurso: decide el marco de su miniatura. */
    pieceType?: string | null;
  };
};

export default function AddToCartButton({ product }: Props) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;

    const timer = setTimeout(() => setAdded(false), 2000);

    return () => clearTimeout(timer);
  }, [added]);

  function addToCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);

      const cart = stored ? JSON.parse(stored) : [];

      const list = Array.isArray(cart) ? cart : [];

      const existing = list.find(
        (item: { id: string }) => item.id === product.id
      );

      if (existing) {
        existing.quantity += 1;
      } else {
        list.push({
          id: product.id,
          name: product.name,
          price: product.price,
          slug: product.slug,
          coverUrl: product.coverUrl,
          pieceType: product.pieceType ?? null,
          quantity: 1,
        });
      }

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(list));

      window.dispatchEvent(new Event(CART_UPDATED_EVENT));

      setAdded(true);
    } catch (error) {
      console.error("No se pudo actualizar el carrito:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      className={`rk-btn w-full !py-3.5 ${
        added
          ? "bg-success text-white shadow-rk"
          : "rk-btn-primary"
      }`}
    >
      {added ? (
        <>
          <Check size={17} />
          Agregado al carrito
        </>
      ) : (
        <>
          <ShoppingBag size={17} />
          Agregar al carrito
        </>
      )}
    </button>
  );
}
