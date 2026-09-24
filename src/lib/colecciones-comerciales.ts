import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crearNotificaciones } from "@/lib/notificaciones";
import {
  LARGO_DESCRIPCION_COLECCION,
  LARGO_NOMBRE_COLECCION,
  MAXIMO_RECURSOS_COLECCION,
  MINIMO_RECURSOS_COLECCION,
  calcularAhorroColeccion,
  slugificarColeccion,
  type ColeccionVista,
  type EstadoColeccion,
} from "@/lib/colecciones-comerciales-comun";

export * from "@/lib/colecciones-comerciales-comun";

/**
 * Colecciones comerciales.
 *
 * Todo pasa por aquí: quién puede editarlas, qué recursos
 * admiten, cuándo pueden publicarse y cómo se reparte su
 * precio al comprarlas. Ninguna ruta habla con
 * `prisma.commercialCollection` por su cuenta.
 *
 * Es hermana de src/lib/packs.ts y comparte su arquitectura a
 * propósito, para que quien conozca una entienda la otra. Las
 * dos diferencias reales están documentadas donde ocurren:
 * el mínimo de seis recursos para publicar, y la exigencia de
 * que TODOS sigan publicados en ese momento.
 */

/* ══════════════ PERMISOS ══════════════ */

export async function coleccionEditablePor(
  collectionId: string,
  userId: string,
  role: string
) {
  const coleccion = await prisma.commercialCollection.findUnique({
    where: { id: collectionId },
    select: {
      id: true,
      creatorId: true,
      name: true,
      slug: true,
      status: true,
      description: true,
      price: true,
    },
  });

  if (!coleccion) return { coleccion: null, permitido: false };

  return {
    coleccion,
    permitido: role === "ADMIN" || coleccion.creatorId === userId,
  };
}

/* ══════════════ VALIDACIÓN ══════════════ */

export type ResultadoColeccion =
  | { ok: true; id: string; slug: string }
  | { ok: false; estado: number; error: string };

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
    .slice(0, LARGO_NOMBRE_COLECCION);

  if (name.length < 3) {
    return {
      ok: false,
      error: "El nombre de la colección es demasiado corto.",
    };
  }

  const description = String(datos.description ?? "")
    .trim()
    .slice(0, LARGO_DESCRIPCION_COLECCION);

  if (!description) {
    return { ok: false, error: "Escribe una descripción de la colección." };
  }

  const precio = Number(datos.price);

  /*
    El marketplace no maneja recursos gratuitos, así que una
    colección a cero no sería una oferta: sería una forma de
    regalar el trabajo de seis recursos de pago.
  */
  if (!Number.isFinite(precio) || precio <= 0) {
    return { ok: false, error: "El precio no es válido." };
  }

  return { ok: true, name, description, price: precio.toFixed(2) };
}

/** Slug libre, añadiendo un sufijo si hace falta. */
async function slugLibre(
  base: string,
  excluirId?: string
): Promise<string> {
  const raiz = slugificarColeccion(base) || "coleccion";

  for (let intento = 0; intento < 20; intento += 1) {
    const candidato = intento === 0 ? raiz : `${raiz}-${intento + 1}`;

    const ocupado = await prisma.commercialCollection.findFirst({
      where: {
        slug: candidato,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true },
    });

    if (!ocupado) return candidato;
  }

  return `${raiz}-${Date.now()}`;
}

