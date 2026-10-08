"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";

import ProductCard, { type ProductCardData } from "@/components/ProductCard";

/**
 * Resultados de la tienda en modo galería.
 *
 * Solo las portadas, en una rejilla de 3 columnas en móvil (más en
 * pantallas grandes), como un muro de diseños. Al tocar una se abre
 * la tarjeta del recurso (nombre, creador, precio y formato; sobre
 * la imagen solo favorito arriba a la izquierda y cerrar a la
 * derecha) en una hoja encima, con flechas para pasar al anterior
 * o al siguiente y un botón para ir a la ficha.
 *
 * La paginación (20 por página) la sigue dando StoreResults.
 */
export default function GaleriaTienda({
  productos,
}: {
  productos: ProductCardData[];
}) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const total = productos.length;

  const cerrar = useCallback(() => setAbierto(null), []);
  const mover = useCallback(
    (paso: number) =>
      setAbierto((i) => (i === null ? i : (i + paso + total) % total)),
    [total]
  );

  // Esc cierra, flechas del teclado pasan; el fondo no se desplaza.
  useEffect(() => {
    if (abierto === null) return;

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = overflowAntes;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar, mover]);

  const actual = abierto === null ? null : productos[abierto];

  return (
    <>
      <ul className="rk-galeria" aria-label="Recursos">
        {productos.map((p, i) => {
          const imagen = p.coverUrl || p.image?.url || null;

          return (
            <li key={p.id}>
              <button
                type="button"
                className="rk-galeria-item"
                onClick={() => setAbierto(i)}
                aria-label={`${p.name}: ver precio e información`}
              >
                {imagen ? (
                  <Image
                    src={imagen}
                    alt={p.image?.alt || p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <span className="rk-galeria-vacio">RcktX</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {actual && (
        <div
          className="rk-galeria-modal"
          role="dialog"
          aria-modal="true"
          aria-label={actual.name}
        >
          <button
            type="button"
            className="rk-galeria-fondo"
            aria-label="Cerrar"
            onClick={cerrar}
          />

          <div className="rk-galeria-hoja">
            <button
              type="button"
              className="rk-press rk-glass-on-image rk-galeria-cerrar"
              aria-label="Cerrar"
              onClick={cerrar}
            >
              <X aria-hidden />
            </button>

            <ProductCard key={actual.id} product={actual} />

            <div className="rk-galeria-acciones">
              {total > 1 && (
                <button
                  type="button"
                  className="rk-btn rk-btn-line rk-btn-icon"
                  aria-label="Anterior"
                  onClick={() => mover(-1)}
                >
                  <ChevronLeft aria-hidden />
                </button>
              )}

              <Link
                href={`/tienda/${actual.slug}`}
                className="rk-btn rk-btn-primary flex-1"
              >
                Ver recurso
                <ArrowUpRight size={16} aria-hidden />
              </Link>

              {total > 1 && (
                <button
                  type="button"
                  className="rk-btn rk-btn-line rk-btn-icon"
                  aria-label="Siguiente"
                  onClick={() => mover(1)}
                >
                  <ChevronRight aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
