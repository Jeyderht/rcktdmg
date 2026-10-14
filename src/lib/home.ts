import type { Prisma } from "@prisma/client";

import {
  SELECCION_TARJETA,
  construirWhere,
  ordenPrisma,
  type FiltrosCatalogo,
} from "@/lib/catalogo";
import { listarColeccionesPublicas } from "@/lib/colecciones-comerciales";
import { prisma } from "@/lib/prisma";
import { ALTO_VERTICAL, ANCHO_VERTICAL } from "@/lib/dimensiones";

/**
 * Datos de las secciones nuevas de la portada.
 *
 * Una función por sección, todas con `select` mínimo y un tope
 * explícito, para que la Home pueda pedirlas en un solo
 * `Promise.all` sin abrir una consulta por tarjeta.
 *
 * Todo sale del catálogo REAL. Si una categoría no tiene
 * recursos publicados, su sección recibe una lista vacía y no
 * se pinta: nunca se rellena con contenido de ejemplo.
 */

/** Slugs de las categorías que tienen sección propia en la portada. */
export const CATEGORIA_EVENTOS = "eventos";
export const CATEGORIA_GENERAL = "general";

/**
 * Proporción de las stories: 1080 × 1920 · 9:16 (la usa el
 * visor de stories de la ficha del recurso).
 *
 * SE CALCULA a partir de las medidas reales, en vez
 * de escribirse a mano. Antes ponía "9/16" y "4/5" como texto:
 * coincidían con la regla por costumbre, no porque nada lo
 * garantizara. Si un día cambiara la medida exigida, aquellos
 * literales no se habrían enterado.
 */
function proporcion(ancho: number, alto: number): string {
  /* Máximo común divisor, para que 1080 × 1920 se lea "9/16". */
  const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));

  const d = mcd(ancho, alto);

  return `${ancho / d}/${alto / d}`;
}

export const ASPECTO_STORY = proporcion(ANCHO_VERTICAL, ALTO_VERTICAL);

/* ══════════════ CREADORES ══════════════ */

export type CreadorHome = {
  id: string;
  nombre: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  especialidad: string | null;
  recursos: number;
  seguidores: number;
};

/**
 * Creadores para el carrusel de la portada.
 *
 * Mismos criterios que para tener perfil público: rol con
 * perfil, aprobado, con username y con al menos un recurso
 * publicado. Un creador sin nada publicado llevaría a un
 * perfil vacío.
 *
 * La ESPECIALIDAD no es un campo: se deduce de la categoría en
 * la que más publica. Es un dato real derivado de su trabajo,
 * no una etiqueta que alguien escribió. Si no se puede
 * deducir, queda null y la tarjeta no la pinta.
 *
 * Dos consultas en total —creadores y sus categorías— en vez
 * de una por tarjeta.
 */
export async function creadoresDestacados(
  tope = 12
): Promise<CreadorHome[]> {
  const filas = await prisma.user.findMany({
    where: {
      role: { in: ["CREATOR", "ADMIN"] },
      creatorStatus: "APPROVED",
      username: { not: null },
      products: { some: { status: "PUBLISHED" } },
    },
    orderBy: [{ isVerified: "desc" }, { createdAt: "asc" }],
    take: tope,
    select: {
      id: true,
      name: true,
      publicName: true,
      username: true,
      avatarUrl: true,
      coverUrl: true,
      _count: {
        select: {
          products: { where: { status: "PUBLISHED" } },
          seguidores: true,
        },
      },
    },
  });

  if (filas.length === 0) return [];

  /*
    Categoría dominante de cada uno, en UNA consulta agrupada
    para todos, no una por creador.
  */
  const conteos = await prisma.product.groupBy({
    by: ["creatorId", "categoryId"],
    where: {
      status: "PUBLISHED",
      creatorId: { in: filas.map((f) => f.id) },
    },
    _count: { _all: true },
  });

  const categorias = await prisma.category.findMany({
    where: { id: { in: [...new Set(conteos.map((c) => c.categoryId))] } },
    select: { id: true, name: true },
  });

  const nombreDeCategoria = new Map(
    categorias.map((c) => [c.id, c.name])
  );

  const dominante = new Map<string, { categoryId: string; n: number }>();

  for (const fila of conteos) {
    const previo = dominante.get(fila.creatorId);

    if (!previo || fila._count._all > previo.n) {
      dominante.set(fila.creatorId, {
        categoryId: fila.categoryId,
        n: fila._count._all,
      });
    }
  }

  return filas.flatMap((fila) =>
    fila.username
      ? [
          {
            id: fila.id,
            nombre: fila.publicName || fila.name || "Creador",
            username: fila.username,
            avatarUrl: fila.avatarUrl,
            coverUrl: fila.coverUrl,
            especialidad:
              nombreDeCategoria.get(
                dominante.get(fila.id)?.categoryId ?? ""
              ) ?? null,
            recursos: fila._count.products,
            seguidores: fila._count.seguidores,
          },
        ]
      : []
  );
}

