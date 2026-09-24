import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TAGS_PROTEGIDOS } from "@/lib/tags-comun";

/**
 * Ordenación por relevancia con pg_trgm.
 *
 * DÓNDE ENCAJA ESTO
 *
 * El filtrado sigue viviendo entero en `construirWhere`
 * (src/lib/catalogo.ts). Aquí NO se repite ni un solo filtro:
 * este módulo recibe los ids que Prisma ya ha filtrado y se
 * limita a puntuarlos y ordenarlos.
 *
 * Es deliberado. Si los filtros se escribieran dos veces —una
 * en Prisma y otra en SQL— cualquier filtro nuevo habría que
 * recordar añadirlo en dos sitios, y el día que alguien se
 * olvidara, la búsqueda enseñaría recursos que el filtro
 * debería haber escondido. Con este reparto eso no puede
 * pasar: lo que no pasa el filtro de Prisma nunca llega aquí.
 */

/**
 * Cuántos candidatos se puntúan como mucho.
 *
 * La relevancia solo importa en las primeras páginas: nadie
 * llega a la página 40 de una búsqueda. Poner un techo evita
 * que una búsqueda muy genérica traiga el catálogo entero
 * solo para ordenarlo.
 */
export const LIMITE_RELEVANCIA = 500;

/** Escapa los comodines de LIKE en el texto del usuario. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Ordena por relevancia los ids que ya vienen filtrados.
 *
 * La puntuación combina dos señales:
 *
 *   · Parecido difuso (`similarity`, de pg_trgm), que tolera
 *     erratas: "restaurnte" sigue encontrando "restaurante".
 *   · Coincidencia literal, que suma aparte para que quien
 *     escribe el nombre exacto lo vea primero y no lo adelante
 *     un parecido casual.
 *
 * Los pesos reflejan cuánto dice cada campo: el nombre manda,
 * las etiquetas y la categoría acompañan, y la descripción es
 * la señal más débil porque casi cualquier palabra aparece en
 * algún párrafo.
 */
