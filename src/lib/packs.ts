import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crearNotificaciones } from "@/lib/notificaciones";
import {
  LARGO_DESCRIPCION_PACK,
  LARGO_NOMBRE_PACK,
  MAXIMO_RECURSOS_PACK,
  calcularAhorro,
  slugificarPack,
  type EstadoPack,
  type PackVista,
} from "@/lib/packs-comun";

export * from "@/lib/packs-comun";

/**
 * Packs.
 *
 * Todo pasa por aquí: propiedad, validación de los recursos
 * incluidos y el reparto del precio al comprar.
 */

/* ══════════════ PROPIEDAD ══════════════ */

export async function packEditablePor(
  packId: string,
  userId: string,
  role: string
) {
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      creatorId: true,
      name: true,
      slug: true,
      status: true,
      /*
        La descripción y el precio hacen falta para poder
        editar solo una parte del pack: ver `actualizarPack`.
      */
      description: true,
      price: true,
    },
  });

  if (!pack) return { pack: null, permitido: false };

  return {
    pack,
    permitido: role === "ADMIN" || pack.creatorId === userId,
  };
}

/* ══════════════ VALIDACIÓN ══════════════ */

export type ResultadoPack =
  | { ok: true; id: string; slug: string }
  | { ok: false; estado: number; error: string };

/**
 * Filtra los recursos que de verdad pueden entrar en el pack.
 *
 * Tienen que ser del MISMO creador y estar PUBLICADOS. Lo
 * primero porque un creador no puede vender el trabajo de
 * otro; lo segundo porque un pack publicado que incluya un
 * borrador dejaría al comprador sin una de las piezas.
 *
 * Los ids repetidos se descartan aquí, y la clave primaria
 * compuesta de PackItem lo impide igualmente en la base.
 */
async function recursosValidos(
  creatorId: string,
  productIds: unknown
): Promise<
  | { ok: true; ids: string[] }
  | { ok: false; estado: number; error: string }
