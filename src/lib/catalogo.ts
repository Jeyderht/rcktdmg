import type { Prisma } from "@prisma/client";

/**
 * Filtros y orden del catálogo, en un solo sitio.
 *
 * Lo usan la tienda y las secciones del inicio. Todo se traduce
 * a condiciones de Prisma: nada se filtra ni se ordena en
 * memoria, para que funcione igual con 8 recursos que con 8.000.
 */

export const TAG_PACK = "pack";

/** Recursos por página en la tienda. */
export const POR_PAGINA = 20;

export type OrdenCatalogo =
  | "relevancia"
  | "recientes"
  | "antiguos"
  | "populares"
  | "descargas"
  | "valoracion"
  | "precio-asc"
  | "precio-desc"
  | "nombre-asc"
  | "nombre-desc";

export const ORDENES: {
  valor: OrdenCatalogo;
  etiqueta: string;
  /** true si solo tiene sentido cuando hay texto buscado. */
  soloConBusqueda?: boolean;
}[] = [
  {
    valor: "relevancia",
    etiqueta: "Relevancia",
    soloConBusqueda: true,
  },
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "antiguos", etiqueta: "Más antiguos" },
  { valor: "populares", etiqueta: "Más guardados" },
  { valor: "descargas", etiqueta: "Más descargados" },
  { valor: "valoracion", etiqueta: "Mejor valorados" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "nombre-asc", etiqueta: "Nombre: A → Z" },
  { valor: "nombre-desc", etiqueta: "Nombre: Z → A" },
];

export function esOrden(valor: unknown): valor is OrdenCatalogo {
  return ORDENES.some((o) => o.valor === valor);
}

/** Órdenes ofrecidas para unos parámetros dados. */
export function ordenesDisponibles(hayBusqueda: boolean) {
  return ORDENES.filter((o) => !o.soloConBusqueda || hayBusqueda);
}

/**
 * Orden por defecto: relevancia cuando se ha buscado algo,
 * y lo más reciente cuando solo se navega.
 */
export function ordenPorDefecto(
  hayBusqueda: boolean
): OrdenCatalogo {
  return hayBusqueda ? "relevancia" : "recientes";
}

/**
 * Orden efectivo.
 *
 * "Relevancia" sin texto buscado no significa nada, así que
 * degrada a "recientes" en lugar de ordenar al azar.
 */
export function ordenEfectivo(
  sort: string | undefined,
  hayBusqueda: boolean
): OrdenCatalogo {
  const pedido = esOrden(sort) ? sort : ordenPorDefecto(hayBusqueda);

  return pedido === "relevancia" && !hayBusqueda
    ? "recientes"
    : pedido;
}

