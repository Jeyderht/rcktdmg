"use client";

import { useEffect, useState } from "react";

type StoredCartItem = {
  id?: string;
  quantity?: number;
};

export const CART_STORAGE_KEY = "rcktdmg_cart";
export const CART_UPDATED_EVENT = "rcktdmg-cart-updated";

/** Un artículo tal y como se guarda en `rcktdmg_cart`. */
export type ArticuloCarrito = {
  id: string;
  /**
   * Qué es. Ausente en los elementos guardados antes de que
   * existieran packs y colecciones: aquellos son recursos
   * sueltos y se siguen tratando así.
   */
  kind?: "PRODUCT" | "PACK" | "COLLECTION";
  name: string;
  price: number;
  slug: string;
  coverUrl: string | null;
};

/**
 * Añade un artículo al carrito de siempre.
 *
 * Vive aquí, junto a la clave y al evento, porque este módulo
 * ya era el dueño del carrito. La lógica estaba copiada en
 * cinco sitios —la ficha, los packs, las colecciones, el slice
 * de corporativos y las stories—, y cada copia era una ocasión
 * de que una se desviara de las demás.
 *
 * Respeta el comportamiento que ya tenía cada tipo:
 *
 *   · Un RECURSO suelto repetido suma cantidad, como hace el
 *     botón de la ficha desde siempre.
 *   · Un PACK o una COLECCIÓN repetidos no hacen nada: volver
 *     a comprarlos no da nada nuevo, porque las licencias son
 *     por recurso.
 *
 * Devuelve true si el carrito cambió.
 */
export function anadirAlCarrito(articulo: ArticuloCarrito): boolean {
  try {
    const guardado = localStorage.getItem(CART_STORAGE_KEY);

    const leido = guardado ? JSON.parse(guardado) : [];

    const lista: (ArticuloCarrito & { quantity: number })[] =
      Array.isArray(leido) ? leido : [];

    const esConjunto =
      articulo.kind === "PACK" || articulo.kind === "COLLECTION";

    const existente = lista.find((item) =>
      esConjunto
        ? item.id === articulo.id && item.kind === articulo.kind
        : // Un recurso suelto no lleva `kind`, o lleva "PRODUCT".
          item.id === articulo.id &&
          item.kind !== "PACK" &&
          item.kind !== "COLLECTION"
    );

    if (existente) {
      if (esConjunto) return false;

      existente.quantity += 1;
    } else {
      lista.push({ ...articulo, quantity: 1 });
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lista));

    window.dispatchEvent(new Event(CART_UPDATED_EVENT));

    return true;
  } catch (error) {
    // Si el navegador bloquea localStorage no se rompe nada.
    console.error("No se pudo actualizar el carrito:", error);

    return false;
  }
}

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
