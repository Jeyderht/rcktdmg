import Link from "next/link";
import { SearchX, X } from "lucide-react";

import GaleriaTienda from "./GaleriaTienda";
import Paginacion from "@/components/ui/Paginacion";
import { consultarCatalogo } from "@/lib/catalogo-consulta";
import { visorActual } from "@/lib/visor";
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
    await consultarCatalogo(parametros, await visorActual());

  const query = parametros.q ?? "";
  // La categoría siempre está puesta: no cuenta como filtro que limpiar.
  const conFiltros = hayFiltros({ ...parametros, categoria: undefined });
  const recursos = `${total} ${total === 1 ? "recurso" : "recursos"}`;

  return (
    <>
      {/* CONTADOR Y CONTEXTO */}
      {/* «Eventos · N recursos»: la categoría activa y el contador
          real del catálogo filtrado entero (no de la página). */}
      <section className="rk-fade-up rk-explorar-contador flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
              <span className="tabular-nums"> · {recursos}</span>
            </p>
          ) : (
            <p className="text-[15px] text-ink/60">
              <span className="font-semibold text-ink">
                {activeCategoryName ?? "Recursos"}
              </span>
              <span className="tabular-nums"> · {recursos}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {conFiltros && (
            <Link
              href={urlTienda({}, { categoria: parametros.categoria })}
              className="rk-press rk-hit-44-y inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              <X size={14} />
              Limpiar filtros
            </Link>
          )}
        </div>
      </section>

      <div className="rk-divider" />

      {/* RESULTADOS */}
      {productos.length > 0 ? (
        <>
          {/*
            Galería: solo portadas, 3 columnas en móvil. Al tocar
            una se abre su tarjeta con precio e información.
            aTarjeta ya entrega datos planos (números y textos),
            así que pasan tal cual al componente de cliente.
          */}
          <div className="rk-fade-up rk-enter-1 rk-explorar-rejilla">
            <GaleriaTienda productos={productos} />
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
          <div className="rk-empty-icon mx-auto">
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
            <Link href={urlTienda({}, { categoria: parametros.categoria })} className="rk-btn rk-btn-ink mt-7">
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
      <div className="rk-explorar-contador flex items-baseline justify-between gap-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink/[0.06]" />
        <div className="h-4 w-20 animate-pulse rounded-full bg-ink/[0.06]" />
      </div>

      <div className="rk-divider" />

      <div className="rk-explorar-rejilla rk-galeria">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/5] w-full animate-pulse rounded-[14px] bg-ink/[0.06]"
          />
        ))}
      </div>
    </div>
  );
}