/**
 * Recursos admisibles en una colección.
 *
 * Tienen que ser del MISMO creador y estar publicados. Se
 * valida contra el creador de la colección, no contra quien
 * edita: si un ADMIN la toca, sigue sin poder meter recursos
 * de terceros.
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

  // Los repetidos se colapsan en vez de rechazarse: el creador
  // quiso incluirlo, y una vez ya está incluido.
  const pedidos = [
    ...new Set(
      productIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  ];

  if (pedidos.length > MAXIMO_RECURSOS_COLECCION) {
    return {
      ok: false,
      estado: 400,
      error: `Una colección no puede tener más de ${MAXIMO_RECURSOS_COLECCION} recursos.`,
    };
  }

  if (pedidos.length === 0) return { ok: true, ids: [] };

  const encontrados = await prisma.product.findMany({
    where: { id: { in: pedidos }, creatorId, status: "PUBLISHED" },
    select: { id: true },
  });

  if (encontrados.length !== pedidos.length) {
    return {
      ok: false,
      estado: 403,
      error: "Solo puedes incluir recursos tuyos que estén publicados.",
    };
  }

  return { ok: true, ids: pedidos };
}

/**
 * Comprueba que la colección puede ponerse a la venta.
 *
 * Dos condiciones, y las dos se miran sobre el contenido que
 * va a quedar guardado, no sobre el que tenía antes.
 */
async function puedePublicarse(
  collectionId: string,
  idsNuevos: string[] | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids =
    idsNuevos ??
    (
      await prisma.commercialCollectionItem.findMany({
        where: { collectionId },
        select: { productId: true },
      })
    ).map((i) => i.productId);

  if (ids.length < MINIMO_RECURSOS_COLECCION) {
    return {
      ok: false,
      error: `Una colección necesita al menos ${MINIMO_RECURSOS_COLECCION} recursos para publicarse. Ahora tiene ${ids.length}.`,
    };
  }

  /*
    Todos tienen que seguir publicados EN ESTE MOMENTO.

    Si un recurso de la colección dejó de estar publicado, la
    colección no se pone a la venta hasta que su creador lo
    resuelva —republicándolo o sacándolo de la colección—. No
    se borra la relación por nuestra cuenta: la decisión de
    qué contiene su colección es suya.
  */
  const publicados = await prisma.product.count({
    where: { id: { in: ids }, status: "PUBLISHED" },
  });

  if (publicados !== ids.length) {
    return {
      ok: false,
      error:
        "Algún recurso de la colección ya no está publicado. Vuelve a publicarlo o quítalo de la colección.",
    };
  }

  return { ok: true };
}

/* ══════════════ ESCRITURA ══════════════ */

