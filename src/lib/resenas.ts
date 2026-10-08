import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import {
  REPARTO_VACIO,
  RESENAS_POR_PAGINA,
  limpiarComentario,
  notaValida,
  type ResenaVista,
  type ResumenValoracion,
} from "@/lib/resenas-comun";

export * from "@/lib/resenas-comun";

/**
 * Reseñas de recursos.
 *
 * Todo pasa por aquí: quién puede valorar, la escritura y el
 * recálculo de la media. Ninguna ruta habla con
 * `prisma.review` por su cuenta, porque cada escritura tiene
 * que actualizar también los agregados del producto y eso no
 * puede quedar al criterio de quien llame.
 */

/* ══════════════ QUIÉN PUEDE VALORAR ══════════════ */

export type Elegibilidad =
  | { puede: true }
  | {
      puede: false;
      /** Motivo legible. La interfaz lo muestra tal cual. */
      motivo: string;
    };

/**
 * ¿Este usuario puede valorar este recurso?
 *
 * Hoy el acceso legítimo se demuestra de dos formas, las dos
 * apoyadas en datos que ya existen:
 *
 *   · una descarga concedida y vigente, o
 *   · una línea de pedido pagada.
 *
 * SOBRE LAS SUSCRIPCIONES
 *
 * El plan es que una suscripción activa también dé derecho a
 * valorar. Todavía NO se comprueba, y es deliberado: en este
 * proyecto `Subscription` existe en el esquema pero ningún
 * código la usa —nadie se suscribe y `accessType` no se
 * aplica en ninguna parte—, así que comprobarla aquí sería
 * escribir una condición que nunca se cumple y aparentar una
 * función que no existe.
 *
 * Cuando las suscripciones funcionen, este es el único sitio
 * que hay que tocar: todo lo demás pregunta por aquí.
 */
export async function puedeValorar(
  userId: string,
  productId: string
): Promise<Elegibilidad> {
  const producto = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, creatorId: true },
  });

  if (!producto || producto.status !== "PUBLISHED") {
    return { puede: false, motivo: "Este recurso no está disponible." };
  }

  /*
    Nadie valora lo suyo. No es una regla de cortesía: la media
    es un dato que usan los compradores para decidir, y dejar
    que el vendedor la mueva la convierte en propaganda.
  */
  if (producto.creatorId === userId) {
    return {
      puede: false,
      motivo: "No puedes valorar un recurso que has publicado tú.",
    };
  }

  const [descarga, compra] = await Promise.all([
    prisma.download.findFirst({
      where: {
        userId,
        productId,
        status: "ACTIVE",
        order: { status: "PAID" },
      },
      select: { id: true },
    }),

    prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: "PAID" },
      },
      select: { id: true },
    }),
  ]);

  if (descarga || compra) return { puede: true };

  return {
    puede: false,
    motivo:
      "Solo pueden valorar este recurso quienes lo han adquirido.",
  };
}

/* ══════════════ AGREGADOS ══════════════ */

/**
 * Recalcula media y número de reseñas de un producto.
 *
 * Va SIEMPRE dentro de la misma transacción que la escritura
 * que la provoca. Si se hiciera aparte, un fallo entre las dos
 * dejaría la ficha enseñando una media que no corresponde a
 * sus reseñas, que es exactamente el tipo de mentira que estos
 * campos desnormalizados pueden producir.
 *
 * Solo cuentan las PUBLICADAS: ocultar una reseña la quita de
 * la media en el mismo acto.
 */
async function recalcular(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<void> {
  const r = await tx.review.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const total = r._count._all;

  await tx.product.update({
    where: { id: productId },
    data: {
      // Sin reseñas se vuelve a null, no a 0: "sin valorar" y
      // "valorado con un cero" no son lo mismo.
      avgRating:
        total > 0 && r._avg.rating !== null
          ? new Prisma.Decimal(r._avg.rating.toFixed(2))
          : null,
      reviewCount: total,
    },
  });
}

/* ══════════════ ESCRITURA ══════════════ */

export type ResultadoEscritura =
  | { ok: true; creada: boolean }
  | { ok: false; estado: number; error: string };

/**
 * Crea o actualiza la reseña de un usuario sobre un recurso.
 *
 * Es un upsert por (userId, productId): volver a enviar el
 * formulario edita la reseña en lugar de añadir otra, y el
 * índice único lo garantiza aunque lleguen dos peticiones a
 * la vez.
 */
export async function guardarResena(
  userId: string,
  productId: string,
  datos: { rating: unknown; comment: unknown }
): Promise<ResultadoEscritura> {
  if (!notaValida(datos.rating)) {
    return {
      ok: false,
      estado: 400,
      error: "La valoración debe ser un número entero del 1 al 5.",
    };
  }

  const elegible = await puedeValorar(userId, productId);

  if (!elegible.puede) {
    return { ok: false, estado: 403, error: elegible.motivo };
  }

  const rating = Number(datos.rating);
  const comment = limpiarComentario(datos.comment);

  const previa = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true, status: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, rating, comment },
      /*
        Editar NO devuelve a PUBLISHED una reseña oculta: si
        lo hiciera, bastaría con reenviar el formulario para
        deshacer una decisión de moderación.
      */
      update: { rating, comment },
    });

    await recalcular(tx, productId);
  });

  // El aviso al creador va fuera de la transacción y solo la
  // primera vez: editar la nota no es un hecho nuevo.
  if (!previa) {
    const producto = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, slug: true, creatorId: true },
    });

    if (producto) {
      await crearNotificacion({
        userId: producto.creatorId,
        type: "REVIEW",
        title: "Nueva valoración",
        body: `${producto.name} recibió ${rating} ${
          rating === 1 ? "estrella" : "estrellas"
        }.`,
        href: `/tienda/${producto.slug}`,
      });
    }
  }

  return { ok: true, creada: previa === null };
}