export async function ordenarPorRelevancia(
  ids: string[],
  texto: string
): Promise<string[]> {
  if (ids.length === 0) return [];

  const consulta = texto.trim();

  if (!consulta) return ids;

  const patron = `%${escaparLike(consulta)}%`;

  const filas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "Product" p
    JOIN "Category" c ON c."id" = p."categoryId"
    WHERE p."id" IN (${Prisma.join(ids)})
    ORDER BY
      (
        GREATEST(
          similarity(p."name", ${consulta}) * 3.0,
          COALESCE(
            (
              SELECT MAX(similarity(t."name", ${consulta}))
              FROM "ProductTag" pt
              JOIN "Tag" t ON t."id" = pt."tagId"
              WHERE pt."productId" = p."id"
            ),
            0
          ) * 2.0,
          similarity(c."name", ${consulta}) * 1.5,
          similarity(LEFT(p."description", 1000), ${consulta})
        )
        + CASE WHEN p."name" ILIKE ${patron} ESCAPE '\\' THEN 1.0 ELSE 0.0 END
        + CASE WHEN c."name" ILIKE ${patron} ESCAPE '\\' THEN 0.4 ELSE 0.0 END
        + CASE WHEN p."description" ILIKE ${patron} ESCAPE '\\' THEN 0.3 ELSE 0.0 END
      ) DESC,
      p."createdAt" DESC
  `;

  return filas.map((fila) => fila.id);
}

/* ══════════════════ SUGERENCIAS ══════════════════ */

export type Sugerencia = {
  tipo: "recurso" | "categoria" | "etiqueta" | "creador";
  etiqueta: string;
  /** Texto secundario, solo si aporta algo. */
  detalle?: string;
  href: string;
};

/** Mínimo de caracteres antes de consultar nada. */
export const MINIMO_SUGERENCIA = 2;

/**
 * Sugerencias del buscador.
 *
 * Todo lo que devuelve existe en la base de datos: recursos
 * publicados, categorías con recursos detrás, etiquetas en uso
 * y creadores aprobados con perfil público. No hay sugerencias
 * de relleno ni términos inventados: si no hay nada que
 * ofrecer, la lista vuelve vacía.
 */
export async function obtenerSugerencias(
  texto: string
): Promise<Sugerencia[]> {
  const consulta = texto.trim();

  if (consulta.length < MINIMO_SUGERENCIA) return [];

  const contiene = { contains: consulta, mode: "insensitive" as const };

  const [recursos, categorias, etiquetas, creadores] =
    await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED", name: contiene },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          slug: true,
          name: true,
          category: { select: { name: true } },
        },
      }),

      prisma.category.findMany({
        where: {
          name: contiene,
          products: { some: { status: "PUBLISHED" } },
        },
        orderBy: { name: "asc" },
        take: 3,
        select: { name: true, slug: true },
      }),

      prisma.tag.findMany({
        where: {
          name: contiene,
          // Las estructurales no se sugieren: "pack" ya tiene
          // su propio filtro en la tienda.
          slug: { notIn: [...TAGS_PROTEGIDOS] },
          products: { some: { product: { status: "PUBLISHED" } } },
        },
        orderBy: { name: "asc" },
        take: 4,
        select: { name: true, slug: true },
      }),

      prisma.user.findMany({
        where: {
          creatorStatus: "APPROVED",
          username: { not: null },
          products: { some: { status: "PUBLISHED" } },
          OR: [
            { publicName: contiene },
            { name: contiene },
            { username: contiene },
          ],
        },
        orderBy: { username: "asc" },
        take: 3,
        select: { username: true, name: true, publicName: true },
      }),
    ]);

  return [
    ...recursos.map((recurso) => ({
      tipo: "recurso" as const,
      etiqueta: recurso.name,
      detalle: recurso.category.name,
      href: `/tienda/${recurso.slug}`,
    })),

    ...categorias.map((categoria) => ({
      tipo: "categoria" as const,
      etiqueta: categoria.name,
      href: `/tienda?categoria=${encodeURIComponent(categoria.slug)}`,
    })),

    ...etiquetas.map((etiqueta) => ({
      tipo: "etiqueta" as const,
      etiqueta: etiqueta.name,
      href: `/tienda?tag=${encodeURIComponent(etiqueta.slug)}`,
    })),

    ...creadores.flatMap((creador) =>
      creador.username
        ? [
            {
              tipo: "creador" as const,
              etiqueta:
                creador.publicName || creador.name || creador.username,
              detalle: `@${creador.username}`,
              href: `/creadores/${creador.username}`,
            },
          ]
        : []
    ),
  ];
}

/* ══════════════════ BÚSQUEDAS POPULARES ══════════════════ */

/**
 * Términos sugeridos cuando el buscador está vacío.
 *
 * No hay tabla de historial de búsquedas, así que NO se puede
 * saber qué busca la gente de verdad. En lugar de inventar un
 * ranking, se ofrecen las etiquetas y categorías que más
 * recursos publicados tienen detrás: es un dato real y lleva
 * a listados que nunca salen vacíos.
 */
export async function terminosDestacados(limite = 8): Promise<
  { etiqueta: string; href: string }[]
> {
  const [etiquetas, categorias] = await Promise.all([
    prisma.tag.findMany({
      where: {
        slug: { notIn: [...TAGS_PROTEGIDOS] },
        products: { some: { product: { status: "PUBLISHED" } } },
      },
      orderBy: { products: { _count: "desc" } },
      take: limite,
      select: { name: true, slug: true },
    }),

    prisma.category.findMany({
      where: { products: { some: { status: "PUBLISHED" } } },
      orderBy: { products: { _count: "desc" } },
      take: limite,
      select: { name: true, slug: true },
    }),
  ]);

  return [
    ...etiquetas.map((t) => ({
      etiqueta: t.name,
      href: `/tienda?tag=${encodeURIComponent(t.slug)}`,
    })),

    ...categorias.map((c) => ({
      etiqueta: c.name,
      href: `/tienda?categoria=${encodeURIComponent(c.slug)}`,
    })),
  ].slice(0, limite);
}