export function ordenPrisma(
  orden: OrdenCatalogo
): Prisma.ProductOrderByWithRelationInput[] {
  switch (orden) {
    case "antiguos":
      return [{ createdAt: "asc" }];
    case "precio-asc":
      return [{ price: "asc" }];
    case "precio-desc":
      return [{ price: "desc" }];
    case "nombre-asc":
      return [{ name: "asc" }];
    case "nombre-desc":
      return [{ name: "desc" }];

    /*
      "Más guardados" y "Más descargados" cuentan filas reales
      de Favorite y Download. Cuando dos recursos empatan —muy
      probable con pocos datos— decide la fecha, de modo que
      el orden sea estable entre páginas y no repita ni pierda
      recursos al paginar.
    */
    case "populares":
      return [{ favorites: { _count: "desc" } }, { createdAt: "desc" }];
    case "descargas":
      return [{ downloads: { _count: "desc" } }, { createdAt: "desc" }];

    /*
      Los recursos sin valorar van al final, no al principio:
      "mejor valorados" con avgRating en null encabezando la
      lista sería justo lo contrario de lo que se pide.
    */
    case "valoracion":
      return [
        { avgRating: { sort: "desc", nulls: "last" } },
        { reviewCount: "desc" },
        { createdAt: "desc" },
      ];

    default:
      return [{ createdAt: "desc" }];
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
  /** Slug de etiqueta, ya normalizado. */
  tag?: string;
  formato?: string;
  color?: string;
  precio?: string;
  soloPacks?: boolean;
  /**
   * Categoría que se EXCLUYE del listado.
   *
   * Existe para que "Diseños generales" signifique de verdad
   * "todo menos eventos". Sin esto, los dos caminos del
   * selector de la portada llevaban a listados que se
   * solapaban y las etiquetas no decían la verdad.
   */
  sinCategoria?: string;
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
  } else if (filtros.sinCategoria) {
    // Excluir e incluir a la vez no tiene sentido: si se pide
    // una categoría concreta, esa manda.
    where.category = { slug: { not: filtros.sinCategoria } };
  }

  if (filtros.formato) {
    where.fileFormat = filtros.formato.toLowerCase();
  }

  if (filtros.color) {
    where.color = filtros.color;
  }

  /*
    Packs y etiqueta pueden pedirse a la vez ("solo packs que
    además sean de Navidad"), así que se acumulan en AND en
    lugar de pisarse el uno al otro sobre `where.tags`.
  */
  const condicionesTags: Prisma.ProductWhereInput[] = [];

  if (filtros.soloPacks) {
    condicionesTags.push({
      tags: { some: { tag: { slug: TAG_PACK } } },
    });
  }

  if (filtros.tag) {
    condicionesTags.push({
      tags: { some: { tag: { slug: filtros.tag } } },
    });
  }

  if (condicionesTags.length > 0) {
    where.AND = condicionesTags;
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

  /*
    Búsqueda por texto.

    Los `contains` insensibles se traducen a ILIKE '%texto%'.
    Desde la migración de pg_trgm, los índices GIN con
    gin_trgm_ops sobre Product.name, Product.description,
    Category.name y Tag.name permiten a Postgres resolverlos
    con índice en lugar de recorrer la tabla entera.

    Este `where` cubre el filtrado. La ORDENACIÓN por
    relevancia no cabe en Prisma y vive en src/lib/busqueda.ts,
    que usa las mismas cuatro columnas.
  */
  if (filtros.query) {
    const texto = filtros.query;

    where.OR = [
      { name: { contains: texto, mode: "insensitive" } },
      { description: { contains: texto, mode: "insensitive" } },
      { category: { name: { contains: texto, mode: "insensitive" } } },
      {
        tags: {
          some: {
            tag: { name: { contains: texto, mode: "insensitive" } },
          },
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
  /* Con la categoría, decide la proporción del marco. */
  pieceType: true,
  createdAt: true,
  avgRating: true,
  reviewCount: true,

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
    pieceType: producto.pieceType,
    fileFormat: producto.fileFormat,
    esPack: producto.tags.length > 0,
    // null si todavía no tiene reseñas publicadas.
    avgRating: producto.avgRating ? Number(producto.avgRating) : null,
    reviewCount: producto.reviewCount,
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
  /** Slug de etiqueta. */
  tag?: string;
  formato?: string;
  color?: string;
  precio?: string;
  /** "true" cuando se piden únicamente packs. */
  pack?: string;
  /** Slug de la categoría que se deja fuera del listado. */
  sin?: string;
  sort?: string;
  /** Página actual, como texto. Ausente significa la 1. */
  page?: string;
};

/** Claves de filtro: cambiar cualquiera devuelve a la página 1. */
const CLAVES_FILTRO = [
  "q",
  "categoria",
  "tag",
  "formato",
  "color",
  "precio",
  "pack",
] as const;

/** Limpia los parámetros crudos de la URL. */
export function leerParametros(
  crudos: Record<string, string | string[] | undefined>
): ParametrosTienda {
  const texto = (valor: string | string[] | undefined) =>
    typeof valor === "string" && valor.trim() ? valor.trim() : undefined;

  const precio = texto(crudos.precio);
  const sort = texto(crudos.sort);

  /*
    Se aceptan también los nombres en inglés al LEER, porque
    hay enlaces compartidos con esa forma. La URL que genera
    la aplicación usa siempre la forma canónica en español,
    para no tener dos URLs distintas del mismo listado.
  */
  const pagina = Number(texto(crudos.page) ?? "1");

  return {
    q: texto(crudos.q),
    categoria: texto(crudos.categoria) ?? texto(crudos.category),
    tag: texto(crudos.tag)?.toLowerCase(),
    // El formato se guarda siempre en minúsculas.
    formato: (texto(crudos.formato) ?? texto(crudos.format))?.toLowerCase(),
    color: esColor(texto(crudos.color)) ? texto(crudos.color) : undefined,
    precio: RANGOS_PRECIO.some((r) => r.valor === precio)
      ? precio
      : undefined,
    pack: texto(crudos.pack) === "true" ? "true" : undefined,
    sin: texto(crudos.sin)?.toLowerCase(),
    sort: esOrden(sort) ? sort : undefined,
    // Una página inválida, negativa o enorme no rompe nada.
    page:
      Number.isFinite(pagina) && pagina > 1
        ? String(Math.floor(pagina))
        : undefined,
  };
}

/** Número de página, siempre 1 o mayor. */
export function paginaActual(parametros: ParametrosTienda): number {
  const valor = Number(parametros.page ?? "1");

  return Number.isFinite(valor) && valor > 1 ? Math.floor(valor) : 1;
}

/** Traduce los parámetros de URL a filtros de consulta. */
export function filtrosDesde(
  parametros: ParametrosTienda
): FiltrosCatalogo {
  return {
    query: parametros.q,
    categoria: parametros.categoria,
    tag: parametros.tag,
    formato: parametros.formato,
    color: parametros.color,
    precio: parametros.precio,
    soloPacks: parametros.pack === "true",
    sinCategoria: parametros.sin,
  };
}

/** true si hay algún filtro aplicado además del orden. */
export function hayFiltros(parametros: ParametrosTienda): boolean {
  return CLAVES_FILTRO.some((clave) => Boolean(parametros[clave]));
}

/**
 * Construye una URL de tienda conservando el resto de filtros.
 *
 * Al tocar cualquier filtro se vuelve a la página 1: seguir en
 * la página 7 de un listado que ahora tiene 2 llevaría a una
 * pantalla vacía. El orden cuenta igual, porque reordenar el
 * listado entero deja sin sentido la página en la que estabas.
 * Para navegar entre páginas basta con pasar `page` de forma
 * explícita.
 */
export function urlTienda(
  actuales: ParametrosTienda,
  cambios: Partial<ParametrosTienda> = {}
) {
  const cambiaAlgunFiltro = ([...CLAVES_FILTRO, "sort"] as const).some(
    (clave) => clave in cambios && cambios[clave] !== actuales[clave]
  );

  const siguientes: ParametrosTienda = {
    ...actuales,
    ...cambios,
  };

  if (cambiaAlgunFiltro && !("page" in cambios)) {
    siguientes.page = undefined;
  }

  const search = new URLSearchParams();

  for (const [clave, valor] of Object.entries(siguientes)) {
    if (valor) search.set(clave, valor);
  }

  const cadena = search.toString();

  return cadena ? `/tienda?${cadena}` : "/tienda";
}

/**
 * Números de página que se pintan en el paginador.
 *
 * Siempre aparecen la primera y la última, más una ventana
 * alrededor de la actual. Los saltos se marcan con null para
 * que la interfaz dibuje una elipsis.
 */
export function numerosDePagina(
  actual: number,
  total: number,
  ventana = 1
): (number | null)[] {
  if (total <= 1) return [1];

  const numeros = new Set<number>([1, total]);

  for (let i = actual - ventana; i <= actual + ventana; i += 1) {
    if (i >= 1 && i <= total) numeros.add(i);
  }

  const ordenados = [...numeros].sort((a, b) => a - b);

  const salida: (number | null)[] = [];

  for (const [indice, numero] of ordenados.entries()) {
    const anterior = ordenados[indice - 1];

    if (anterior !== undefined && numero - anterior > 1) {
      salida.push(null);
    }

    salida.push(numero);
  }

  return salida;
}
