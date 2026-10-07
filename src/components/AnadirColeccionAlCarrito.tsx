"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";
import { IconoBolsaCompra } from "@/components/iconos";

/**
 * Añade una colección comercial al carrito.
 *
 * Usa el MISMO carrito de siempre (`rcktdmg_cart`) y el mismo
 * evento: no hay un segundo carrito ni una segunda clave. Una
 * colección se distingue por `kind: "COLLECTION"`, igual que
 * un pack lo hace con `"PACK"`; los elementos guardados antes
 * no llevan `kind` y se siguen tratando como recursos sueltos.
 *
 * Una colección no tiene cantidad: comprarla dos veces no da
 * nada nuevo, porque las licencias son por recurso.
 */
export default function AnadirColeccionAlCarrito({
  coleccion,
}: {
  coleccion: {
    id: string;
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
  };
}) {
  const [anadida, setAnadida] = useState(false);

  function anadir() {
    try {
      const guardado = localStorage.getItem(CART_STORAGE_KEY);

      const carrito = guardado ? JSON.parse(guardado) : [];

      const lista = Array.isArray(carrito) ? carrito : [];

      const yaEsta = lista.some(
        (item: { id: string; kind?: string }) =>
          item.id === coleccion.id && item.kind === "COLLECTION"
      );

      if (!yaEsta) {
        lista.push({
          id: coleccion.id,
          kind: "COLLECTION",
          name: coleccion.name,
          price: coleccion.price,
          slug: coleccion.slug,
          coverUrl: coleccion.coverUrl,
          quantity: 1,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lista));

        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
      }

      setAnadida(true);

      setTimeout(() => setAnadida(false), 2400);
    } catch {
      // Si el navegador bloquea localStorage no se rompe nada:
      // simplemente no se guarda.
    }
  }

  return (
    <button
      type="button"
      onClick={anadir}
      className="rk-btn rk-btn-primary w-full"
    >
      {anadida ? (
        <>
          <Check size={16} aria-hidden />
          Añadida al carrito
        </>
      ) : (
        <>
          <IconoBolsaCompra size={16} aria-hidden />
          Añadir la colección
        </>
      )}
    </button>
  );
}
