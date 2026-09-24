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

  const flecha =
    "inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1 rounded-rk-sm border px-3 text-sm font-medium transition-colors duration-fast ease-rk";

  return (
    <nav
      aria-label="Paginación de resultados"
      className="mt-10 flex items-center justify-center gap-2"
    >
      {hayAnterior ? (
        <Link
          href={href(pagina - 1)}
          rel="prev"
          aria-label="Página anterior"
          className={`${flecha} rk-press-sm border-line/15 text-ink hover:border-ink/40 hover:bg-ink/[0.04]`}
        >
          <ChevronLeft size={16} aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
        </Link>
      ) : (
        <span
          aria-hidden
          className={`${flecha} cursor-not-allowed border-line/10 text-ink/25`}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Anterior</span>
        </span>
      )}

      {/* NÚMEROS — desde tablet */}
      <ol className="hidden items-center gap-1.5 sm:flex">
        {numeros.map((numero, indice) =>
          numero === null ? (
            <li
              key={`salto-${indice}`}
              aria-hidden
              className="px-1 text-sm text-ink/40"
            >
              …
            </li>
          ) : (
            <li key={numero}>
              <Link
                href={href(numero)}
                aria-label={`Página ${numero}`}
                aria-current={numero === pagina ? "page" : undefined}
                className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-rk-sm border px-3 text-sm tabular-nums transition-colors duration-fast ease-rk ${
                  numero === pagina
                    ? "border-ink bg-ink font-semibold text-background"
                    : "rk-press-sm border-line/15 text-ink/70 hover:border-ink/40 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                {numero}
              </Link>
            </li>
          )
        )}
      </ol>

      {/* CONTADOR — solo en móvil, donde no caben los números */}
      <p
        className="px-2 text-sm tabular-nums text-ink/60 sm:hidden"
        aria-live="polite"
      >
        {pagina} de {totalPaginas}
      </p>

      {haySiguiente ? (
        <Link
          href={href(pagina + 1)}
          rel="next"
          aria-label="Página siguiente"
          className={`${flecha} rk-press-sm border-line/15 text-ink hover:border-ink/40 hover:bg-ink/[0.04]`}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        <span
          aria-hidden
          className={`${flecha} cursor-not-allowed border-line/10 text-ink/25`}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