export async function crearColeccion(
  creatorId: string,
  datos: {
    name?: unknown;
    description?: unknown;
    price?: unknown;
    coverUrl?: unknown;
    productIds?: unknown;
  }
): Promise<ResultadoColeccion> {
  const texto = validarTexto({
    name: datos.name,
    description: datos.description,
    price: datos.price,
  });

  if (!texto.ok) return { ok: false, estado: 400, error: texto.error };

  const recursos = await recursosValidos(creatorId, datos.productIds ?? []);

  if (!recursos.ok) return recursos;

  const slug = await slugLibre(texto.name);

  const coleccion = await prisma.commercialCollection.create({
    data: {
      creatorId,
      name: texto.name,
      slug,
      description: texto.description,
      price: texto.price,
      coverUrl:
        typeof datos.coverUrl === "string" && datos.coverUrl.trim()
          ? datos.coverUrl.trim()
          : null,
      items: {
        create: recursos.ids.map((productId, indice) => ({
          productId,
          sortOrder: indice,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  return { ok: true, id: coleccion.id, slug: coleccion.slug };
}

export async function actualizarColeccion(
  collectionId: string,
  usuario: { userId: string; role: string },
  datos: {
    name?: unknown;
    description?: unknown;
    price?: unknown;
    coverUrl?: unknown;
    productIds?: unknown;
    status?: unknown;
  }
): Promise<ResultadoColeccion> {
  const { coleccion, permitido } = await coleccionEditablePor(
    collectionId,
    usuario.userId,
    usuario.role
  );

  if (!coleccion) {
    return { ok: false, estado: 404, error: "Colección no encontrada." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes editar esta colección.",
    };
  }

  /*
    Edición PARCIAL: cada campo ausente conserva el valor que
    ya tiene. Así un cambio de estado —publicar o archivar— no
    obliga a reenviar el nombre, la descripción y el precio.
  */
  const texto = validarTexto({
    name: datos.name === undefined ? coleccion.name : datos.name,
    description:
      datos.description === undefined
        ? coleccion.description
        : datos.description,
    price: datos.price === undefined ? coleccion.price : datos.price,
  });

  if (!texto.ok) return { ok: false, estado: 400, error: texto.error };

  const recursos =
    datos.productIds === undefined
      ? null
      : await recursosValidos(coleccion.creatorId, datos.productIds);

  if (recursos && !recursos.ok) return recursos;

  const estado = datos.status;

  const nuevoEstado: EstadoColeccion | undefined =
    estado === "DRAFT" || estado === "PUBLISHED" || estado === "ARCHIVED"
      ? estado
      : undefined;

  if (nuevoEstado === "PUBLISHED") {
    const apta = await puedePublicarse(
      collectionId,
      recursos?.ok === true ? recursos.ids : null
    );

    if (!apta.ok) {
      return { ok: false, estado: 400, error: apta.error };
    }
  }

  const slug =
    texto.name !== coleccion.name
      ? await slugLibre(texto.name, coleccion.id)
      : coleccion.slug;

  await prisma.$transaction(async (tx) => {
    if (recursos?.ok) {
      // Se reemplaza el contenido por el indicado.
      await tx.commercialCollectionItem.deleteMany({
        where: { collectionId },
      });

      if (recursos.ids.length > 0) {
        await tx.commercialCollectionItem.createMany({
          data: recursos.ids.map((productId, indice) => ({
            collectionId,
            productId,
            sortOrder: indice,
          })),
        });
      }
    }

    await tx.commercialCollection.update({
      where: { id: collectionId },
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

  // Aviso solo en la transición a publicada.
  if (nuevoEstado === "PUBLISHED" && coleccion.status !== "PUBLISHED") {
    await avisarSeguidores(coleccion.creatorId, texto.name, slug);
  }

  return { ok: true, id: collectionId, slug };
}

export async function borrarColeccion(
  collectionId: string,
  usuario: { userId: string; role: string }
): Promise<ResultadoColeccion> {
  const { coleccion, permitido } = await coleccionEditablePor(
    collectionId,
    usuario.userId,
    usuario.role
  );

  if (!coleccion) {
    return { ok: false, estado: 404, error: "Colección no encontrada." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes eliminar esta colección.",
    };
  }

  /*
    Una colección que ya se vendió no se borra: sus líneas de
    pedido la referencian y borrarla dejaría compras sin
    origen. Se archiva, que la retira de la tienda sin perder
    el rastro.
  */
  const vendida = await prisma.orderItem.count({
    where: { commercialCollectionId: collectionId },
  });

  if (vendida > 0) {
    await prisma.commercialCollection.update({
      where: { id: collectionId },
      data: { status: "ARCHIVED" },
    });

    return { ok: true, id: collectionId, slug: coleccion.slug };
  }

  await prisma.commercialCollection.delete({ where: { id: collectionId } });

  return { ok: true, id: collectionId, slug: coleccion.slug };
}

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
        type: "COLLECTION_PUBLISHED" as const,
        title: "Nueva colección disponible",
        body: nombre,
        href: `/colecciones-comerciales/${slug}`,
      }))
    );
  } catch (error) {
    console.error("avisarSeguidores (colección):", error);
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
} satisfies Prisma.CommercialCollectionSelect;

type FilaColeccion = Prisma.CommercialCollectionGetPayload<{
  select: typeof SELECCION;
}>;

function aVista(fila: FilaColeccion): ColeccionVista {
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
      nombre: fila.creator.publicName || fila.creator.name || "Creador",
      /*
        El enlace al perfil solo se ofrece si ese perfil existe
        de verdad: username y creador aprobado.
      */
      username:
        fila.creator.creatorStatus === "APPROVED"
          ? fila.creator.username
          : null,
      avatarUrl: fila.creator.avatarUrl,
      isVerified: fila.creator.isVerified,
    },
    productos,
    sumaIndividual,
    ahorro: calcularAhorroColeccion(precio, sumaIndividual),
    faltanParaPublicar: Math.max(
      0,
      MINIMO_RECURSOS_COLECCION - productos.length
    ),
  };
}

/** Ficha pública. Solo si está publicada. */
export async function obtenerColeccionPublica(
  slug: string
): Promise<ColeccionVista | null> {
  const fila = await prisma.commercialCollection.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}

/** Una colección concreta para su dueño o para administración. */
export async function obtenerColeccion(
  collectionId: string
): Promise<ColeccionVista | null> {
  const fila = await prisma.commercialCollection.findUnique({
    where: { id: collectionId },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}

/** Colecciones de un creador, en cualquier estado. */
export async function listarColeccionesDe(
  creatorId: string
): Promise<ColeccionVista[]> {
  const filas = await prisma.commercialCollection.findMany({
    where: { creatorId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: SELECCION,
  });

  return filas.map(aVista);
}

/** Catálogo público de colecciones. */
export async function listarColeccionesPublicas(
  tope = 24
): Promise<ColeccionVista[]> {
  const filas = await prisma.commercialCollection.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: tope,
    select: SELECCION,
  });

  return filas.map(aVista);
}

/** Todas las colecciones, para administración. */
export async function listarTodasLasColecciones(
  tope = 100
): Promise<ColeccionVista[]> {
  const filas = await prisma.commercialCollection.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: tope,
    select: SELECCION,
  });

  return filas.map(aVista);
}

/* ══════════════ COMPRA ══════════════ */

export type LineaDeColeccion = {
  productId: string;
  price: Prisma.Decimal;
  collectionId: string;
};

/**
 * Convierte una colección en las líneas de pedido que le
 * corresponden.
 *
 * El precio de la colección se REPARTE entre sus recursos en
 * proporción a lo que cuesta cada uno por separado, y la
 * última línea absorbe el redondeo para que las partes sumen
 * exactamente el precio cobrado. Así el cliente paga una sola
 * vez y cada recurso conserva su descarga, su licencia y la
 * ganancia de su creador.
 *
 * Mismo reparto que `expandirPack`: una colección y un pack se
 * cobran igual, solo cambian las reglas para publicarlos.
 */
export async function expandirColeccion(
  collectionId: string
): Promise<
  | { ok: true; lineas: LineaDeColeccion[]; total: Prisma.Decimal }
  | { ok: false; error: string }
> {
  const coleccion = await prisma.commercialCollection.findUnique({
    where: { id: collectionId },
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

  if (!coleccion || coleccion.status !== "PUBLISHED") {
    return { ok: false, error: "Esta colección ya no está disponible." };
  }

  // Solo entran los recursos que siguen publicados.
  const productos = coleccion.items
    .map((i) => i.product)
    .filter((p) => p.status === "PUBLISHED");

  if (productos.length === 0) {
    return {
      ok: false,
      error: "Esta colección no tiene recursos disponibles.",
    };
  }

  const total = new Prisma.Decimal(coleccion.price);

  const suma = productos.reduce(
    (t, p) => t.add(p.price),
    new Prisma.Decimal(0)
  );

  const lineas: LineaDeColeccion[] = [];

  let repartido = new Prisma.Decimal(0);

  productos.forEach((producto, indice) => {
    const ultima = indice === productos.length - 1;

    const parte = ultima
      ? // La última se lleva lo que falte: el redondeo nunca
        // puede hacer que las líneas sumen distinto del total.
        total.sub(repartido)
      : suma.isZero()
        ? total.div(productos.length).toDecimalPlaces(2)
        : total.mul(producto.price).div(suma).toDecimalPlaces(2);

    repartido = repartido.add(parte);

    lineas.push({
      productId: producto.id,
      price: parte,
      collectionId: coleccion.id,
    });
  });

  return { ok: true, lineas, total };
}
