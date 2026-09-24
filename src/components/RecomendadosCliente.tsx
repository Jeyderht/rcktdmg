"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ProductCard from "@/components/ProductCard";
import type { BloqueRecomendaciones } from "@/lib/recomendaciones-tipos";

/**
 * Recomendaciones en una página de cliente.
 *
 * Pide el bloque ya resuelto a /api/recomendaciones; la
 * puntuación y las señales se quedan en el servidor. Si no hay
 * nada que mostrar, no se pinta nada: ni esqueleto permanente
 * ni sección vacía.
 */
export default function RecomendadosCliente() {
  const [bloque, setBloque] = useState<BloqueRecomendaciones | null>(
    null
  );
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch("/api/recomendaciones", {
          cache: "no-store",
        });

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        if (!cancelado) setBloque(datos.bloque ?? null);
      } catch {
        /* Sin recomendaciones: la página sigue igual. */
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando || !bloque || bloque.productos.length === 0) {
    return null;
  }

  return (
    <section className="rk-fade-up mt-10 sm:mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="rk-eyebrow">Descubre</p>

          <h2 className="rk-title mt-2 text-2xl">{bloque.titulo}</h2>

          {bloque.subtitulo && (
            <p className="mt-1.5 text-sm leading-6 text-ink/60">
              {bloque.subtitulo}
            </p>
          )}
        </div>

        <Link
          href="/tienda"
          className="rk-press-sm inline-flex min-h-[2.75rem] shrink-0 items-center text-sm font-medium text-ink transition-opacity hover:opacity-75"
        >
          Ver todo
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {bloque.productos.map((producto) => (
          <ProductCard key={producto.id} product={producto} />
        ))}
      </div>
    </section>
  );
}
