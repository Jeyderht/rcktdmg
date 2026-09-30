import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SELECCION_TARJETA, TAG_PACK, aTarjeta } from "@/lib/catalogo";
import { packsPorIds, type PackVista } from "@/lib/packs";
import type {
  BloqueRecomendaciones,
  Recomendacion,
} from "@/lib/recomendaciones-tipos";

export type { BloqueRecomendaciones, Recomendacion };

/**
 * Recomendaciones del marketplace.
 *
 * QUÉ SEÑALES SE USAN Y POR QUÉ
 *
 * Solo datos que el proyecto tiene de verdad. No hay registro
 * de vistas, así que no se usa: inventarlo sería construir
 * sobre algo que no existe.
 *
 *   categoría        · la señal más fuerte y la que más datos tiene
 *   etiquetas        · comparten tema; hoy casi vacío, ver abajo
 *   creador          · quien te gustó suele volver a gustarte
 *   formato          · poco discriminante con un catálogo de jpg
 *   color            · declarado por el creador; hoy vacío
 *   precio           · cercanía, no igualdad
 *   valoración       · secundaria y amortiguada (ver `notaAjustada`)
 *   popularidad      · favoritos y ventas reales
 *   novedad          · desempate suave
 *
 * SEÑALES DORMIDAS
 *
 * `color` y las etiquetas descriptivas están implementadas
 * pero hoy no aportan: ningún recurso tiene color declarado y
 * la única etiqueta existente es la estructural `pack`. En
 * cuanto los creadores las usen, empiezan a puntuar solas sin
 * tocar nada. Se dejan porque el coste es cero y quitarlas
 * obligaría a rehacer esto más adelante.
 *
 * LA PUNTUACIÓN NO SE MUESTRA
 *
 * Es un orden interno. Al usuario se le dice de dónde salen
 * las recomendaciones —"más de esta categoría", "más del
 * creador"—, nunca un número ni un "este es el mejor".
 */

/** Cuántos candidatos se puntúan como mucho. */
const POOL = 60;

/*
  PESOS

  Ninguna señal puede decidir por sí sola: la categoría, que es
  la más fuerte, aporta 30 de un máximo teórico cercano a 120.
  Así un recurso de otra categoría pero del mismo creador y bien
  valorado puede adelantar a uno de la misma categoría que no
  tiene nada más a su favor.
*/
const PESOS = {
  categoria: 30,
  etiquetaCompartida: 12,
  etiquetasMaximo: 36,
  creador: 20,
  formato: 6,
  color: 8,
  precio: 10,
  valoracion: 12,
  popularidad: 10,
  novedad: 4,
  // Personalización: solo para sesiones con historial real.
  creadorConocido: 14,
  categoriaConocida: 10,
} as const;

/**
 * Nota amortiguada por el número de reseñas.
 *
 * Un 5 con una sola reseña no puede adelantar a un 4,6 con
 * cuarenta. Se mezcla la nota real con una nota previa neutra
 * (3,5) que pesa como PRIOR reseñas: con pocas opiniones el
 * resultado tiende a la media, y solo se separa de ella
 * cuando hay volumen que lo respalde.
 */
const PRIOR_NOTA = 3.5;
const PRIOR_PESO = 5;

export function notaAjustada(
  media: number | null,
  cuantas: number
): number {
  if (media === null || cuantas <= 0) return PRIOR_NOTA;

  return (
    (media * cuantas + PRIOR_NOTA * PRIOR_PESO) /
    (cuantas + PRIOR_PESO)
  );
}

/** Datos mínimos de un candidato para poder puntuarlo. */
const SELECCION_CANDIDATO = {
  ...SELECCION_TARJETA,
  /*
    SELECCION_TARJETA solo trae la etiqueta "pack", que es lo
    único que la tarjeta necesita. Para puntuar hacen falta
    TODAS, así que aquí se amplía; al construir la tarjeta se
    vuelven a filtrar para que "esPack" siga significando lo
    mismo.
  */
  tags: {
    select: { tagId: true, tag: { select: { slug: true } } },
  },
  categoryId: true,
  creatorId: true,
  color: true,
  price: true,
  avgRating: true,
  reviewCount: true,
  _count: {
    select: {
      favorites: true,
      orderItems: true,
    },
  },
} satisfies Prisma.ProductSelect;

type Candidato = Prisma.ProductGetPayload<{
  select: typeof SELECCION_CANDIDATO;
}>;

