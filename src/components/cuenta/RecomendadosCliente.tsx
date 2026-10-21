"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import TarjetaCx from "@/components/cuenta/TarjetaCx";
import ProductCard from "@/components/tienda/ProductCard";
import { formatPrice } from "@/lib/pricing";
import type { BloqueRecomendaciones } from "@/lib/recomendaciones-tipos";

/**
 * Recomendaciones en una página de cliente.
 *
 * Pide el bloque ya resuelto a /api/recomendaciones; la
 * puntuación y las señales se quedan en el servidor. Si no hay
 * nada que mostrar, no se pinta nada: ni esqueleto permanente
 * ni sección vacía.
 *
 * `variante="cx"` solo cambia el aspecto (inicio del cliente):
 * mismo fetch, mismos datos y los mismos enlaces a cada ficha.
 */
export default function RecomendadosCliente({
  variante,
}: {
  variante?: "cx";
} = {}) {
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

  if (variante === "cx") {
    return (
      <section className="rk-cx-sec" aria-labelledby="rk-cx-recomendados">
        <div className="rk-cx-sh">
          <div>
            <h3 id="rk-cx-recomendados">Recomendados para ti</h3>
            {bloque.subtitulo && <p>{bloque.subtitulo}</p>}
          </div>
        </div>

        <ul className="rk-cx-g4">
          {bloque.productos.slice(0, 4).map((producto) => (
            <li key={producto.id}>
              <TarjetaCx
                href={`/tienda/${producto.slug}`}
                imagen={producto.coverUrl || producto.image?.url || null}
                alt={producto.image?.alt || producto.name}
                titulo={producto.name}
                meta={[producto.creator?.name, producto.category?.name]
                  .filter(Boolean)
                  .join(" · ")}
                pie={[producto.category?.name, producto.fileFormat?.toUpperCase()]
                  .filter(Boolean)
                  .join(" · ")}
                accion={<span className="rk-cx-badge">{formatPrice(producto.price)}</span>}
              />
            </li>
          ))}
        </ul>
      </section>
    );
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
          className="rk-btn rk-btn-line rk-btn-compact shrink-0"
        >
          Ver todo
        </Link>
      </div>

      <div className="mt-5 rk-rejilla">
        {bloque.productos.map((producto) => (
          <ProductCard key={producto.id} product={producto} />
        ))}
      </div>
    </section>
  );
}
