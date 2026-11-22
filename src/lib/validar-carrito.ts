export type ArticuloCarrito = {
  productId: string;
  packId: string;
  collectionId: string;
  quantity: 1;
};

export type ResultadoCarrito =
  | { ok: true; items: ArticuloCarrito[] }
  | { ok: false; error: string; status: number };

/** Rechaza el carrito completo si una sola línea es inválida. */
export function validarCarrito(body: unknown): ResultadoCarrito {
  const items = body && typeof body === "object" && "items" in body
    ? body.items : undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "El carrito está vacío.", status: 400 };
  }
  if (items.length > 50) {
    return { ok: false, error: "El carrito supera el máximo de 50 artículos.", status: 400 };
  }

  const limpios: ArticuloCarrito[] = [];
  const claves = new Set<string>();

  for (const raw of items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "El carrito contiene artículos o cantidades inválidas.", status: 400 };
    }
    const item = raw as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const packId = typeof item.packId === "string" ? item.packId.trim() : "";
    const collectionId = typeof item.collectionId === "string" ? item.collectionId.trim() : "";
    const ids = [productId, packId, collectionId].filter(Boolean);
    if (ids.length !== 1 || item.quantity !== 1) {
      return { ok: false, error: "El carrito contiene artículos o cantidades inválidas.", status: 400 };
    }
    const clave = productId ? `product:${productId}` : packId ? `pack:${packId}` : `collection:${collectionId}`;
    if (claves.has(clave)) {
      return { ok: false, error: "El carrito contiene artículos duplicados.", status: 400 };
    }
    claves.add(clave);
    limpios.push({ productId, packId, collectionId, quantity: 1 });
  }

  return { ok: true, items: limpios };
}