/* ══════════ ¿QUÉ ESTÁS BUSCANDO? ══════════ */

/** Una de las dos opciones de «¿Qué estás buscando?». */
export type OpcionQueBuscas = {
  /** Portadas reales más recientes (solo imagen pública). */
  portadas: { id: string; nombre: string; imagen: string }[];
  recursos: number;
  /** Creadores con al menos un recurso publicado en la opción. */
  creadores: number;
  /** Formatos de archivo distintos, en mayúsculas. */
  formatos: string[];
};

/**
 * Datos de «¿Qué estás buscando?».
 *
 * Mismo filtro que los listados a los que lleva cada opción
 * (construirWhere de la tienda): Eventos es
 * /tienda?categoria=eventos y Diseños generales es
 * /tienda?sin=eventos, así que las cifras son las del listado.
 * Solo lectura; con cifra 0 la fila no se pinta.
 */
export async function datosQueBuscas(): Promise<{
  eventos: OpcionQueBuscas;
  generales: OpcionQueBuscas;
}> {
  async function opcion(
    where: Prisma.ProductWhereInput,
    portadas: number
  ): Promise<OpcionQueBuscas> {
    const [recientes, recursos, creadores, formatos] = await Promise.all([
      prisma.product.findMany({
        where: {
          AND: [
            where,
            { OR: [{ coverUrl: { not: null } }, { images: { some: {} } }] },
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: portadas,
        select: {
          id: true,
          name: true,
          coverUrl: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["creatorId"], where }),
      prisma.product.groupBy({
        by: ["fileFormat"],
        where: { AND: [where, { fileFormat: { not: null } }] },
      }),
    ]);

    return {
      portadas: recientes.flatMap((p) => {
        const imagen = p.coverUrl || p.images[0]?.url;
        return imagen ? [{ id: p.id, nombre: p.name, imagen }] : [];
      }),
      recursos,
      creadores: creadores.length,
      formatos: formatos
        .map((f) => (f.fileFormat ?? "").toUpperCase())
        .filter(Boolean)
        .sort(),
    };
  }

  const [eventos, generales] = await Promise.all([
    opcion(construirWhere({ categoria: CATEGORIA_EVENTOS }), 3),
    opcion(construirWhere({ sinCategoria: CATEGORIA_EVENTOS }), 2),
  ]);

  return { eventos, generales };
}

/* ══════════ CATÁLOGO POR CATEGORÍA ══════════ */

const TOPE_CATALOGO = 8;

/**
 * Datos del catálogo por categoría del inicio (Fix 9).
 *
 * Cuatro categorías: Eventos, General, Colecciones y Packs
 * (Corporativos no: es lo mismo que General). Cada una con sus
 * pestañas Recientes, Populares y Packs, con los MISMOS
 * criterios de la tienda (construirWhere + ordenPrisma): el
 * «Ver todo» lleva al listado que contiene exactamente esto.
 * Las colecciones solo tienen orden por fecha. Solo lectura;
 * hasta 8 por pestaña.
 */
export async function datosCatalogoInicio() {
  const recursos = (filtros: FiltrosCatalogo, orden: "recientes" | "populares") =>
    prisma.product.findMany({
      where: construirWhere(filtros),
      orderBy: ordenPrisma(orden),
      take: TOPE_CATALOGO,
      select: SELECCION_TARJETA,
    });

  const eventos = { categoria: CATEGORIA_EVENTOS };
  const general = { categoria: CATEGORIA_GENERAL };

  const [
    eventosRecientes,
    eventosPopulares,
    eventosPacks,
    generalRecientes,
    generalPopulares,
    generalPacks,
    packsRecientes,
    packsPopulares,
    colecciones,
  ] = await Promise.all([
    recursos(eventos, "recientes"),
    recursos(eventos, "populares"),
    recursos({ ...eventos, soloPacks: true }, "recientes"),
    recursos(general, "recientes"),
    recursos(general, "populares"),
    recursos({ ...general, soloPacks: true }, "recientes"),
    recursos({ soloPacks: true }, "recientes"),
    recursos({ soloPacks: true }, "populares"),
    listarColeccionesPublicas(TOPE_CATALOGO),
  ]);

  return {
    eventos: { recientes: eventosRecientes, populares: eventosPopulares, packs: eventosPacks },
    general: { recientes: generalRecientes, populares: generalPopulares, packs: generalPacks },
    packs: { recientes: packsRecientes, populares: packsPopulares },
    colecciones,
  };
}
