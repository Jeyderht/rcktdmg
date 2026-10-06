import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { numerosDePagina } from "@/lib/catalogo";

/**
 * Paginador del catálogo.
 *
 * Son enlaces reales, no botones con JavaScript: cada página
 * tiene su propia URL, se puede compartir, abrir en otra
 * pestaña y recorrer con el botón de atrás. Por eso también
 * funciona con la tienda renderizada en el servidor.
 *
 * En móvil los números intermedios se ocultan y quedan
 * "Anterior · 3 de 7 · Siguiente", que es lo que cabe sin
 * apretar los objetivos táctiles.
 */
export default function Paginacion({
  href,
  pagina,
  totalPaginas,
}: {
  /**
   * URL de cada página. La decide quien use el paginador,
   * porque la tienda conserva sus filtros y el perfil de
   * creador tiene otra ruta distinta.
   */
  href: (numero: number) => string;
  pagina: number;
  totalPaginas: number;
}) {
  if (totalPaginas <= 1) return null;

  const numeros = numerosDePagina(pagina, totalPaginas);

  const hayAnterior = pagina > 1;
  const haySiguiente = pagina < totalPaginas;

  return (
    <nav
      aria-label="Paginación de resultados"
      className="rk-pagination mt-10 justify-center"
    >
      {hayAnterior ? (
        <Link
          href={href(pagina - 1)}
          rel="prev"
          aria-label="Página anterior"
          className="rk-btn rk-btn-line rk-paginacion-flecha"
        >
          <ChevronLeft size={16} aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
        </Link>
      ) : (
        <span
          aria-hidden
          className="rk-btn rk-btn-line rk-paginacion-flecha is-disabled"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Anterior</span>
        </span>
      )}

      {/* NÚMEROS — desde tablet; el activo lleva cristal y lengüeta */}
      <ol className="hidden items-center gap-1 sm:flex">
        {numeros.map((numero, indice) =>
          numero === null ? (
            <li key={`salto-${indice}`} aria-hidden className="rk-pagination-item">
              …
            </li>
          ) : (
            <li key={numero}>
              <Link
                href={href(numero)}
                aria-label={`Página ${numero}`}
                aria-current={numero === pagina ? "page" : undefined}
                className="rk-pagination-item"
                style={{ minWidth: 40, height: 40 }}
              >
                {numero}
              </Link>
            </li>
          )
        )}
      </ol>

      {/* CONTADOR — solo en móvil, donde no caben los números */}
      <p className="rk-paginacion-contador sm:hidden" aria-live="polite">
        {pagina} de {totalPaginas}
      </p>

      {haySiguiente ? (
        <Link
          href={href(pagina + 1)}
          rel="next"
          aria-label="Página siguiente"
          className="rk-btn rk-btn-line rk-paginacion-flecha"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        <span
          aria-hidden
          className="rk-btn rk-btn-line rk-paginacion-flecha is-disabled"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
