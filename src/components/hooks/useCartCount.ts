"use client";

import { useEffect, useState } from "react";

type StoredCartItem = {
  id?: string;
  kind?: string;
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
  /**
   * Pieza del recurso, cuando se sabe. Decide con qué marco se
   * pinta la miniatura en el carrito y en el pago.
   *
   * Opcional a propósito: los carritos guardados en el
   * navegador antes de que esto existiera no la traen, y esos
   * caen al marco del catálogo sin romperse.
   */
  pieceType?: string | null;
  /** Categoría del recurso: con la pieza decide su marco. */
  categorySlug?: string | null;
};

/** ¿`item` es el mismo artículo que (`id`, `kind`)? */
function esElMismo(item: StoredCartItem, id: string, kind?: ArticuloCarrito["kind"]) {
  const esConjunto = kind === "PACK" || kind === "COLLECTION";

  return esConjunto
    ? item.id === id && item.kind === kind
    : // Un recurso suelto no lleva `kind`, o lleva "PRODUCT".
      item.id === id && item.kind !== "PACK" && item.kind !== "COLLECTION";
}

/**
 * El carrito guardado, con UNA unidad por artículo.
 *
 * Cada recurso se vende una sola vez por compra (una licencia):
 * si el navegador trae una cantidad mayor de antes, se normaliza a
 * 1 y se reescribe, para que el carrito, el contador y el pago
 * vean lo mismo.
 */
export function leerCarrito<T extends StoredCartItem>(): T[] {
  try {
    const guardado = localStorage.getItem(CART_STORAGE_KEY);
    const leido = guardado ? JSON.parse(guardado) : [];
    const lista: T[] = Array.isArray(leido) ? leido : [];

    if (lista.some((item) => item?.quantity !== 1)) {
      const normalizada = lista.map((item) => ({ ...item, quantity: 1 }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizada));
      return normalizada;
    }

    return lista;
  } catch {
    return [];
  }
}

/** ¿Está ya este artículo en el carrito? */
export function estaEnCarrito(id: string, kind?: ArticuloCarrito["kind"]): boolean {
  return leerCarrito().some((item) => esElMismo(item, id, kind));
}

/**
 * Si el artículo está en el carrito, y al día con el evento
 * `rcktdmg-cart-updated` y con otras pestañas (`storage`).
 */
export function useEnCarrito(id: string, kind?: ArticuloCarrito["kind"]): boolean {
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    function sync() {
      setDentro(estaEnCarrito(id, kind));
    }

    sync();

    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id, kind]);

  return dentro;
}

/**
 * Añade un artículo al carrito de siempre.
 *
 * Vive aquí, junto a la clave y al evento, porque este módulo
 * ya era el dueño del carrito. La lógica estaba copiada en
 * cinco sitios —la ficha, los packs, las colecciones, el slice
 * de corporativos y las stories—, y cada copia era una ocasión
 * de que una se desviara de las demás.
 *
 * Cada artículo va UNA vez: un recurso, un pack o una colección
 * que ya está en el carrito no se vuelve a sumar (las licencias
 * son por recurso y comprarlo dos veces no da nada nuevo).
 *
 * Devuelve true si el carrito cambió.
 */
export function anadirAlCarrito(articulo: ArticuloCarrito): boolean {
  try {
    const lista = leerCarrito<ArticuloCarrito & { quantity: number }>();

    if (lista.some((item) => esElMismo(item, articulo.id, articulo.kind))) {
      return false;
    }

    lista.push({ ...articulo, quantity: 1 });

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

  // Una unidad por artículo: el número es el de artículos.
  return leerCarrito().length;
}

/**
 * Número de artículos en el carrito local (`rcktdmg_cart`).
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
