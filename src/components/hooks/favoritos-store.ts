"use client";

import { useEffect, useState } from "react";

/**
 * Los favoritos, una sola vez por página.
 *
 * Cada tarjeta lleva su corazón, y cada corazón pedía la lista
 * ENTERA de favoritos al montarse. Medido en el navegador:
 * Home lanzaba 21 peticiones idénticas a /api/favoritos y la
 * tienda 7. Todas devolvían exactamente lo mismo.
 *
 * Aquí la lista se pide UNA vez y se reparte. Los corazones se
 * suscriben; quien llegue después de la primera petición
 * recibe lo que ya hay sin pedir nada.
 *
 * El estado vive a nivel de módulo a propósito: es de la
 * pestaña, no de ningún componente, y sobrevive a que las
 * tarjetas se monten y desmonten al filtrar el catálogo.
 */

/** Ids de los recursos marcados. `null` = todavía no se sabe. */
let favoritos: Set<string> | null = null;

/** La petición en vuelo, para que dos corazones no la dupliquen. */
let enVuelo: Promise<Set<string>> | null = null;

const suscriptores = new Set<() => void>();

function avisar() {
  for (const fn of suscriptores) fn();
}

async function cargar(): Promise<Set<string>> {
  if (favoritos) return favoritos;

  if (enVuelo) return enVuelo;

  enVuelo = (async () => {
    try {
      const respuesta = await fetch("/api/favoritos", { cache: "no-store" });

      if (!respuesta.ok) {
        // 401 incluido: sin sesión no hay favoritos, y no es un error.
        favoritos = new Set<string>();

        return favoritos;
      }

      const datos = await respuesta.json();

      favoritos = new Set<string>(
        (datos.favorites || []).map(
          (f: { productId: string }) => f.productId
        )
      );

      return favoritos;
    } catch {
      favoritos = new Set<string>();

      return favoritos;
    } finally {
      enVuelo = null;

      avisar();
    }
  })();

  return enVuelo;
}

/** Cambia el estado local al instante. Lo usa el botón antes de la red. */
function fijarLocal(productId: string, marcado: boolean) {
  if (!favoritos) favoritos = new Set<string>();

  if (marcado) favoritos.add(productId);
  else favoritos.delete(productId);

  avisar();
}

/**
 * Marca o desmarca, enseñándolo ANTES de preguntar al servidor.
 *
 * El corazón cambia en el mismo fotograma del clic; si el
 * servidor dice que no, vuelve atrás y se explica. Es la
 * diferencia entre un botón que responde y uno que parece
 * congelado durante el viaje de ida y vuelta.
 */
export async function alternarFavorito(
  productId: string,
  marcadoAhora: boolean
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const deseado = !marcadoAhora;

  fijarLocal(productId, deseado);

  try {
    const respuesta = await fetch("/api/favoritos", {
      method: deseado ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (respuesta.status === 401) {
      fijarLocal(productId, marcadoAhora);

      return { ok: false, mensaje: "Inicia sesión para guardar" };
    }

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));

      fijarLocal(productId, marcadoAhora);

      return {
        ok: false,
        mensaje: datos.error || "No se pudo actualizar",
      };
    }

    return { ok: true };
  } catch {
    fijarLocal(productId, marcadoAhora);

    return { ok: false, mensaje: "No se pudo actualizar" };
  }
}

/**
 * ¿Está marcado este recurso?
 *
 * `cargando` es true solo mientras se resuelve la primera
 * petición de la página, no una por botón.
 */
export function useEsFavorito(productId: string): {
  esFavorito: boolean;
  cargando: boolean;
} {
  const [, redibujar] = useState(0);

  useEffect(() => {
    const fn = () => redibujar((n) => n + 1);

    suscriptores.add(fn);

    void cargar();

    return () => {
      suscriptores.delete(fn);
    };
  }, []);

  return {
    esFavorito: favoritos?.has(productId) ?? false,
    cargando: favoritos === null,
  };
}
