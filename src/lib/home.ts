import type { TipoPieza } from "@/lib/tipos-publicacion";
import { prisma } from "@/lib/prisma";
import {
  ALTO_CORPORATIVO,
  ALTO_VERTICAL,
  ANCHO_CORPORATIVO,
  ANCHO_VERTICAL,
} from "@/lib/dimensiones";

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
export const CATEGORIA_CORPORATIVOS = "corporativos";

/** Recurso tal y como lo pintan las secciones nuevas. */
export type TarjetaHome = {
  id: string;
  name: string;
  slug: string;
  price: number;
  /** Imagen pública. Nunca una referencia del almacén privado. */
  imagen: string | null;
  /** Tamaño real de esa imagen. Null si no se conoce. */
  ancho: number | null;
  alto: number | null;
  categoria: { name: string; slug: string } | null;
  creador: {
    nombre: string;
    /** Solo si tiene perfil público real; si no, null y no se enlaza. */
    username: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
};

const SELECCION = {
  id: true,
  name: true,
  slug: true,
  price: true,
  coverUrl: true,
  coverWidth: true,
  coverHeight: true,
  category: { select: { name: true, slug: true } },
  creator: {
    select: {
      name: true,
      publicName: true,
      username: true,
      avatarUrl: true,
      isVerified: true,
      creatorStatus: true,
    },
  },
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true, imageWidth: true, imageHeight: true },
  },
};

type Fila = {
  id: string;
  name: string;
  slug: string;
  price: unknown;
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  category: { name: string; slug: string } | null;
  creator: {
    name: string | null;
    publicName: string | null;
    username: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    creatorStatus: string | null;
  };
  images: {
    url: string;
    imageWidth: number | null;
    imageHeight: number | null;
  }[];
};

function aTarjetaHome(fila: Fila): TarjetaHome {
  return {
    id: fila.id,
    name: fila.name,
    slug: fila.slug,
    price: Number(fila.price),
    /*
      La imagen sale de ProductImage o de la portada, que son
      las dos públicas. `fileUrl` —el archivo que se vende—
      vive en el almacén privado y no se toca aquí.
    */
    imagen: fila.images[0]?.url ?? fila.coverUrl ?? null,
    /*
      Las dimensiones acompañan SIEMPRE a la imagen elegida.
      Si se pinta la de galería, van las suyas; si se pinta la
      portada, las de la portada. Mezclarlas daría una
      proporción falsa.
    */
    ancho: fila.images[0]
      ? fila.images[0].imageWidth
      : fila.coverWidth,
    alto: fila.images[0]
      ? fila.images[0].imageHeight
      : fila.coverHeight,
    categoria: fila.category,
    creador: {
      nombre: fila.creator.publicName || fila.creator.name || "Creador",
      username:
        fila.creator.creatorStatus === "APPROVED"
          ? fila.creator.username
          : null,
      avatarUrl: fila.creator.avatarUrl,
      isVerified: fila.creator.isVerified,
    },
  };
}

/**
 * Recursos publicados de una categoría, los más recientes.
 *
 * `soloConImagen` lo usan las Stories: una story ES la imagen,
 * así que un recurso sin ninguna no tiene nada que enseñar.
 * En lugar de inventarle una portada, se queda fuera.
 */
async function porCategoria(
  slug: string,
  tope: number,
  soloConImagen: boolean,
  /** Cuando se indica, solo esa pieza. */
  pieza?: TipoPieza
): Promise<TarjetaHome[]> {
  const filas = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      category: { slug },
      ...(pieza ? { pieceType: pieza } : {}),
      ...(soloConImagen
        ? {
            OR: [
              { images: { some: {} } },
              { coverUrl: { not: null } },
            ],
          }
        : {}),
    },
    // El id cierra el orden para que no dependa del azar.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: tope,
    select: SELECCION,
  });

  return (filas as Fila[]).map(aTarjetaHome);
}

/** Toda la categoría Eventos, para su propia sección. */
export function flyersDeEventos(tope = 12): Promise<TarjetaHome[]> {
  return porCategoria(CATEGORIA_EVENTOS, tope, true);
}

/**
 * Recursos VERTICALES, para el visor de stories.
 *
 * «Story» no es una categoría, es una forma: 1080 × 1920, que
 * es lo que el visor a pantalla completa sabe enseñar sin
 * recortar ni deformar. Por eso el filtro va contra las
 * dimensiones REALES guardadas al subir la imagen, no contra
 * la categoría ni contra el `pieceType`.
 *
 * Eso mantiene separadas dos ideas que no son la misma:
 *
 *   · Eventos  es una CATEGORÍA, y toda ella mide 1080 × 1920,
 *     así que entra entera aquí.
 *   · Story    es un FORMATO, y lo cumple cualquier recurso
 *     vertical, sea de la categoría que sea.
 *
 * Antes esta sección pedía `pieceType: "EVENT_STORY"` y dejaba
 * fuera recursos que encajan perfectamente en el visor. Y un
 * recurso sin dimensiones leídas queda fuera a propósito: sin
 * el dato no se puede afirmar que sea vertical.
 */
