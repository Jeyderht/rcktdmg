import { prisma } from "@/lib/prisma";

/**
 * Qué ha comprado ya una persona.
 *
 * Existe para responder una sola pregunta en todo el sitio:
 * «¿esto ya es suyo?». De ella dependen el botón de la ficha,
 * el de la colección, el carrito y el propio pedido, y antes
 * cada uno decidía por su cuenta —o no decidía nada—.
 *
 * La fuente de verdad es `OrderItem` dentro de un pedido
 * PAGADO. No `Download`, que puede archivarse o caducar, ni
 * `License`, que puede revocarse: lo que no cambia es que la
 * compra ocurrió. Un pedido devuelto (REFUNDED) deja de
 * contar, que es justamente lo que se espera de una
 * devolución.
 *
 * Nada aquí escribe. Se puede llamar desde cualquier página
 * sin miedo a efectos.
 */

/** ¿Ya compró este recurso suelto? */
export async function tieneProducto(
  userId: string | null | undefined,
  productId: string
): Promise<boolean> {
  if (!userId) return false;

  const linea = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: "PAID" } },
    select: { id: true },
  });

  return Boolean(linea);
}

/** ¿Ya compró esta colección comercial? */
export async function tieneColeccion(
  userId: string | null | undefined,
  collectionId: string
): Promise<boolean> {
  if (!userId) return false;

  const linea = await prisma.orderItem.findFirst({
    where: {
      commercialCollectionId: collectionId,
      order: { userId, status: "PAID" },
    },
    select: { id: true },
  });

  return Boolean(linea);
}

/**
 * Filtra una lista de ids dejando los que YA son suyos.
 *
 * La usa el pedido para rechazar una compra repetida antes de
 * crear nada, que es el único momento en que impedirla sirve
 * de algo.
 */
export async function yaAdquiridos(
  userId: string,
  ids: {
    productIds?: string[];
    packIds?: string[];
    collectionIds?: string[];
  }
): Promise<{
  productos: string[];
  packs: string[];
  colecciones: string[];
}> {
  const productIds = ids.productIds ?? [];
  const packIds = ids.packIds ?? [];
  const collectionIds = ids.collectionIds ?? [];

  if (!productIds.length && !packIds.length && !collectionIds.length) {
    return { productos: [], packs: [], colecciones: [] };
  }

  const lineas = await prisma.orderItem.findMany({
    where: {
      order: { userId, status: "PAID" },
      OR: [
        ...(productIds.length ? [{ productId: { in: productIds } }] : []),
        ...(packIds.length ? [{ packId: { in: packIds } }] : []),
        ...(collectionIds.length
          ? [{ commercialCollectionId: { in: collectionIds } }]
          : []),
      ],
    },
    select: {
      productId: true,
      packId: true,
      commercialCollectionId: true,
    },
  });

  const productos = new Set<string>();
  const packs = new Set<string>();
  const colecciones = new Set<string>();

  for (const linea of lineas) {
    if (productIds.includes(linea.productId)) productos.add(linea.productId);

    if (linea.packId && packIds.includes(linea.packId)) {
      packs.add(linea.packId);
    }

    if (
      linea.commercialCollectionId &&
      collectionIds.includes(linea.commercialCollectionId)
    ) {
      colecciones.add(linea.commercialCollectionId);
    }
  }

  return {
    productos: [...productos],
    packs: [...packs],
    colecciones: [...colecciones],
  };
}
