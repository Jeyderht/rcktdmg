import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { absoluta } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Sitemap.
 *
 * Solo contenido público e indexable, leído de la base real.
 *
 * RENDIMIENTO
 *
 * Cuatro consultas agrupadas en paralelo, una por tipo de
 * contenido, con `select` mínimo y un tope por tipo. Nunca una
 * consulta por elemento: el sitemap es justo el sitio donde un
 * N+1 pasa desapercibido hasta que el catálogo crece.
 *
 * QUÉ NO ENTRA
 *
 * Recursos que no estén PUBLISHED, packs que no estén
 * PUBLISHED, creadores sin perfil público, y todas las rutas
 * privadas o no indexables: carrito, login, registro,
 * colecciones, mi-cuenta, admin, panel de creador y API.
 */

const TOPE = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, packs, colecciones, creadores, categorias] =
    await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: TOPE,
    }),

    prisma.pack.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: TOPE,
    }),

    /*
      Colecciones COMERCIALES, no las personales. Las personales
      viven en /colecciones/[id], llevan `noindex` y no entran
      aquí: son listas privadas que su dueño comparte con quien
      quiere, no páginas del catálogo.
    */
    prisma.commercialCollection.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: TOPE,
    }),

    /*
      Mismo criterio que usa /creadores/[username] para existir:
      rol con perfil, aprobado, con username y con al menos un
      recurso publicado. Un perfil sin nada publicado sería una
      página vacía en el índice.
    */
    prisma.user.findMany({
      where: {
        role: { in: ["CREATOR", "ADMIN"] },
        creatorStatus: "APPROVED",
        username: { not: null },
        products: { some: { status: "PUBLISHED" } },
      },
      select: { username: true, updatedAt: true },
      take: TOPE,
    }),

    /*
      Las categorías no tienen página propia: se navegan como
      un filtro de la tienda. Se incluyen esas URLs porque son
      listados reales y estables, no combinaciones de filtros.
    */
    prisma.category.findMany({
      where: { products: { some: { status: "PUBLISHED" } } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const ahora = new Date();

  const fijas: MetadataRoute.Sitemap = [
    { url: absoluta("/"), lastModified: ahora, changeFrequency: "daily", priority: 1 },
    { url: absoluta("/tienda"), lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
    { url: absoluta("/packs"), lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluta("/colecciones-comerciales"), lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluta("/creadores/unete"), lastModified: ahora, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluta("/categorias"), lastModified: ahora, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluta("/creadores"), lastModified: ahora, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluta("/tags"), lastModified: ahora, changeFrequency: "weekly", priority: 0.5 },
    { url: absoluta("/planes"), lastModified: ahora, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...fijas,

    ...productos.map((p) => ({
      url: absoluta(`/tienda/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    ...packs.map((p) => ({
      url: absoluta(`/packs/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),

    ...colecciones.map((c) => ({
      url: absoluta(`/colecciones-comerciales/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),

    ...creadores.flatMap((c) =>
      c.username
        ? [
            {
              url: absoluta(`/creadores/${c.username}`),
              lastModified: c.updatedAt,
              changeFrequency: "weekly" as const,
              priority: 0.6,
            },
          ]
        : []
    ),

    ...categorias.map((c) => ({
      url: absoluta(`/tienda?categoria=${encodeURIComponent(c.slug)}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
