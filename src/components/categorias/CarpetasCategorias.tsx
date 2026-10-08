import Image from "next/image";
import Link from "next/link";

import {
  IsotipoPrograma,
  NOMBRE_PROGRAMA,
  type Programa,
} from "@/components/programas/LogosProgramas";

export type CarpetaCategoria = {
  id: string;
  name: string;
  slug: string;
  total: number;
  /** Hasta tres portadas reales, las más recientes. */
  portadas: string[];
  /** Programas de sus archivos (Photoshop, Figma, Canva). */
  programas: Programa[];
};

/**
 * Rejilla de categorías como carpetas de escritorio, con las
 * portadas reales asomando como hojas. La usan /categorias y
 * el inicio (debajo del slider).
 */
export default function CarpetasCategorias({
  categorias,
  nivelTitulo = "h2",
  className = "",
}: {
  categorias: CarpetaCategoria[];
  nivelTitulo?: "h2" | "h3";
  className?: string;
}) {
  const Titulo = nivelTitulo;

  return (
    <div className={`rk-folder-grid ${className}`}>
      {categorias.map((category) => {
        const { total, portadas, programas } = category;

        return (
          <Link
            key={category.id}
            href={`/tienda?categoria=${category.slug}`}
            className="rk-folder-item rk-press"
            aria-label={`${category.name}: ${total} ${
              total === 1 ? "recurso" : "recursos"
            }`}
          >
            {/* La carpeta: portadas asomando y, al frente, los programas */}
            <span className="rk-folder">
              <span aria-hidden className="rk-folder-back" />

              <span aria-hidden className="rk-folder-papers">
                {portadas.length > 0 ? (
                  portadas.map((url) => (
                    <span key={url} className="rk-folder-paper">
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 26vw, 40vw"
                      />
                    </span>
                  ))
                ) : (
                  <span className="rk-folder-paper rk-folder-paper-empty" />
                )}
              </span>

              <span className="rk-folder-front">
                {programas.length > 0 && (
                  <span className="rk-folder-programas">
                    {programas.map((programa) => (
                      <span
                        key={programa}
                        className="rk-folder-programa"
                        title={NOMBRE_PROGRAMA[programa]}
                      >
                        <IsotipoPrograma programa={programa} />
                        <span className="sr-only">{NOMBRE_PROGRAMA[programa]}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </span>

            {/* Nombre y total, debajo de la carpeta */}
            <span className="rk-folder-text">
              <Titulo className="rk-folder-title">{category.name}</Titulo>

              <span className="rk-folder-count">
                {total} {total === 1 ? "recurso" : "recursos"}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Convierte el resultado de Prisma en carpetas listas para pintar. */
export function aCarpetas(
  categorias: {
    id: string;
    name: string;
    slug: string;
    _count: { products: number };
    products: { coverUrl: string | null; images: { url: string }[] }[];
  }[],
  programas: Record<string, Programa[]> = {}
): CarpetaCategoria[] {
  return categorias.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    total: c._count.products,
    portadas: c.products
      .map((p) => p.coverUrl || p.images[0]?.url || null)
      .filter((url): url is string => Boolean(url))
      .slice(0, 3),
    programas: programas[c.id] ?? [],
  }));
}
