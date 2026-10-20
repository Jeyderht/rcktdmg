import Link from "next/link";
import { SearchX, X } from "lucide-react";

import GaleriaTienda from "./GaleriaTienda";
import Paginacion from "@/components/ui/Paginacion";
import { consultarCatalogo } from "@/lib/catalogo-consulta";
import {
  hayFiltros,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";

/**
 * Resultados de Explorar: rejilla de portadas y paginación.
 *
 * Va dentro de un <Suspense> en la página para que la
 * cabecera y los filtros se pinten de inmediato mientras se
 * resuelve la consulta. El contador vive en la cabecera.
 *
 * El límite de carga vive AQUÍ y no en un `loading.tsx` de
 * segmento: un loading.tsx en /tienda también envolvería a
 * /tienda/[slug], y al empezar el streaming la respuesta se
 * comprometería como 200, impidiendo que notFound() devuelva
 * un 404 real en un producto inexistente.
 */
export default async function StoreResults({
  parametros,
}: {
  parametros: ParametrosTienda;
}) {
  /*
    Solo se muestran recursos PUBLISHED: los estados DRAFT,
    PENDING_REVIEW, REJECTED y ARCHIVED nunca deben aparecer
    públicamente. De eso se ocupa construirWhere, dentro de
    consultarCatalogo, que además pagina: aquí nunca llegan
    más de POR_PAGINA recursos.
  */
  const { productos, pagina, totalPaginas } =
    await consultarCatalogo(parametros);

  const conFiltros = hayFiltros(parametros);

  if (productos.length === 0) {
    return (
      <div className="rk-fade-up rk-tile mt-5 px-6 py-16 text-center">
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
          <Link href="/tienda" className="rk-btn rk-btn-ink mt-7">
            <X size={15} />
            Limpiar filtros
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {/*
        Solo portadas. Al tocar una se abre su tarjeta con precio
        e información. aTarjeta ya entrega datos planos (números
        y textos), así que pasan tal cual al componente de cliente.
      */}
      <div className="rk-fade-up mt-5">
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
  );
}

/** Skeleton mostrado mientras se resuelven los resultados. */
export function StoreResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando recursos" className="mt-5">
      <div className="rk-ex-rejilla">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="rk-ex-hueco animate-pulse" />
        ))}
      </div>
    </div>
  );
}
