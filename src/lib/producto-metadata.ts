import { prisma } from "@/lib/prisma";
import { TAG_PACK, esColor } from "@/lib/catalogo";

/**
 * Metadatos de recurso que se derivan del servidor.
 *
 * El formato NO lo escribe el creador: se deduce del archivo
 * que sube, así que siempre coincide con lo que realmente se
 * descarga. El color sí lo elige, pero solo entre los valores
 * conocidos de la paleta.
 */

/** Extensión real del archivo, en minúsculas y sin punto. */
export function formatoDesdeUrl(
  fileUrl: string | null | undefined
): string | null {
  if (!fileUrl) return null;

  let nombre = fileUrl.split("?")[0].split("/").pop() || "";

  try {
    nombre = decodeURIComponent(nombre);
  } catch {
    /* se usa tal cual */
  }

  const punto = nombre.lastIndexOf(".");

  if (punto < 0) return null;

  const extension = nombre.slice(punto + 1).toLowerCase();

  // Una "extensión" larga o con símbolos no es una extensión.
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : null;
}

/** Color aceptado, o null si no llega uno de la paleta. */
export function colorValido(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;

  const limpio = valor.trim().toLowerCase();

  return esColor(limpio) ? limpio : null;
}

/**
 * Pone o quita la etiqueta "pack" de un recurso.
 *
 * La etiqueta se crea la primera vez que alguien la necesita;
 * el resto de etiquetas del recurso no se tocan.
 */
export async function aplicarEtiquetaPack(
  productId: string,
  esPack: boolean
): Promise<void> {
  if (esPack) {
    const tag = await prisma.tag.upsert({
      where: { slug: TAG_PACK },
      update: {},
      create: { name: "Pack", slug: TAG_PACK },
    });

    await prisma.productTag.upsert({
      where: { productId_tagId: { productId, tagId: tag.id } },
      update: {},
      create: { productId, tagId: tag.id },
    });

    return;
  }

  const tag = await prisma.tag.findUnique({
    where: { slug: TAG_PACK },
    select: { id: true },
  });

  if (!tag) return;

  await prisma.productTag.deleteMany({
    where: { productId, tagId: tag.id },
  });
}
