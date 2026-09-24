import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { esTagProtegido } from "@/lib/tags";

export const dynamic = "force-dynamic";

/**
 * Etiquetas disponibles.
 *
 * La usan el buscador de etiquetas del Creator Studio y el
 * listado público /tags. Devuelve solo etiquetas reales, con
 * el número de recursos publicados que hay detrás.
 *
 * Las etiquetas estructurales (`pack`) no aparecen: no son
 * descriptivas y marcarlas a mano rompería el catálogo.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const consulta = (searchParams.get("q") ?? "").trim();

    // Un límite alto tampoco debe poder pedir la tabla entera.
    const limite = Math.min(
      Math.max(Number(searchParams.get("limite") ?? 20) || 20, 1),
      50
    );

    // Por defecto solo interesan las etiquetas que llevan a algo.
    const soloConRecursos =
      searchParams.get("todas") !== "true";

    const tags = await prisma.tag.findMany({
      where: {
        ...(consulta
          ? { name: { contains: consulta, mode: "insensitive" } }
          : {}),
        ...(soloConRecursos
          ? { products: { some: { product: { status: "PUBLISHED" } } } }
          : {}),
      },
      orderBy: consulta
        ? [{ name: "asc" }]
        : [{ products: { _count: "desc" } }, { name: "asc" }],
      take: limite,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: { where: { product: { status: "PUBLISHED" } } },
          },
        },
      },
    });

    return NextResponse.json({
      tags: tags
        .filter((tag) => !esTagProtegido(tag.slug))
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          recursos: tag._count.products,
        })),
    });
  } catch (error) {
    console.error("GET /api/tags:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las etiquetas." },
      { status: 500 }
    );
  }
}
