"use client";

import { useEffect, useState } from "react";

type StoredCartItem = {
  id?: string;
  quantity?: number;
};

export const CART_STORAGE_KEY = "rcktdmg_cart";
export const CART_UPDATED_EVENT = "rcktdmg-cart-updated";

function readCartCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);

    if (!stored) {
      return 0;
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return 0;
    }

    return parsed.reduce((total: number, item: StoredCartItem) => {
      const quantity = Number(item?.quantity);

      return total + (Number.isFinite(quantity) && quantity > 0
        ? quantity
        : 1);
    }, 0);
  } catch {
    return 0;
  }
}

/**
 * Número de unidades en el carrito local (`rcktdmg_cart`).
 *
 * Se mantiene sincronizado con el evento `rcktdmg-cart-updated`
 * que disparan los botones de carrito, y con `storage` para
 * reflejar cambios hechos en otra pestaña.
 */
export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function sync() {
      setCount(readCartCount());
    }

    sync();

    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return count;
}
