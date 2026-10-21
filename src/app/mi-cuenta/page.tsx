import { getSession } from "@/lib/session";
import { portadasActivas } from "@/lib/portadas";
import { prisma } from "@/lib/prisma";

import CuentaResumen from "./CuentaResumen";
import InicioCliente, { type CategoriaCx } from "./InicioCliente";

/**
 * /mi-cuenta.
 *
 * El cliente ve su inicio con imágenes (InicioCliente); creador y
 * administrador siguen viendo el resumen de siempre (CuentaResumen),
 * sin cambios. Aquí solo se elige cuál pintar y se le pasan, en
 * lectura, las portadas del slider del Inicio y las categorías.
 */
export default async function MiCuentaPage() {
  const session = await getSession();

  if (session?.role !== "CLIENT") {
    return <CuentaResumen />;
  }

  const [portadas, categorias] = await Promise.all([
    portadasActivas(),
    categoriasPopulares(),
  ]);

  return (
    <InicioCliente
      portadas={portadas.map((p) => ({
        id: p.id,
        imagen: p.imageUrl,
        titulo: p.title,
        href: p.href,
        detalle: [p.categoria, p.precio ? `S/ ${p.precio}` : null]
          .filter(Boolean)
          .join(" · "),
      }))}
      categorias={categorias}
    />
  );
}

/*
  Categorías con recursos publicados, las de más recursos primero.
  Es la misma lectura que hace /categorias (recuento de publicados e
  imagen del recurso más reciente cuando la categoría no tiene
  portada propia); solo lectura, sin cambios en Prisma ni APIs.
*/
async function categoriasPopulares(): Promise<CategoriaCx[]> {
  const filas = await prisma.category.findMany({
    where: { products: { some: { status: "PUBLISHED" } } },
    select: {
      name: true,
      slug: true,
      coverUrl: true,
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      products: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          coverUrl: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return filas
    .map((c) => ({
      slug: c.slug,
      nombre: c.name,
      recursos: c._count.products,
      imagen: c.coverUrl || c.products[0]?.coverUrl || c.products[0]?.images[0]?.url || null,
    }))
    .sort((a, b) => b.recursos - a.recursos)
    .slice(0, 4);
}
