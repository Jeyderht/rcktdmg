import { prisma } from "@/lib/prisma";
import {
  esTagProtegido,
  normalizarListaTags,
  type TagNormalizado,
} from "@/lib/tags-comun";

/**
 * Etiquetas de recurso: operaciones sobre la base de datos.
 *
 * Las funciones puras (normalización, slug, protección) están
 * en src/lib/tags-comun.ts y se reexportan aquí, de modo que
 * el resto del código puede seguir importando todo desde
 * "@/lib/tags" sin enterarse del corte.
 */

export * from "@/lib/tags-comun";

/**
 * Devuelve el id de cada etiqueta, creándola si aún no existe.
 *
 * Se busca por slug, nunca por nombre: así "Navidad" y
 * "navidad" reutilizan la misma fila en lugar de duplicarla.
 * Si la etiqueta ya existía, su nombre NO se toca: el creador
 * de un recurso no puede renombrar una etiqueta compartida
 * por todo el catálogo.
 */
export async function obtenerOCrearTags(
  entradas: TagNormalizado[]
): Promise<string[]> {
  if (entradas.length === 0) return [];

  const existentes = await prisma.tag.findMany({
    where: { slug: { in: entradas.map((e) => e.slug) } },
    select: { id: true, slug: true },
  });

  const porSlug = new Map(existentes.map((t) => [t.slug, t.id]));

  const ids: string[] = [];

  for (const entrada of entradas) {
    const yaEsta = porSlug.get(entrada.slug);

    if (yaEsta) {
      ids.push(yaEsta);
      continue;
    }

    /*
      Dos recursos pueden crear la misma etiqueta a la vez.
      El upsert por slug hace que el segundo reutilice la
      fila del primero en lugar de fallar por índice único.
    */
    const creada = await prisma.tag.upsert({
      where: { slug: entrada.slug },
      update: {},
      create: { name: entrada.nombre, slug: entrada.slug },
      select: { id: true },
    });

    porSlug.set(entrada.slug, creada.id);
    ids.push(creada.id);
  }

  return ids;
}

/**
 * Deja un recurso exactamente con las etiquetas indicadas.
 *
 * Las etiquetas protegidas quedan fuera de la operación en
 * los dos sentidos: no se pueden añadir desde aquí y, sobre
 * todo, NO se borran aunque no vengan en la lista. Sin esta
 * salvaguarda, guardar el formulario de un pack sin tocar
 * nada le quitaría la etiqueta `pack` y dejaría de ser un
 * pack en toda la tienda.
 */
export async function sincronizarTagsProducto(
  productId: string,
  nombres: unknown
): Promise<void> {
  const deseadas = normalizarListaTags(nombres).filter(
    (t) => !esTagProtegido(t.slug)
  );

  const idsDeseados = await obtenerOCrearTags(deseadas);

  const actuales = await prisma.productTag.findMany({
    where: { productId },
    select: { tagId: true, tag: { select: { slug: true } } },
  });

  const aBorrar = actuales
    .filter(
      (fila) =>
        !esTagProtegido(fila.tag.slug) &&
        !idsDeseados.includes(fila.tagId)
    )
    .map((fila) => fila.tagId);

  const yaPuestos = new Set(actuales.map((fila) => fila.tagId));

  const aCrear = idsDeseados.filter((id) => !yaPuestos.has(id));

  await prisma.$transaction([
    ...(aBorrar.length > 0
      ? [
          prisma.productTag.deleteMany({
            where: { productId, tagId: { in: aBorrar } },
          }),
        ]
      : []),

    ...aCrear.map((tagId) =>
      prisma.productTag.create({ data: { productId, tagId } })
    ),
  ]);
}
