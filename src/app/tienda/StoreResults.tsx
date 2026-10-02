import Link from "next/link";
import { SearchX, X } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import Paginacion from "@/components/Paginacion";
import { consultarCatalogo } from "@/lib/catalogo-consulta";
import {
  hayFiltros,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";

type StoreResultsProps = {
  parametros: ParametrosTienda;
  activeCategoryName: string | null;
};

/**
 * Resultados de la tienda.
 *
 * Va dentro de un <Suspense> en la página para que la
 * cabecera y los filtros se pinten de inmediato mientras se
 * resuelve la consulta.
 *
 * El límite de carga vive AQUÍ y no en un `loading.tsx` de
 * segmento: un loading.tsx en /tienda también envolvería a
 * /tienda/[slug], y al empezar el streaming la respuesta se
 * comprometería como 200, impidiendo que notFound() devuelva
 * un 404 real en un producto inexistente.
 */
export default async function StoreResults({
  parametros,
  activeCategoryName,
}: StoreResultsProps) {
  /*
    Solo se muestran recursos PUBLISHED: los estados DRAFT,
    PENDING_REVIEW, REJECTED y ARCHIVED nunca deben aparecer
    públicamente. De eso se ocupa construirWhere, dentro de
    consultarCatalogo, que además pagina: aquí nunca llegan
    más de POR_PAGINA recursos.
  */
  const { productos, total, pagina, totalPaginas } =
    await consultarCatalogo(parametros);

  const query = parametros.q ?? "";
  const conFiltros = hayFiltros(parametros);

  return (
    <>
      {/* CONTADOR Y CONTEXTO */}
      <section className="rk-fade-up mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {query ? (
            <p className="text-[15px] text-ink/60">
              Resultados para{" "}
              <span className="font-semibold text-ink">“{query}”</span>

              {activeCategoryName && (
                <>
                  {" en "}
                  <span className="font-semibold text-ink">
                    {activeCategoryName}
                  </span>
                </>
              )}
            </p>
          ) : activeCategoryName ? (
            <p className="text-[15px] text-ink/60">
              Categoría{" "}
              <span className="font-semibold text-ink">
                {activeCategoryName}
              </span>
            </p>
          ) : (
            <p className="text-[15px] text-ink/60">
              Todos los recursos
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/*
            Contador real, nunca estimado, y del catálogo
            filtrado entero: no de la página que se está
            viendo.
          */}
          <span className="text-sm font-medium tabular-nums text-ink/60">
            {total} {total === 1 ? "recurso" : "recursos"}
          </span>

          {conFiltros && (
            <Link
              href="/tienda"
              className="rk-press rk-hit-44-y inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              <X size={14} />
              Limpiar filtros
            </Link>
          )}
        </div>
      </section>

      <div className="rk-divider mt-4" />

      {/* RESULTADOS */}
      {productos.length > 0 ? (
        <>
          <div className="rk-fade-up rk-enter-1 mt-6 rk-rejilla">
            {productos.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            href={(numero) =>
              urlTienda(parametros, {
                // La página 1 es la URL limpia, sin ?page=1.
                page: numero <= 1 ? undefined : String(numero),
              })
            }
          />
        </>
      ) : (
        /* SIN RESULTADOS */
        <div className="rk-fade-up rk-tile mt-6 px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-rk-md bg-ink/[0.06]">
            <SearchX size={26} />
          </div>

          <h2 className="rk-title mt-5 text-xl">
            {conFiltros
              ? "Sin resultados"
              : "Todavía no hay recursos publicados"}
          </h2>

          <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-ink/60">
            {conFiltros
              ? "No encontramos recursos que coincidan con tu búsqueda."
              : "Vuelve pronto: los creadores están preparando sus recursos."}
          </p>

          {conFiltros && (
            <Link href="/tienda" className="rk-btn rk-btn-ink mt-7">
              <X size={15} />
              Limpiar filtros
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/** Skeleton mostrado mientras se resuelven los resultados. */
export function StoreResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando recursos">
      <div className="mt-6 flex items-baseline justify-between gap-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink/[0.06]" />
        <div className="h-4 w-20 animate-pulse rounded-full bg-ink/[0.06]" />
      </div>

      <div className="rk-divider mt-4" />

      <div className="mt-6 rk-rejilla">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index}>
            <div className="rk-aspect-product w-full animate-pulse rounded-rk-md bg-ink/[0.06]" />

            <div className="px-0.5 pt-2.5">
              <div className="h-3 w-full animate-pulse rounded-full bg-ink/[0.06]" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-ink/[0.05]" />
              <div className="mt-3 h-4 w-16 animate-pulse rounded-full bg-ink/[0.07]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
