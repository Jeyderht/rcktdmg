import { prisma } from "@/lib/prisma";
import type { Programa } from "@/components/programas/LogosProgramas";

/** Extensión del archivo → programa que lo abre. */
const POR_FORMATO: Record<string, Programa> = {
  psd: "ps",
  psb: "ps",
  fig: "figma",
  figma: "figma",
  canva: "canva",
};

const ORDEN: Programa[] = ["ps", "figma", "canva"];

/**
 * Programas (Photoshop, Figma, Canva) de los recursos publicados
 * de cada categoría, leídos del formato real de sus archivos.
 * Una sola consulta agrupada para todas las categorías.
 * Si falla, las carpetas salen sin círculos.
 */
export async function programasPorCategoria(
  ids: string[]
): Promise<Record<string, Programa[]>> {
  if (ids.length === 0) return {};

  try {
    const filas = await prisma.product.groupBy({
      by: ["categoryId", "fileFormat"],
      where: {
        status: "PUBLISHED",
        categoryId: { in: ids },
        fileFormat: { not: null },
      },
    });

    const mapa: Record<string, Set<Programa>> = {};

    for (const fila of filas) {
      const programa = POR_FORMATO[(fila.fileFormat ?? "").toLowerCase()];
      if (!programa) continue;
      (mapa[fila.categoryId] ??= new Set()).add(programa);
    }

    return Object.fromEntries(
      Object.entries(mapa).map(([id, set]) => [
        id,
        ORDEN.filter((p) => set.has(p)),
      ])
    );
  } catch {
    return {};
  }
}