export function recursosVerticales(tope = 12): Promise<TarjetaHome[]> {
  return prisma.product
    .findMany({
      where: {
        status: "PUBLISHED",
        coverWidth: ANCHO_VERTICAL,
        coverHeight: ALTO_VERTICAL,
        OR: [{ images: { some: {} } }, { coverUrl: { not: null } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: tope,
      select: SELECCION,
    })
    .then((filas) => (filas as Fila[]).map(aTarjetaHome));
}

/**
 * Proporción de cada sección. NO se mezclan.
 *
 *   Stories      1080 × 1920 · 9:16 · vertical de historia
 *   Corporativos 1080 × 1350 · 4:5  · vertical de publicación
 *
 * Están aquí, en un solo sitio, porque antes la tira de
 * Stories usaba 4:5 —la de Corporativos— y las dos secciones
 * se veían con la misma forma pese a ser formatos distintos.
 *
 * Y ahora SE CALCULAN a partir de las medidas reales, en vez
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
export const ASPECTO_CORPORATIVO = proporcion(
  ANCHO_CORPORATIVO,
  ALTO_CORPORATIVO
);

/**
 * Recursos para el carrusel de Corporativos.
 *
 * Solo categoría Corporativos con formato 1080 × 1350 exacto.
 * Si no hay ninguno se devuelve la lista vacía y la sección se
 * oculta entera: una sección de Corporativos que enseña
 * recursos de otra categoría no dice la verdad, por mucho que
 * lo aclare un rótulo.
 */
export async function corporativosParaSlice(
  tope = 9
): Promise<{ recursos: TarjetaHome[] }> {
  return { recursos: await recursosCorporativos(tope) };
}

/**
 * Recursos para el visor de stories de la portada.
 *
 * La sección va por FORMATO, no por categoría: entra todo lo
 * publicado que mida 1080 × 1920, venga de donde venga. La
 * categoría Eventos entra entera —toda ella mide eso— y
 * también cualquier vertical de otra categoría, porque el
 * visor solo necesita que la pieza sea 9:16.
 *
 * Si no hay ningún recurso vertical publicado se devuelve
 * vacío y la sección desaparece. No se rellena con recursos de
 * otro formato.
 */
export async function flyersParaStories(
  tope = 12
): Promise<{ flyers: TarjetaHome[] }> {
  return { flyers: await recursosVerticales(tope) };
}

/**
 * Recursos corporativos para el carrusel en perspectiva.
 *
 * Solo los que miden REALMENTE 1080 × 1350. El filtro va
 * contra las dimensiones guardadas al subir la imagen, no
 * contra el nombre del archivo ni contra "es más alto que
 * ancho": un 1080 × 1080 y un 1080 × 1920 quedan fuera, que es
 * justo lo que se pide.
 *
 * Un recurso cuyas dimensiones no se pudieron leer queda
 * fuera también. Es deliberado: sin el dato no se puede
 * afirmar que cumple el formato.
 */
export async function recursosCorporativos(
  tope = 9
): Promise<TarjetaHome[]> {
  const filas = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      category: { slug: CATEGORIA_CORPORATIVOS },
      OR: [
        {
          images: {
            some: {
              imageWidth: ANCHO_CORPORATIVO,
              imageHeight: ALTO_CORPORATIVO,
            },
          },
        },
        {
          coverWidth: ANCHO_CORPORATIVO,
          coverHeight: ALTO_CORPORATIVO,
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: tope,
    select: SELECCION,
  });

  /*
    Segundo filtro en memoria: la consulta admite un recurso
    cuya GALERÍA tenga una imagen del formato, pero la tarjeta
    podría acabar pintando la portada, que quizá no lo sea. Se
    comprueba la imagen que de verdad se va a enseñar.
  */
  return (filas as Fila[])
    .map(aTarjetaHome)
    .filter(
      (t) =>
        t.ancho === ANCHO_CORPORATIVO && t.alto === ALTO_CORPORATIVO
    );
}

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

/**
 * Recuentos para "Más diseños para tu negocio".
 *
 * Cuatro agregados en paralelo, sin traer ninguna fila: solo
 * hacen falta los números para decidir qué caminos se ofrecen
 * y cuántos elementos tiene cada uno.
 */
export async function conteosDeDisenos(): Promise<{
  colecciones: number;
  corporativos: number;
  socialMedia: number;
  packs: number;
}> {
  const [colecciones, corporativos, socialMedia, packs] =
    await Promise.all([
      prisma.commercialCollection.count({
        where: { status: "PUBLISHED" },
      }),
      prisma.product.count({
        where: {
          status: "PUBLISHED",
          category: { slug: CATEGORIA_CORPORATIVOS },
        },
      }),
      prisma.product.count({
        where: {
          status: "PUBLISHED",
          category: { slug: "social-media" },
        },
      }),
      prisma.pack.count({ where: { status: "PUBLISHED" } }),
    ]);

  return { colecciones, corporativos, socialMedia, packs };
}