/** Referencia contra la que se compara: el recurso que se mira. */
type Referencia = {
  id: string;
  categoryId: string;
  creatorId: string;
  fileFormat: string | null;
  color: string | null;
  price: number;
  /** Slugs de sus etiquetas, incluida la de pack. */
  tagSlugs: string[];
};

/** Señales del usuario, derivadas de lo que ya hizo. */
export type SenalesUsuario = {
  creadores: Set<string>;
  categorias: Set<string>;
  /** Recursos que ya tiene: no se le recomiendan. */
  yaTiene: Set<string>;
  /** true si hay historial suficiente para personalizar. */
  hayHistorial: boolean;
};

const SIN_SENALES: SenalesUsuario = {
  creadores: new Set(),
  categorias: new Set(),
  yaTiene: new Set(),
  hayHistorial: false,
};

/**
 * Señales de un usuario a partir de sus compras y favoritos.
 *
 * SEGURIDAD: esto NUNCA sale hacia el navegador. Solo se usa
 * para ordenar, y lo que se devuelve son recursos públicos.
 * Tampoco se dice nunca "porque compraste X".
 *
 * Dos consultas acotadas, no una por recurso.
 */
export async function senalesDe(
  userId: string | null
): Promise<SenalesUsuario> {
  if (!userId) return SIN_SENALES;

  const [compras, favoritos] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: "PAID" } },
      take: 100,
      select: {
        productId: true,
        product: { select: { creatorId: true, categoryId: true } },
      },
    }),

    prisma.favorite.findMany({
      where: { userId },
      take: 100,
      select: {
        productId: true,
        product: { select: { creatorId: true, categoryId: true } },
      },
    }),
  ]);

  const creadores = new Set<string>();
  const categorias = new Set<string>();
  const yaTiene = new Set<string>();

  for (const c of compras) {
    creadores.add(c.product.creatorId);
    categorias.add(c.product.categoryId);
    // Lo comprado no se recomienda: ya lo tiene.
    yaTiene.add(c.productId);
  }

  for (const f of favoritos) {
    creadores.add(f.product.creatorId);
    categorias.add(f.product.categoryId);
  }

  return {
    creadores,
    categorias,
    yaTiene,
    // Con una sola señal suelta no se habla de personalización.
    hayHistorial: compras.length > 0 || favoritos.length >= 2,
  };
}

/* ══════════════ PUNTUACIÓN ══════════════ */

function puntuar(
  candidato: Candidato,
  referencia: Referencia | null,
  usuario: SenalesUsuario,
  precioMaximo: number
): number {
  let puntos = 0;

  if (referencia) {
    if (candidato.categoryId === referencia.categoryId) {
      puntos += PESOS.categoria;
    }

    if (candidato.creatorId === referencia.creatorId) {
      puntos += PESOS.creador;
    }

    const compartidas = candidato.tags.filter((t) =>
      referencia.tagSlugs.includes(t.tag.slug)
    ).length;

    puntos += Math.min(
      compartidas * PESOS.etiquetaCompartida,
      PESOS.etiquetasMaximo
    );

    if (
      candidato.fileFormat &&
      candidato.fileFormat === referencia.fileFormat
    ) {
      puntos += PESOS.formato;
    }

    if (candidato.color && candidato.color === referencia.color) {
      puntos += PESOS.color;
    }

    /*
      Precio: cercanía, no igualdad. Se normaliza contra el
      precio más caro del grupo para que la escala no dependa
      de si el catálogo vale 10 o 1.000.
    */
    if (precioMaximo > 0) {
      const distancia =
        Math.abs(Number(candidato.price) - referencia.price) /
        precioMaximo;

      puntos += PESOS.precio * Math.max(0, 1 - distancia);
    }
  }

  // Valoración: de 1..5 a 0..1, amortiguada por el volumen.
  const nota = notaAjustada(
    candidato.avgRating ? Number(candidato.avgRating) : null,
    candidato.reviewCount
  );

  puntos += PESOS.valoracion * ((nota - 1) / 4);

  /*
    Popularidad real: favoritos y ventas. Logarítmica para que
    un recurso con 50 ventas no aplaste a todos los demás.
    Una venta pesa el doble que un favorito: cuesta más.
  */
  const senal =
    candidato._count.favorites + candidato._count.orderItems * 2;

  puntos += PESOS.popularidad * Math.min(1, Math.log1p(senal) / Math.log(20));

  // Novedad: desempate suave, no un criterio propio.
  const dias =
    (Date.now() - candidato.createdAt.getTime()) / 86_400_000;

  puntos += PESOS.novedad * Math.max(0, 1 - dias / 180);

  // Personalización, solo con historial real.
  if (usuario.hayHistorial) {
    if (usuario.creadores.has(candidato.creatorId)) {
      puntos += PESOS.creadorConocido;
    }

    if (usuario.categorias.has(candidato.categoryId)) {
      puntos += PESOS.categoriaConocida;
    }
  }

  return puntos;
}