> {
  if (!Array.isArray(productIds)) {
    return { ok: false, estado: 400, error: "Indica los recursos." };
  }

  const pedidos = [
    ...new Set(
      productIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  ];

  if (pedidos.length > MAXIMO_RECURSOS_PACK) {
    return {
      ok: false,
      estado: 400,
      error: `Un pack no puede tener más de ${MAXIMO_RECURSOS_PACK} recursos.`,
    };
  }

  if (pedidos.length === 0) return { ok: true, ids: [] };

  const encontrados = await prisma.product.findMany({
    where: {
      id: { in: pedidos },
      creatorId,
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  if (encontrados.length !== pedidos.length) {
    return {
      ok: false,
      estado: 403,
      error:
        "Solo puedes incluir recursos tuyos que estén publicados.",
    };
  }

  // Se conserva el orden en que los eligió el creador.
  return { ok: true, ids: pedidos };
}

function validarTexto(datos: {
  name: unknown;
  description: unknown;
  price: unknown;
}):
  | { ok: true; name: string; description: string; price: string }
  | { ok: false; error: string } {
  const name = String(datos.name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, LARGO_NOMBRE_PACK);

  if (name.length < 3) {
    return { ok: false, error: "El nombre del pack es demasiado corto." };
  }

  const description = String(datos.description ?? "")
    .trim()
    .slice(0, LARGO_DESCRIPCION_PACK);

  if (!description) {
    return { ok: false, error: "Escribe una descripción del pack." };
  }

  const precio = Number(datos.price);

  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: "El precio no es válido." };
  }

  return { ok: true, name, description, price: precio.toFixed(2) };
}

/** Slug libre, añadiendo un sufijo si hace falta. */
async function slugLibre(
  base: string,
  excluirId?: string
): Promise<string> {
  const raiz = slugificarPack(base) || "pack";

  for (let intento = 0; intento < 20; intento += 1) {
    const candidato = intento === 0 ? raiz : `${raiz}-${intento + 1}`;

    const ocupado = await prisma.pack.findFirst({
      where: {
        slug: candidato,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
      select: { id: true },
    });

    if (!ocupado) return candidato;
  }

  return `${raiz}-${Date.now()}`;
}

/* ══════════════ ESCRITURA ══════════════ */

export async function crearPack(
  creatorId: string,
  datos: {
    name: unknown;
    description: unknown;
    price: unknown;
    coverUrl?: unknown;
    productIds?: unknown;
  }
): Promise<ResultadoPack> {
  const texto = validarTexto(datos);

  if (!texto.ok) {
    return { ok: false, estado: 400, error: texto.error };
  }

  const recursos = await recursosValidos(creatorId, datos.productIds ?? []);

  if (!recursos.ok) return recursos;

  const slug = await slugLibre(texto.name);

  const pack = await prisma.pack.create({
    data: {
      creatorId,
      name: texto.name,
      description: texto.description,
      price: texto.price,
      coverUrl:
        typeof datos.coverUrl === "string" && datos.coverUrl.trim()
          ? datos.coverUrl.trim()
          : null,
      slug,
      // Nace en borrador: publicarlo es una decisión aparte.
      status: "DRAFT",
      items: {
        create: recursos.ids.map((productId, indice) => ({
          productId,
          sortOrder: indice,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  return { ok: true, id: pack.id, slug: pack.slug };
}

export async function actualizarPack(
  packId: string,
  usuario: { userId: string; role: string },
  datos: {
    name?: unknown;
    description?: unknown;
    price?: unknown;
    coverUrl?: unknown;
    productIds?: unknown;
    status?: unknown;
  }
): Promise<ResultadoPack> {
  const { pack, permitido } = await packEditablePor(
    packId,
    usuario.userId,
    usuario.role
  );

  if (!pack) {
    return { ok: false, estado: 404, error: "Pack no encontrado." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes editar este pack.",
    };
  }

  /*
    Edición PARCIAL.

    Cada campo que no venga en la petición conserva el valor
    que ya tiene el pack. Antes se validaba `datos.name` tal
    cual, de modo que un PATCH que solo cambiaba el estado
    —publicar o archivar— se rechazaba con "el nombre del pack
    es demasiado corto", porque el nombre llegaba `undefined`.
  */
  const texto = validarTexto({
    name: datos.name === undefined ? pack.name : datos.name,
    description:
      datos.description === undefined ? pack.description : datos.description,
    price: datos.price === undefined ? pack.price : datos.price,
  });

  if (!texto.ok) {
    return { ok: false, estado: 400, error: texto.error };
  }

  /*
    Los recursos se validan contra el creador DEL PACK, no
    contra quien edita: si un ADMIN lo toca, sigue sin poder
    meter recursos de terceros.
  */
  const recursos =
    datos.productIds === undefined
      ? null
      : await recursosValidos(pack.creatorId, datos.productIds);

  if (recursos && !recursos.ok) return recursos;

  const estado = datos.status;

  const nuevoEstado: EstadoPack | undefined =
    estado === "DRAFT" || estado === "PUBLISHED" || estado === "ARCHIVED"
      ? estado
      : undefined;

  // Publicar exige contenido: un pack vacío no es un pack.
  if (nuevoEstado === "PUBLISHED") {
    const cuantos =
      recursos?.ok === true
        ? recursos.ids.length
        : await prisma.packItem.count({ where: { packId } });

    if (cuantos < 1) {
      return {
        ok: false,
        estado: 400,
        error: "Añade al menos un recurso antes de publicar el pack.",
      };
    }
  }

  const slug =
    texto.name !== pack.name
      ? await slugLibre(texto.name, pack.id)
      : pack.slug;

  await prisma.$transaction(async (tx) => {
    if (recursos?.ok) {
      // Se reemplaza el contenido por el indicado.
      await tx.packItem.deleteMany({ where: { packId } });

      if (recursos.ids.length > 0) {
        await tx.packItem.createMany({
          data: recursos.ids.map((productId, indice) => ({
            packId,
            productId,
            sortOrder: indice,
          })),
        });
      }
    }

    await tx.pack.update({
      where: { id: packId },
      data: {
        name: texto.name,
        slug,
        description: texto.description,
        price: texto.price,
        ...(datos.coverUrl !== undefined
          ? {
              coverUrl:
                typeof datos.coverUrl === "string" && datos.coverUrl.trim()
                  ? datos.coverUrl.trim()
                  : null,
            }
          : {}),
        ...(nuevoEstado ? { status: nuevoEstado } : {}),
      },
    });
  });

  /*
    Aviso solo en la transición a publicado: reeditar un pack
    ya publicado no vuelve a anunciarlo a los seguidores.
  */
  if (nuevoEstado === "PUBLISHED" && pack.status !== "PUBLISHED") {
    await avisarSeguidores(pack.creatorId, texto.name, slug);
  }

  return { ok: true, id: packId, slug };
}

export async function borrarPack(
  packId: string,
  usuario: { userId: string; role: string }
): Promise<ResultadoPack> {
  const { pack, permitido } = await packEditablePor(
    packId,
    usuario.userId,
    usuario.role
  );

  if (!pack) {
    return { ok: false, estado: 404, error: "Pack no encontrado." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes eliminar este pack.",
    };
  }

  /*
    Un pack que ya se vendió no se borra: sus líneas de pedido
    lo referencian y borrarlo dejaría compras sin origen. Se
    archiva, que lo retira de la tienda sin perder el rastro.
  */
  const vendido = await prisma.orderItem.count({
    where: { packId },
  });

  if (vendido > 0) {
    await prisma.pack.update({
      where: { id: packId },
      data: { status: "ARCHIVED" },
    });

    return { ok: true, id: packId, slug: pack.slug };
  }

  await prisma.pack.delete({ where: { id: packId } });

  return { ok: true, id: packId, slug: pack.slug };
}

/** Avisa a los seguidores del creador de que hay pack nuevo. */
async function avisarSeguidores(
  creatorId: string,
  nombre: string,
  slug: string
): Promise<void> {
  try {
    const seguidores = await prisma.follow.findMany({
      where: { creatorId },
      select: { followerId: true },
    });

    if (seguidores.length === 0) return;

    await crearNotificaciones(
      seguidores.map((s) => ({
        userId: s.followerId,
        type: "PACK_PUBLISHED" as const,
        title: "Nuevo pack disponible",
        body: nombre,
        href: `/packs/${slug}`,
      }))
    );
  } catch (error) {
    console.error("avisarSeguidores:", error);
  }
}

/* ══════════════ LECTURA ══════════════ */

const SELECCION = {
  id: true,
  name: true,
  slug: true,
  description: true,
  coverUrl: true,
  price: true,
  status: true,
  createdAt: true,
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
  items: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          coverUrl: true,
          status: true,
          category: { select: { name: true, slug: true } },
          images: {
            orderBy: { sortOrder: "asc" as const },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
    },
  },
} satisfies Prisma.PackSelect;

type FilaPack = Prisma.PackGetPayload<{ select: typeof SELECCION }>;

function aVista(fila: FilaPack): PackVista {
  const productos = fila.items.map((i) => ({
    id: i.product.id,
    name: i.product.name,
    slug: i.product.slug,
    price: Number(i.product.price),
    coverUrl: i.product.coverUrl,
    image: i.product.images[0] ?? null,
    category: i.product.category,
  }));

  const sumaIndividual = productos.reduce((t, p) => t + p.price, 0);

  const precio = Number(fila.price);

  return {
    id: fila.id,
    name: fila.name,
    slug: fila.slug,
    description: fila.description,
    coverUrl: fila.coverUrl,
    price: precio,
    status: fila.status,
    createdAt: fila.createdAt.toISOString(),
    creador: {
      nombre:
        fila.creator.publicName || fila.creator.name || "Creador",
      username:
        fila.creator.creatorStatus === "APPROVED"
          ? fila.creator.username
          : null,
      avatarUrl: fila.creator.avatarUrl,
      isVerified: fila.creator.isVerified,
    },
    productos,
    sumaIndividual,
    ahorro: calcularAhorro(precio, sumaIndividual),
  };
}

/** Packs publicados, para el catálogo público. */
export async function listarPacksPublicos(
  limite = 24
): Promise<PackVista[]> {
  const filas = await prisma.pack.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: SELECCION,
  });

  return filas.map(aVista);
}

/** Un pack por slug. Solo publicado si no es su creador. */
export async function obtenerPackPublico(
  slug: string
): Promise<PackVista | null> {
  const fila = await prisma.pack.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}

/** Packs de un creador, en cualquier estado. */
export async function listarPacksDe(
  creatorId: string
): Promise<PackVista[]> {
  const filas = await prisma.pack.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    select: SELECCION,
  });

  return filas.map(aVista);
}

/** Varios packs por id, en una sola consulta. */
export async function packsPorIds(
  ids: string[]
): Promise<PackVista[]> {
  if (ids.length === 0) return [];

  const filas = await prisma.pack.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: SELECCION,
  });

  return filas.map(aVista);
}

export async function obtenerPack(
  packId: string
): Promise<PackVista | null> {
  const fila = await prisma.pack.findUnique({
    where: { id: packId },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}

/* ══════════════ COMPRA ══════════════ */

export type LineaDePack = {
  productId: string;
  /** Parte del precio del pack que corresponde a esta línea. */
  price: Prisma.Decimal;
  packId: string;
};

/**
 * Convierte un pack en las líneas de pedido que lo componen.
 *
 * POR QUÉ SE EXPANDE
 *
 * Comprar un pack NO crea una línea "pack": crea una línea por
 * recurso incluido. Así `fulfillPaidOrder` sigue generando una
 * descarga y una licencia por recurso sin ningún cambio, y no
 * aparece una licencia ficticia de un producto que no existe.
 *
 * EL REPARTO
 *
 * El importe cobrado es el precio DEL PACK, no la suma de sus
 * piezas. Se reparte entre las líneas en proporción a lo que
 * vale cada recurso por separado, y el redondeo sobrante va a
 * la última: así la suma de las líneas cuadra al céntimo con
 * el precio del pack, que es lo que se cobra y lo que después
 * se reparte en comisiones.
 */
export async function expandirPack(
  packId: string
): Promise<
  | { ok: true; lineas: LineaDePack[]; total: Prisma.Decimal }
  | { ok: false; error: string }
> {
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      price: true,
      status: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          product: { select: { id: true, price: true, status: true } },
        },
      },
    },
  });

  if (!pack || pack.status !== "PUBLISHED") {
    return { ok: false, error: "Este pack ya no está disponible." };
  }

  // Solo entran los recursos que siguen publicados.
  const productos = pack.items
    .map((i) => i.product)
    .filter((p) => p.status === "PUBLISHED");

  if (productos.length === 0) {
    return { ok: false, error: "Este pack no tiene recursos disponibles." };
  }

  const total = new Prisma.Decimal(pack.price);

  const suma = productos.reduce(
    (t, p) => t.add(p.price),
    new Prisma.Decimal(0)
  );

  const lineas: LineaDePack[] = [];

  let repartido = new Prisma.Decimal(0);

  productos.forEach((producto, indice) => {
    const ultima = indice === productos.length - 1;

    const parte = ultima
      ? // La última se lleva lo que falte: el redondeo nunca
        // puede hacer que las líneas sumen distinto del total.
        total.sub(repartido)
      : suma.isZero()
        ? total.div(productos.length).toDecimalPlaces(2)
        : total
            .mul(producto.price)
            .div(suma)
            .toDecimalPlaces(2);

    repartido = repartido.add(parte);

    lineas.push({
      productId: producto.id,
      price: parte,
      packId: pack.id,
    });
  });

  return { ok: true, lineas, total };
}