/**
 * Borra la reseña propia de un usuario.
 *
 * El `userId` va en el WHERE: la consulta no puede alcanzar la
 * reseña de otra persona ni por error.
 */
export async function borrarResenaPropia(
  userId: string,
  productId: string
): Promise<boolean> {
  const suya = await prisma.review.findFirst({
    where: { userId, productId },
    select: { id: true },
  });

  if (!suya) return false;

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: suya.id } });

    await recalcular(tx, productId);
  });

  return true;
}

/* ══════════════ MODERACIÓN ══════════════ */

/**
 * Oculta o vuelve a publicar una reseña. Solo administración.
 *
 * Ocultarla la saca de la media en el mismo acto, y avisa a
 * quien la escribió: una reseña que desaparece sin explicación
 * parece un fallo de la plataforma.
 */
export async function moderarResena(
  reviewId: string,
  estado: "PUBLISHED" | "HIDDEN",
  nota?: unknown
): Promise<boolean> {
  const resena = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      userId: true,
      productId: true,
      product: { select: { name: true, slug: true } },
    },
  });

  if (!resena) return false;

  const cambia = resena.status !== estado;

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: resena.id },
      data: {
        status: estado,
        moderationNote:
          estado === "HIDDEN" ? limpiarComentario(nota) : null,
      },
    });

    await recalcular(tx, resena.productId);
  });

  if (cambia && estado === "HIDDEN") {
    await crearNotificacion({
      userId: resena.userId,
      type: "REVIEW_HIDDEN",
      title: "Tu valoración fue retirada",
      body: `Tu reseña de ${resena.product.name} ya no es visible.`,
      href: `/tienda/${resena.product.slug}`,
    });
  }

  return true;
}

/** Borra una reseña definitivamente. Solo administración. */
export async function borrarResenaComoAdmin(
  reviewId: string
): Promise<boolean> {
  const resena = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true },
  });

  if (!resena) return false;

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: resena.id } });

    await recalcular(tx, resena.productId);
  });

  return true;
}

/* ══════════════ LECTURA ══════════════ */

function aVista(
  fila: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: {
      name: string | null;
      publicName: string | null;
      username: string | null;
      avatarUrl: string | null;
      creatorStatus: string | null;
    };
  },
  userId: string | null
): ResenaVista {
  return {
    id: fila.id,
    rating: fila.rating,
    comment: fila.comment,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
    autor: {
      // Nunca el correo: es un dato privado de quien escribe.
      nombre:
        fila.user.publicName ||
        fila.user.name ||
        "Usuario de RcktX",
      avatarUrl: fila.user.avatarUrl,
      username:
        fila.user.creatorStatus === "APPROVED"
          ? fila.user.username
          : null,
    },
    esMia: userId !== null && fila.userId === userId,
  };
}

const SELECCION_AUTOR = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: {
      name: true,
      publicName: true,
      username: true,
      avatarUrl: true,
      creatorStatus: true,
    },
  },
} satisfies Prisma.ReviewSelect;

export type ListadoResenas = {
  resenas: ResenaVista[];
  resumen: ResumenValoracion;
  pagina: number;
  totalPaginas: number;
  /** La reseña del visitante, aunque no esté en esta página. */
  mia: ResenaVista | null;
};

/**
 * Reseñas públicas de un recurso.
 *
 * Solo las PUBLICADAS: una reseña oculta no aparece ni suma.
 * La propia del visitante se devuelve aparte para que el
 * formulario pueda precargarla sin recorrer las páginas.
 */
export async function obtenerResenas(
  productId: string,
  userId: string | null,
  pagina = 1
): Promise<ListadoResenas> {
  const where = {
    productId,
    status: "PUBLISHED" as const,
  };

  const [total, reparto, mia] = await Promise.all([
    prisma.review.count({ where }),

    prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
    }),

    userId
      ? prisma.review.findFirst({
          where: { productId, userId, status: "PUBLISHED" },
          select: SELECCION_AUTOR,
        })
      : Promise.resolve(null),
  ]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(total / RESENAS_POR_PAGINA)
  );

  const actual = Math.min(
    Number.isFinite(pagina) && pagina > 1 ? Math.floor(pagina) : 1,
    totalPaginas
  );

  const filas = await prisma.review.findMany({
    where,
    // El id cierra el orden para que paginar sea estable.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (actual - 1) * RESENAS_POR_PAGINA,
    take: RESENAS_POR_PAGINA,
    select: SELECCION_AUTOR,
  });

  const cuenta = { ...REPARTO_VACIO };
  let suma = 0;

  for (const fila of reparto) {
    const nota = fila.rating as 1 | 2 | 3 | 4 | 5;

    cuenta[nota] = fila._count._all;
    suma += nota * fila._count._all;
  }

  return {
    resenas: filas.map((f) => aVista(f, userId)),
    resumen: {
      media: total > 0 ? suma / total : null,
      total,
      reparto: cuenta,
    },
    pagina: actual,
    totalPaginas,
    mia: mia ? aVista(mia, userId) : null,
  };
}