/* ══════════════ CONSULTA ══════════════ */

/**
 * Trae el conjunto de candidatos.
 *
 * UNA sola consulta, acotada a POOL filas, con todo lo que la
 * puntuación necesita —incluidos los recuentos de favoritos y
 * ventas—. Puntuar en memoria sobre un conjunto acotado evita
 * una consulta por candidato, que es el error clásico aquí.
 *
 * Nunca entran recursos que no sean PUBLISHED: los borradores,
 * los que están en revisión, los rechazados y los archivados
 * quedan fuera por el `where`.
 */
async function traerCandidatos(
  excluir: string[],
  preferirCategoria?: string
): Promise<Candidato[]> {
  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(excluir.length > 0 ? { id: { notIn: excluir } } : {}),
  };

  /*
    Si hay categoría de referencia se traen primero los suyos y
    se completa con el resto. Son dos consultas acotadas, no
    una por candidato, y evita que con un catálogo grande el
    tope de POOL deje fuera justo los más parecidos.
  */
  if (preferirCategoria) {
    const mismos = await prisma.product.findMany({
      where: { ...where, categoryId: preferirCategoria },
      orderBy: { createdAt: "desc" },
      take: POOL,
      select: SELECCION_CANDIDATO,
    });

    if (mismos.length >= POOL) return mismos;

    const otros = await prisma.product.findMany({
      where: {
        ...where,
        categoryId: { not: preferirCategoria },
      },
      orderBy: { createdAt: "desc" },
      take: POOL - mismos.length,
      select: SELECCION_CANDIDATO,
    });

    return [...mismos, ...otros];
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: POOL,
    select: SELECCION_CANDIDATO,
  });
}

/** Convierte un candidato en las props de ProductCard. */
function aTarjetaDesdeCandidato(c: Candidato): Recomendacion {
  return aTarjeta({
    ...c,
    //  sigue saliendo solo de la etiqueta estructural.
    tags: c.tags.filter((t) => t.tag.slug === TAG_PACK),
  });
}

function ordenar(
  candidatos: Candidato[],
  referencia: Referencia | null,
  usuario: SenalesUsuario,
  cuantos: number
): Recomendacion[] {
  const precioMaximo = candidatos.reduce(
    (max, c) => Math.max(max, Number(c.price)),
    0
  );

  return candidatos
    // Lo que el usuario ya tiene no se le vuelve a ofrecer.
    .filter((c) => !usuario.yaTiene.has(c.id))
    .map((c) => ({
      candidato: c,
      puntos: puntuar(c, referencia, usuario, precioMaximo),
    }))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, cuantos)
    .map((x) => aTarjetaDesdeCandidato(x.candidato));
}

/* ══════════════ PUNTOS DE ENTRADA ══════════════ */


/**
 * Recomendaciones de la ficha de un recurso.
 *
 * Devuelve hasta tres bloques, cada uno con su propia señal, y
 * solo los que tienen contenido: nunca se pinta una sección
 * vacía ni un título que no se corresponda con lo que hay
 * debajo.
 */
export async function paraProducto(
  producto: {
    id: string;
    categoryId: string;
    creatorId: string;
    fileFormat: string | null;
    color: string | null;
    price: number;
    tagSlugs: string[];
    categoriaNombre: string;
    creadorNombre: string;
  },
  userId: string | null,
  porBloque = 5
): Promise<BloqueRecomendaciones[]> {
  const [usuario, candidatos] = await Promise.all([
    senalesDe(userId),
    traerCandidatos([producto.id], producto.categoryId),
  ]);

  const referencia: Referencia = {
    id: producto.id,
    categoryId: producto.categoryId,
    creatorId: producto.creatorId,
    fileFormat: producto.fileFormat,
    color: producto.color,
    price: producto.price,
    tagSlugs: producto.tagSlugs,
  };

  const bloques: BloqueRecomendaciones[] = [];

  const usados = new Set<string>();

  /** Añade un bloque sin repetir recursos entre bloques. */
  function anadir(
    titulo: string,
    subtitulo: string | null,
    pool: Candidato[]
  ) {
    const libres = pool.filter((c) => !usados.has(c.id));

    const elegidos = ordenar(libres, referencia, usuario, porBloque);

    if (elegidos.length === 0) return;

    for (const p of elegidos) usados.add(p.id);

    bloques.push({ titulo, subtitulo, productos: elegidos });
  }

  // 1. Del mismo creador: señal pública y muy legible.
  anadir(
    `Más de ${producto.creadorNombre}`,
    null,
    candidatos.filter((c) => c.creatorId === producto.creatorId)
  );

  // 2. De la misma categoría.
  anadir(
    `Más de ${producto.categoriaNombre}`,
    null,
    candidatos.filter(
      (c) =>
        c.categoryId === producto.categoryId &&
        c.creatorId !== producto.creatorId
    )
  );

  /*
    NO HAY TERCER BLOQUE AQUÍ.

    Antes existía uno, "También puede interesarte", con lo que
    quedaba fuera de los dos anteriores. Ahora esa misma señal
    —el parecido con lo que se está viendo— vive arriba, junto a
    la zona de compra, en la tira de sugerencias animada, que la
    sirve `sugerenciasDeFicha`.

    Tenerlo en los dos sitios repetiría el mismo título y, con
    un catálogo pequeño, los mismos recursos. Y dejarlo solo
    abajo lo enterraba tras las valoraciones, las versiones y
    las etiquetas: es donde menos ayuda a decidir una compra.
  */

  return bloques;
}

