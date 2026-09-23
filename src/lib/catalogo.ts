import type { Prisma } from "@prisma/client";

/**
 * Filtros y orden del catálogo, en un solo sitio.
 *
 * Lo usan la tienda y las secciones del inicio. Todo se traduce
 * a condiciones de Prisma: nada se filtra ni se ordena en
 * memoria, para que funcione igual con 8 recursos que con 8.000.
 */

export const TAG_PACK = "pack";

export type OrdenCatalogo =
  | "recientes"
  | "antiguos"
  | "precio-asc"
  | "precio-desc"
  | "nombre-asc"
  | "nombre-desc";

export const ORDENES: {
  valor: OrdenCatalogo;
  etiqueta: string;
}[] = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "antiguos", etiqueta: "Más antiguos" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "nombre-asc", etiqueta: "Nombre: A → Z" },
  { valor: "nombre-desc", etiqueta: "Nombre: Z → A" },
];

export function esOrden(valor: unknown): valor is OrdenCatalogo {
  return ORDENES.some((o) => o.valor === valor);
}

export function ordenPrisma(
  orden: OrdenCatalogo
): Prisma.ProductOrderByWithRelationInput {
  switch (orden) {
    case "antiguos":
      return { createdAt: "asc" };
    case "precio-asc":
      return { price: "asc" };
    case "precio-desc":
      return { price: "desc" };
    case "nombre-asc":
      return { name: "asc" };
    case "nombre-desc":
      return { name: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

/** Tramos de precio. Los importes son soles, como en la base. */
export const RANGOS_PRECIO: {
  valor: string;
  etiqueta: string;
  min?: number;
  max?: number;
}[] = [
  { valor: "gratis", etiqueta: "Gratis", min: 0, max: 0 },
  { valor: "hasta-20", etiqueta: "Hasta S/ 20", min: 0, max: 20 },
  { valor: "20-50", etiqueta: "S/ 20 a S/ 50", min: 20, max: 50 },
  { valor: "50-100", etiqueta: "S/ 50 a S/ 100", min: 50, max: 100 },
  { valor: "mas-100", etiqueta: "Más de S/ 100", min: 100 },
];

/** Colores que el creador puede declarar. */
export const COLORES: { valor: string; etiqueta: string; muestra: string }[] = [
  { valor: "blanco", etiqueta: "Blanco", muestra: "#ffffff" },
  { valor: "negro", etiqueta: "Negro", muestra: "#111114" },
  { valor: "gris", etiqueta: "Gris", muestra: "#9aa0a6" },
  { valor: "beige", etiqueta: "Beige", muestra: "#e3d5c0" },
  { valor: "rojo", etiqueta: "Rojo", muestra: "#d03a3a" },
  { valor: "naranja", etiqueta: "Naranja", muestra: "#e07a2f" },
  { valor: "amarillo", etiqueta: "Amarillo", muestra: "#e6c02f" },
  { valor: "verde", etiqueta: "Verde", muestra: "#3a9d5d" },
  { valor: "azul", etiqueta: "Azul", muestra: "#2f6fe0" },
  { valor: "morado", etiqueta: "Morado", muestra: "#7a4fd0" },
  { valor: "rosa", etiqueta: "Rosa", muestra: "#e05a9a" },
  { valor: "multicolor", etiqueta: "Multicolor", muestra: "" },
];

export function esColor(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    COLORES.some((c) => c.valor === valor)
  );
}

export type FiltrosCatalogo = {
  query?: string;
  categoria?: string;
  formato?: string;
  color?: string;
  precio?: string;
  soloPacks?: boolean;
};

/**
 * Construye el `where` de Prisma.
 *
 * Solo aparecen recursos PUBLISHED: los borradores, los que
 * están en revisión y los rechazados nunca son públicos.
 */
export function construirWhere(
  filtros: FiltrosCatalogo
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };

  if (filtros.categoria) {
    where.category = { slug: filtros.categoria };
  }

  if (filtros.formato) {
    where.fileFormat = filtros.formato.toLowerCase();
  }

  if (filtros.color) {
    where.color = filtros.color;
  }

  if (filtros.soloPacks) {
    where.tags = { some: { tag: { slug: TAG_PACK } } };
  }

  const rango = RANGOS_PRECIO.find((r) => r.valor === filtros.precio);

  if (rango) {
    if (rango.valor === "gratis") {
      where.price = { equals: 0 };
    } else {
      where.price = {
        ...(rango.min !== undefined ? { gt: rango.min } : {}),
        ...(rango.max !== undefined ? { lte: rango.max } : {}),
      };
    }
  }

  if (filtros.query) {
    where.OR = [
      { name: { contains: filtros.query, mode: "insensitive" } },
      { description: { contains: filtros.query, mode: "insensitive" } },
      {
        category: {
          name: { contains: filtros.query, mode: "insensitive" },
        },
      },
    ];
  }

  return where;
}

/** Campos que necesitan las tarjetas, sin traer de más. */
export const SELECCION_TARJETA = {
  id: true,
  name: true,
  slug: true,
  price: true,
  coverUrl: true,
  fileFormat: true,
  color: true,
  createdAt: true,

  category: { select: { name: true, slug: true } },

  creator: {
    select: {
      name: true,
      publicName: true,
      username: true,
      creatorStatus: true,
    },
  },

  images: {
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { url: true, alt: true },
  },

  tags: {
    where: { tag: { slug: TAG_PACK } },
    select: { tagId: true },
  },
} satisfies Prisma.ProductSelect;

type ProductoTarjeta = Prisma.ProductGetPayload<{
  select: typeof SELECCION_TARJETA;
}>;

/** Traduce una fila de Prisma a las props de ProductCard. */
export function aTarjeta(producto: ProductoTarjeta) {
  return {
    id: producto.id,
    name: producto.name,
    slug: producto.slug,
    price: Number(producto.price),
    coverUrl: producto.coverUrl,
    image: producto.images[0] ?? null,
    category: producto.category,
    fileFormat: producto.fileFormat,
    esPack: producto.tags.length > 0,
    creator: {
      name:
        producto.creator.publicName ||
        producto.creator.name ||
        "Creador",
      username:
        producto.creator.creatorStatus === "APPROVED"
          ? producto.creator.username
          : null,
    },
  };
}

/**
 * Parámetros de URL que entiende la tienda.
 *
 * La URL es la única fuente de verdad del catálogo: cualquier
 * filtro se puede compartir, guardar y deshacer con el botón
 * de atrás del navegador.
 */
export type ParametrosTienda = {
  q?: string;
  categoria?: string;
  formato?: string;
  color?: string;
  precio?: string;
  /** "true" cuando se piden únicamente packs. */
  pack?: string;
  sort?: string;
};

/** Limpia los parámetros crudos de la URL. */
export function leerParametros(
  crudos: Record<string, string | string[] | undefined>
): ParametrosTienda {
  const texto = (valor: string | string[] | undefined) =>
    typeof valor === "string" && valor.trim() ? valor.trim() : undefined;

  const precio = texto(crudos.precio);
  const sort = texto(crudos.sort);

  return {
    q: texto(crudos.q),
    categoria: texto(crudos.categoria),
    // El formato se guarda siempre en minúsculas.
    formato: texto(crudos.formato)?.toLowerCase(),
    color: esColor(texto(crudos.color)) ? texto(crudos.color) : undefined,
    precio: RANGOS_PRECIO.some((r) => r.valor === precio)
      ? precio
      : undefined,
    pack: texto(crudos.pack) === "true" ? "true" : undefined,
    sort: esOrden(sort) ? sort : undefined,
  };
}

/** Traduce los parámetros de URL a filtros de consulta. */
export function filtrosDesde(
  parametros: ParametrosTienda
): FiltrosCatalogo {
  return {
    query: parametros.q,
    categoria: parametros.categoria,
    formato: parametros.formato,
    color: parametros.color,
    precio: parametros.precio,
    soloPacks: parametros.pack === "true",
  };
}

/** true si hay algún filtro aplicado además del orden. */
export function hayFiltros(parametros: ParametrosTienda): boolean {
  return Boolean(
    parametros.q ||
      parametros.categoria ||
      parametros.formato ||
      parametros.color ||
      parametros.precio ||
      parametros.pack
  );
}

/** Construye una URL de tienda conservando el resto de filtros. */
export function urlTienda(
  actuales: ParametrosTienda,
  cambios: Partial<ParametrosTienda> = {}
) {
  const search = new URLSearchParams();

  for (const [clave, valor] of Object.entries({
    ...actuales,
    ...cambios,
  })) {
    if (valor) search.set(clave, valor);
  }

  const cadena = search.toString();

  return cadena ? `/tienda?${cadena}` : "/tienda";
}
