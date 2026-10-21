"use client";

import { useState, type ReactNode } from "react";

import { medidaCx, nombreCategoria, ordenCategoria, type CategoriaRecurso } from "@/components/cuenta/medidaCx";

export type ElementoCategoria = {
  id: string;
  categoria: CategoriaRecurso;
  /** La tarjeta ya montada (TarjetaCx). */
  tarjeta: ReactNode;
};

/**
 * Recursos ordenados por categoría (inicios del cliente y del
 * creador). Solo presentación sobre datos ya cargados: no pide
 * nada nuevo.
 *
 * - «Todos»: una fila por categoría (Eventos → Corporativos →
 *   Social Media → General → Plantillas), con su medida, recuento
 *   y «Ver todos»; las tarjetas se deslizan en horizontal.
 * - Un chip concreto: solo esa categoría, en rejilla.
 *
 * Dentro de cada categoría se respeta el orden en que llegan
 * (más recientes primero). Solo salen las categorías que tienen
 * recursos.
 */
export default function FilasCategoriaCx({
  elementos,
  unidad = "recursos",
}: {
  elementos: ElementoCategoria[];
  unidad?: string;
}) {
  const [filtro, setFiltro] = useState<string | null>(null);

  const grupos = new Map<string, ElementoCategoria[]>();
  for (const e of elementos) {
    const clave = e.categoria.slug ?? "";
    grupos.set(clave, [...(grupos.get(clave) ?? []), e]);
  }
  const categorias = [...grupos.keys()].sort((a, b) => ordenCategoria(a || null) - ordenCategoria(b || null));
  const activa = filtro !== null && grupos.has(filtro) ? filtro : null;
  const visibles = activa === null ? elementos.length : grupos.get(activa)!.length;

  const medidaDe = (slug: string) => {
    const muestra = grupos.get(slug)![0].categoria;
    // La medida de la fila es la de la categoría, no la de un recurso suelto.
    return medidaCx({ slug: muestra.slug, pieza: muestra.pieza }).medida;
  };

  return (
    <>
      {categorias.length > 1 && (
        <div className="rk-cx-chips" role="group" aria-label="Filtrar por categoría">
          <button type="button" className="rk-chip" aria-pressed={activa === null} onClick={() => setFiltro(null)}>
            Todos
          </button>
          {categorias.map((slug) => (
            <button
              key={slug}
              type="button"
              className="rk-chip"
              aria-pressed={activa === slug}
              onClick={() => setFiltro(slug)}
            >
              {nombreCategoria(slug || null)}
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {visibles} {visibles === 1 ? unidad.replace(/s$/, "") : unidad}
        {activa !== null ? ` en ${nombreCategoria(activa || null)}` : ""}
      </p>

      {activa !== null ? (
        <ul className="rk-cx-gs">
          {grupos.get(activa)!.map((e) => (
            <li key={e.id}>{e.tarjeta}</li>
          ))}
        </ul>
      ) : (
        categorias.map((slug) => {
          const lista = grupos.get(slug)!;
          const id = `rk-cx-fila-${slug || "otras"}`;
          return (
            <section key={slug} className="rk-cx-rowcat" aria-labelledby={id}>
              <div className="rk-cx-rh">
                <h4 id={id}>{nombreCategoria(slug || null)}</h4>
                <span className="rk-cx-rh-md">{medidaDe(slug)}</span>
                <span className="rk-cx-rc">
                  {lista.length} {lista.length === 1 ? unidad.replace(/s$/, "") : unidad}
                </span>
                {categorias.length > 1 && (
                  <button type="button" className="rk-cx-sel" onClick={() => setFiltro(slug)}>
                    Ver todos
                  </button>
                )}
              </div>
              <ul className="rk-cx-hs">
                {lista.map((e) => (
                  <li key={e.id}>{e.tarjeta}</li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