/**
 * Sugerencias de la ficha, en una sola lista.
 *
 * Lo que alimenta la tira animada que va junto a la zona de
 * compra. Devuelve recursos reales, PUBLISHED y sin el que se
 * está viendo, ordenados por la misma función que puntúa los
 * bloques: no hay un segundo criterio de parecido que pueda
 * discrepar del primero.
 *
 * No agrupa por señal a propósito. Ahí arriba el título ya dice
 * lo que son —otras opciones parecidas— y partirlas en bloques
 * obligaría a leer tres encabezados antes de ver un flyer.
 *
 * `cuantos` se queda corto a propósito: son imágenes, y la
 * ficha ya carga la galería del recurso. Diez es suficiente
 * para que la tira nunca se vea vacía y poco para que no
 * compita con lo que el cliente vino a ver.
 */
export async function sugerenciasDeFicha(
  producto: {
    id: string;
    categoryId: string;
    creatorId: string;
    fileFormat: string | null;
    color: string | null;
    price: number;
    tagSlugs: string[];
  },
  userId: string | null,
  cuantos = 10
): Promise<Recomendacion[]> {
  const [usuario, candidatos] = await Promise.all([
    senalesDe(userId),
    traerCandidatos([producto.id], producto.categoryId),
  ]);

  const referencia: Referencia = {
    id: producto.id,
    categoryId: producto.categoryId,
    creatorId: producto.creatorId,
    fileFormat: producto.fileFormat,
    color: producto.color,
    price: producto.price,
    tagSlugs: producto.tagSlugs,
  };

  return ordenar(candidatos, referencia, usuario, cuantos);
}

/**
 * Recomendaciones personales, para la home y el área del
 * cliente.
 *
 * Si NO hay historial real devuelve un bloque contextual con
 * un título que describe lo que es —lo más valorado y
 * guardado—, en lugar de fingir una personalización que no
 * existe.
 */
export async function paraUsuario(
  userId: string | null,
  cuantos = 5
): Promise<BloqueRecomendaciones | null> {
  const usuario = await senalesDe(userId);

  const candidatos = await traerCandidatos([]);

  const productos = ordenar(candidatos, null, usuario, cuantos);

  if (productos.length === 0) return null;

  return usuario.hayHistorial
    ? {
        titulo: "Recomendado para ti",
        subtitulo:
          "Según los recursos que has comprado y guardado.",
        productos,
      }
    : {
        titulo: "Destacados del marketplace",
        subtitulo:
          "Los recursos mejor valorados y más guardados ahora mismo.",
        productos,
      };
}

/**
 * Packs que contienen este recurso.
 *
 * Es la única relación pack↔recurso que existe de verdad, y
 * es útil: si estás mirando algo que viene en un pack, te
 * interesa saber que comprándolo entero sale más barato.
 *
 * No se mezclan con los recursos: los packs tienen otra forma
 * y se pintan con PackCard. Si no hay ninguno, no hay sección.
 */
export async function packsQueIncluyen(
  productId: string
): Promise<PackVista[]> {
  const filas = await prisma.packItem.findMany({
    where: { productId, pack: { status: "PUBLISHED" } },
    take: 4,
    select: { packId: true },
  });

  if (filas.length === 0) return [];

  // Una consulta para todos, no una por pack.
  return packsPorIds(filas.map((f) => f.packId));
}
