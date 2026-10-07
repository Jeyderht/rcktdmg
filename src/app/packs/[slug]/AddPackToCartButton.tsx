"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";
import { IconoBolsaCompra } from "@/components/iconos";

/**
 * Añade un pack al carrito.
 *
 * El carrito vive en localStorage y hasta ahora solo guardaba
 * recursos sueltos. Un pack se distingue por `kind: "PACK"`;
 * los elementos ya guardados no lo llevan y se siguen tratando
 * como recursos, así que ningún carrito existente se rompe.
 *
 * Un pack no tiene cantidad: comprar dos veces el mismo pack
 * no da nada nuevo, porque las licencias son por recurso.
 */
export default function AddPackToCartButton({
  pack,
}: {
  pack: {
    id: string;
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
  };
}) {
  const [anadido, setAnadido] = useState(false);

  function anadir() {
    try {
      const guardado = localStorage.getItem(CART_STORAGE_KEY);

      const carrito = guardado ? JSON.parse(guardado) : [];

      const lista = Array.isArray(carrito) ? carrito : [];

      const yaEsta = lista.some(
        (item: { id: string; kind?: string }) =>
          item.id === pack.id && item.kind === "PACK"
      );

      if (!yaEsta) {
        lista.push({
          id: pack.id,
          kind: "PACK",
          name: pack.name,
          price: pack.price,
          slug: pack.slug,
          coverUrl: pack.coverUrl,
          quantity: 1,
        });

        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(lista)
        );

        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
      }

      setAnadido(true);

      setTimeout(() => setAnadido(false), 2400);
    } catch {
      // Almacenamiento bloqueado: no se puede añadir.
    }
  }

  return (
    <button
      type="button"
      onClick={anadir}
      className="rk-btn rk-btn-ink w-full sm:w-auto"
    >
      {anadido ? (
        <>
          <Check size={16} aria-hidden />
          Añadido al carrito
        </>
      ) : (
        <>
          <IconoBolsaCompra size={16} aria-hidden />
          Añadir el pack al carrito
        </>
      )}
    </button>
  );
}
