import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import {
  LARGO_BIO_MAXIMO,
  LARGO_BIO_MINIMO,
  LARGO_DESCRIPCION_PORTAFOLIO,
  LARGO_DESCRIPCION_TRABAJO,
  LARGO_ESPECIALIDAD,
  LARGO_EXPERIENCIA,
  LARGO_MOTIVO_RECHAZO,
  LARGO_NOMBRE_PUBLICO,
  LARGO_TITULO_TRABAJO,
  MAXIMO_CATEGORIAS_SOLICITUD,
  MAXIMO_TRABAJOS_PORTAFOLIO,
  errorDeUsername,
  normalizarUrl,
  normalizarUsername,
  type SolicitudVista,
} from "@/lib/solicitudes-comun";

export * from "@/lib/solicitudes-comun";

/**
 * Solicitudes para convertirse en creador.
 *
 * Nadie se vuelve creador por pulsar un botón: rellena una
 * solicitud, la revisa administración y solo entonces cambia
 * su rol. Todo el flujo vive aquí, y el `userId` sale SIEMPRE
 * de la sesión firmada, nunca del cuerpo de la petición.
 */

export type ResultadoSolicitud =
  | { ok: true; id: string }
  | { ok: false; estado: number; error: string };

/* ══════════════ VALIDACIÓN ══════════════ */

type Validada = {
  publicName: string;
  username: string;
  bio: string;
  specialty: string;
  portfolioUrl: string | null;
  portfolioFileUrl: string | null;
  portfolioDescription: string | null;
  portfolioItems: TrabajoValidado[];
  experience: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  otherUrl: string | null;
  categoryIds: string[];
};

/**
 * Comprueba la solicitud entera contra la base.
 *
 * Todo lo que el formulario valida se vuelve a validar aquí:
 * el formulario evita un viaje perdido, pero no es una
 * garantía. Los campos que no existen en este tipo —rol,
 * estado, fechas— simplemente no se leen del cuerpo, así que
 * no hay forma de colarlos.
 */
async function validar(
  userId: string,
  datos: Record<string, unknown>
): Promise<
  { ok: true; datos: Validada } | { ok: false; estado: number; error: string }
> {
  const publicName = String(datos.publicName ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, LARGO_NOMBRE_PUBLICO);

  if (publicName.length < 2) {
    return {
      ok: false,
      estado: 400,
      error: "Escribe el nombre con el que quieres aparecer.",
    };
  }

  const username = normalizarUsername(datos.username);

  const errorUsername = errorDeUsername(username);

  if (errorUsername) {
    return { ok: false, estado: 400, error: errorUsername };
  }

  // Libre, salvo que ya sea suyo.
  const ocupado = await prisma.user.findFirst({
    where: { username, id: { not: userId } },
    select: { id: true },
  });

  if (ocupado) {
    return {
      ok: false,
      estado: 409,
      error: "Ese nombre de usuario ya está en uso.",
    };
  }

  const bio = String(datos.bio ?? "")
    .trim()
    .slice(0, LARGO_BIO_MAXIMO);

  if (bio.length < LARGO_BIO_MINIMO) {
    return {
      ok: false,
      estado: 400,
      error: `Cuéntanos algo más: la biografía necesita al menos ${LARGO_BIO_MINIMO} caracteres.`,
    };
  }

  const specialty = String(datos.specialty ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, LARGO_ESPECIALIDAD);

  if (specialty.length < 3) {
    return {
      ok: false,
      estado: 400,
      error: "Indica en qué te especializas.",
    };
  }

  /*
    PORTAFOLIO: obligatorio.

    Vale un enlace público o un archivo subido al almacén
    privado, pero tiene que haber uno. Sin una muestra de
    trabajo no hay nada que revisar, y aprobar a ciegas
    convertiría la revisión en un trámite.
  */
  const portfolioUrl = normalizarUrl(datos.portfolioUrl);

  const archivoCrudo = String(datos.portfolioFileUrl ?? "").trim();

  const portfolioFileUrl = archivoCrudo || null;

  /*
    TRABAJOS DEL PORTAFOLIO

    La forma nueva de presentar el trabajo: varias piezas, en
    el orden que elija el candidato. Cada una necesita título
    y, al menos, una imagen o un enlace: un título suelto no
    enseña nada.

    Convive con el enlace y el archivo de siempre, que siguen
    siendo válidos. Basta con UNA de las tres formas.
  */
  const trabajos = validarTrabajos(datos.portfolioItems);

  if (!trabajos.ok) return trabajos;

  if (!portfolioUrl && !portfolioFileUrl && trabajos.items.length === 0) {
    if (String(datos.portfolioUrl ?? "").trim()) {
      return {
        ok: false,
        estado: 400,
        error:
          "El enlace del portafolio no es válido. Debe empezar por http:// o https://.",
      };
    }

    return {
      ok: false,
      estado: 400,
      error:
        "Añade tu portafolio: sube al menos un trabajo, o deja un enlace o un archivo.",
    };
  }

  // Las redes son opcionales, pero si vienen, tienen que servir.
  const redes: Record<string, string | null> = {};

  for (const campo of [
    "websiteUrl",
    "instagramUrl",
    "facebookUrl",
    "tiktokUrl",
    "otherUrl",
  ] as const) {
    const crudo = String(datos[campo] ?? "").trim();

    if (!crudo) {
      redes[campo] = null;
      continue;
    }

    const limpio = normalizarUrl(crudo);

    if (!limpio) {
      return {
        ok: false,
        estado: 400,
        error: `El enlace de ${
          campo === "websiteUrl"
            ? "tu sitio web"
            : campo.replace("Url", "")
        } no es válido.`,
      };
    }

    redes[campo] = limpio;
  }

  /*
    CATEGORÍAS: tienen que existir y estar activas.

    El formulario solo ofrece las reales, pero esta comprobación
    es la que impide que alguien invente una categoría enviando
    un id cualquiera.
  */
  const pedidas = Array.isArray(datos.categoryIds)
    ? [
        ...new Set(
          datos.categoryIds
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter(Boolean)
        ),
      ]
    : [];

  if (pedidas.length === 0) {
    return {
      ok: false,
      estado: 400,
      error: "Elige al menos una categoría.",
    };
  }

  if (pedidas.length > MAXIMO_CATEGORIAS_SOLICITUD) {
    return {
      ok: false,
      estado: 400,
      error: `Elige como mucho ${MAXIMO_CATEGORIAS_SOLICITUD} categorías.`,
    };
  }

  const existentes = await prisma.category.findMany({
    where: { id: { in: pedidas }, isActive: true },
    select: { id: true },
  });

  if (existentes.length !== pedidas.length) {
    return {
      ok: false,
      estado: 400,
      error: "Alguna de las categorías elegidas no existe.",
    };
  }

  return {
    ok: true,
    datos: {
      publicName,
      username,
      bio,
      specialty,
      portfolioUrl,
      portfolioFileUrl,
      portfolioDescription: textoCorto(
        datos.portfolioDescription,
        LARGO_DESCRIPCION_PORTAFOLIO
      ),
      portfolioItems: trabajos.items,
      experience: textoCorto(datos.experience, LARGO_EXPERIENCIA),
      avatarUrl: textoCorto(datos.avatarUrl, 500),
      coverUrl: textoCorto(datos.coverUrl, 500),
      websiteUrl: redes.websiteUrl,
      instagramUrl: redes.instagramUrl,
      facebookUrl: redes.facebookUrl,
      tiktokUrl: redes.tiktokUrl,
      otherUrl: redes.otherUrl,
      categoryIds: pedidas,
    },
  };
}

/** Texto recortado, o null si venía vacío. Nunca guarda "". */
function textoCorto(valor: unknown, largo: number): string | null {
  const limpio = String(valor ?? "")
    .trim()
    /*
      Espacios repetidos a uno solo. `\s`, no `s`: escrito sin
      la barra esto borraba TODAS las eses del texto, y una URL
      guardada así dejaba de ser una URL.
    */
    .replace(/\s+/g, " ")
    .slice(0, largo);

  return limpio || null;
}

type TrabajoValidado = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

/**
 * Revisa los trabajos que llegan del formulario.
 *
 * Se exige título y algo que mirar. El orden lo da la posición
 * en la lista, no un número que mande el cliente: así no puede
 * colar dos piezas en el mismo puesto.
 */
function validarTrabajos(
  crudo: unknown
):
  | { ok: true; items: TrabajoValidado[] }
  | { ok: false; estado: number; error: string } {
  if (crudo === undefined || crudo === null) return { ok: true, items: [] };

  if (!Array.isArray(crudo)) {
    return { ok: false, estado: 400, error: "El portafolio no es válido." };
  }

  if (crudo.length > MAXIMO_TRABAJOS_PORTAFOLIO) {
    return {
      ok: false,
      estado: 400,
      error: `El portafolio admite hasta ${MAXIMO_TRABAJOS_PORTAFOLIO} trabajos.`,
    };
  }

  const items: TrabajoValidado[] = [];

  for (const [indice, fila] of crudo.entries()) {
    if (!fila || typeof fila !== "object") continue;

    const dato = fila as Record<string, unknown>;

    const title = textoCorto(dato.title, LARGO_TITULO_TRABAJO);

    const imageUrl = textoCorto(dato.imageUrl, 500);
    const linkUrl = normalizarUrl(dato.linkUrl);

    if (!title) {
      return {
        ok: false,
        estado: 400,
        error: `Ponle título al trabajo ${indice + 1}.`,
      };
    }

    if (!imageUrl && !linkUrl) {
      return {
        ok: false,
        estado: 400,
        error: `El trabajo «${title}» necesita una imagen o un enlace.`,
      };
    }

    items.push({
      title,
      description: textoCorto(dato.description, LARGO_DESCRIPCION_TRABAJO),
      imageUrl,
      linkUrl,
    });
  }

  return { ok: true, items };
}

/* ══════════════ ENVÍO ══════════════ */

/**
 * Registra una solicitud.
 *
 * El usuario NO cambia de rol aquí. Lo único que se toca de su
 * cuenta es `creatorStatus`, que pasa a PENDING para que la
 * interfaz sepa que hay algo en curso; sigue siendo CLIENT y
 * sigue sin poder entrar al Creator Studio.
 */
export async function enviarSolicitud(
  userId: string,
  datos: Record<string, unknown>
): Promise<ResultadoSolicitud> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, creatorStatus: true },
  });

  if (!usuario) {
    return { ok: false, estado: 404, error: "Usuario no encontrado." };
  }

  if (usuario.role === "CREATOR" || usuario.role === "ADMIN") {
    return {
      ok: false,
      estado: 409,
      error: "Ya puedes publicar recursos en RCKTDMG.",
    };
  }

  // Una sola solicitud viva a la vez.
  const enCurso = await prisma.creatorApplication.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });

  if (enCurso) {
    return {
      ok: false,
      estado: 409,
      error: "Ya tienes una solicitud en revisión.",
    };
  }

  const validada = await validar(userId, datos);

  if (!validada.ok) return validada;

  const v = validada.datos;

  const solicitud = await prisma.$transaction(async (tx) => {
    const creada = await tx.creatorApplication.create({
      data: {
        userId,
        publicName: v.publicName,
        username: v.username,
        bio: v.bio,
        specialty: v.specialty,
        portfolioUrl: v.portfolioUrl,
        portfolioFileUrl: v.portfolioFileUrl,
        portfolioDescription: v.portfolioDescription,
        experience: v.experience,
        avatarUrl: v.avatarUrl,
        coverUrl: v.coverUrl,
        websiteUrl: v.websiteUrl,
        instagramUrl: v.instagramUrl,
        facebookUrl: v.facebookUrl,
        tiktokUrl: v.tiktokUrl,
        otherUrl: v.otherUrl,
        categories: {
          create: v.categoryIds.map((categoryId) => ({ categoryId })),
        },
        /* El orden lo fija la posición, no un número del cliente. */
        portfolioItems: {
          create: v.portfolioItems.map((trabajo, indice) => ({
            ...trabajo,
            sortOrder: indice,
          })),
        },
      },
      select: { id: true },
    });

    /*
      `creatorStatus` pasa a PENDING, pero el ROL no se toca.
      Quien pide ser creador sigue siendo cliente hasta que
      administración diga otra cosa.
    */
    await tx.user.update({
      where: { id: userId },
      data: { creatorStatus: "PENDING" },
    });

    return creada;
  });

  await avisarAdministracion(v.publicName, solicitud.id);

  return { ok: true, id: solicitud.id };
}

async function avisarAdministracion(
  nombre: string,
  solicitudId: string
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await crearNotificacion({
        userId: admin.id,
        type: "CREATOR_APPLICATION_SUBMITTED",
        title: "Nueva solicitud de creador",
        body: `${nombre} quiere publicar en RCKTDMG.`,
        href: `/admin/creadores?id=${solicitudId}`,
      });
    }
  } catch (error) {
    console.error("avisarAdministracion:", error);
  }
}

/* ══════════════ REVISIÓN ══════════════ */

/**
 * Aprueba una solicitud y convierte al usuario en creador.
 *
 * Los datos del perfil se COPIAN a `User` en la misma
 * transacción: el creador estrena su perfil público con lo
 * que escribió al solicitar, sin tener que rellenarlo otra
 * vez. No se crea ningún usuario nuevo ni ningún perfil
 * aparte: es la misma cuenta, con otro rol.
 */
export async function aprobarSolicitud(
  solicitudId: string,
  adminId: string
): Promise<ResultadoSolicitud> {
  const solicitud = await prisma.creatorApplication.findUnique({
    where: { id: solicitudId },
    select: {
      id: true,
      userId: true,
      status: true,
      publicName: true,
      username: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      websiteUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      tiktokUrl: true,
      /* Para comprobar que hay algo que revisar. */
      portfolioUrl: true,
      portfolioFileUrl: true,
      _count: { select: { portfolioItems: true } },
    },
  });

  if (!solicitud) {
    return { ok: false, estado: 404, error: "Solicitud no encontrada." };
  }

  /*
    SIN PORTAFOLIO NO SE APRUEBA.

    El formulario ya lo exige al enviar, así que en la práctica
    no debería llegar aquí ninguna sin él. Se comprueba
    igualmente porque aprobar es irreversible —cambia el rol—
    y porque las solicitudes viejas se crearon con otras
    reglas: más vale un 409 que un creador aprobado sin que
    nadie haya visto su trabajo.
  */
  if (
    !solicitud.portfolioUrl &&
    !solicitud.portfolioFileUrl &&
    solicitud._count.portfolioItems === 0
  ) {
    return {
      ok: false,
      estado: 409,
      error:
        "Esta solicitud no tiene portafolio. Pídele al candidato que lo añada antes de aprobarla.",
    };
  }

  if (solicitud.status !== "PENDING") {
    return {
      ok: false,
      estado: 409,
      error: "Esta solicitud ya fue revisada.",
    };
  }

  /*
    El username pudo quedar ocupado entre el envío y la
    revisión. Se comprueba otra vez antes de escribirlo, con
    la restricción única de la base como última red.
  */
  const ocupado = await prisma.user.findFirst({
    where: { username: solicitud.username, id: { not: solicitud.userId } },
    select: { id: true },
  });

  if (ocupado) {
    return {
      ok: false,
      estado: 409,
      error:
        "El nombre de usuario solicitado ya está ocupado. Pide al solicitante que elija otro.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.creatorApplication.update({
        where: { id: solicitudId },
        data: {
          status: "APPROVED",
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.user.update({
        where: { id: solicitud.userId },
        data: {
          role: "CREATOR",
          creatorStatus: "APPROVED",
          username: solicitud.username,
          publicName: solicitud.publicName,
          bio: solicitud.bio,
          /*
            La foto y la portada solo se copian si las envió:
            un null aquí borraría las que ya tuviera puestas.
          */
          ...(solicitud.avatarUrl ? { avatarUrl: solicitud.avatarUrl } : {}),
          ...(solicitud.coverUrl ? { coverUrl: solicitud.coverUrl } : {}),
          websiteUrl: solicitud.websiteUrl,
          instagramUrl: solicitud.instagramUrl,
          facebookUrl: solicitud.facebookUrl,
          tiktokUrl: solicitud.tiktokUrl,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        estado: 409,
        error: "El nombre de usuario solicitado ya está ocupado.",
      };
    }

    throw error;
  }

  try {
    await crearNotificacion({
      userId: solicitud.userId,
      type: "CREATOR_APPLICATION_APPROVED",
      title: "Ya eres creador en RCKTDMG",
      body: "Tu solicitud fue aprobada. Ya puedes publicar recursos.",
      href: "/creadores/panel",
    });
  } catch (error) {
    console.error("aviso de aprobación:", error);
  }

  return { ok: true, id: solicitudId };
}

/**
 * Rechaza una solicitud.
 *
 * El motivo es obligatorio: un rechazo sin explicación no le
 * dice a nadie qué corregir. El usuario vuelve a su estado de
 * cliente y puede presentar otra solicitud cuando quiera,
 * porque la restricción es "una PENDIENTE a la vez", no "una
 * en la vida".
 */
export async function rechazarSolicitud(
  solicitudId: string,
  adminId: string,
  motivoCrudo: unknown
): Promise<ResultadoSolicitud> {
  const motivo = String(motivoCrudo ?? "")
    .trim()
    .slice(0, LARGO_MOTIVO_RECHAZO);

  if (motivo.length < 10) {
    return {
      ok: false,
      estado: 400,
      error:
        "Explica el motivo del rechazo: es lo que le permite corregir y volver a intentarlo.",
    };
  }

  const solicitud = await prisma.creatorApplication.findUnique({
    where: { id: solicitudId },
    select: { id: true, userId: true, status: true },
  });

  if (!solicitud) {
    return { ok: false, estado: 404, error: "Solicitud no encontrada." };
  }

  if (solicitud.status !== "PENDING") {
    return {
      ok: false,
      estado: 409,
      error: "Esta solicitud ya fue revisada.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.creatorApplication.update({
      where: { id: solicitudId },
      data: {
        status: "REJECTED",
        rejectionReason: motivo,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: solicitud.userId },
      data: { creatorStatus: "REJECTED" },
    });
  });

  try {
    await crearNotificacion({
      userId: solicitud.userId,
      type: "CREATOR_APPLICATION_REJECTED",
      title: "Tu solicitud no fue aprobada",
      body: motivo,
      href: "/creadores/unete",
    });
  } catch (error) {
    console.error("aviso de rechazo:", error);
  }

  return { ok: true, id: solicitudId };
}

/* ══════════════ LECTURA ══════════════ */

const SELECCION = {
  id: true,
  status: true,
  publicName: true,
  username: true,
  bio: true,
  specialty: true,
  portfolioUrl: true,
  portfolioFileUrl: true,
  portfolioDescription: true,
  experience: true,
  avatarUrl: true,
  coverUrl: true,
  websiteUrl: true,
  instagramUrl: true,
  facebookUrl: true,
  tiktokUrl: true,
  otherUrl: true,
  rejectionReason: true,
  portfolioItems: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      title: true,
      description: true,
      imageUrl: true,
      linkUrl: true,
    },
  },
  createdAt: true,
  reviewedAt: true,
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
  categories: {
    select: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.CreatorApplicationSelect;

type Fila = Prisma.CreatorApplicationGetPayload<{
  select: typeof SELECCION;
}>;

function aVista(fila: Fila): SolicitudVista {
  return {
    id: fila.id,
    estado: fila.status,
    publicName: fila.publicName,
    username: fila.username,
    bio: fila.bio,
    specialty: fila.specialty,
    portfolioUrl: fila.portfolioUrl,
    portfolioDescription: fila.portfolioDescription,
    trabajos: fila.portfolioItems,
    experience: fila.experience,
    avatarUrl: fila.avatarUrl,
    coverUrl: fila.coverUrl,
    otherUrl: fila.otherUrl,
    /*
      La URL del archivo NO sale de aquí: apunta al almacén
      privado. La interfaz solo sabe que existe, y para abrirlo
      administración pasa por la ruta protegida.
    */
    tieneArchivo: Boolean(fila.portfolioFileUrl),
    websiteUrl: fila.websiteUrl,
    instagramUrl: fila.instagramUrl,
    facebookUrl: fila.facebookUrl,
    tiktokUrl: fila.tiktokUrl,
    categorias: fila.categories.map((c) => c.category),
    rejectionReason: fila.rejectionReason,
    createdAt: fila.createdAt.toISOString(),
    reviewedAt: fila.reviewedAt ? fila.reviewedAt.toISOString() : null,
    solicitante: {
      id: fila.user.id,
      nombre: fila.user.name || "Sin nombre",
      email: fila.user.email,
      avatarUrl: fila.user.avatarUrl,
    },
  };
}

/** La última solicitud de un usuario, sea cual sea su estado. */
export async function solicitudDe(
  userId: string
): Promise<SolicitudVista | null> {
  const fila = await prisma.creatorApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}

/** Cola de administración. Pendientes primero. */
export async function listarSolicitudes(
  estado?: string
): Promise<SolicitudVista[]> {
  const filas = await prisma.creatorApplication.findMany({
    where:
      estado === "PENDING" || estado === "APPROVED" || estado === "REJECTED"
        ? { status: estado }
        : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: SELECCION,
  });

  return filas.map(aVista);
}

/** Recuento por estado, para el panel. */
export async function contarSolicitudes(): Promise<{
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
}> {
  const filas = await prisma.creatorApplication.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const de = (estado: string) =>
    filas.find((f) => f.status === estado)?._count._all ?? 0;

  return {
    pendientes: de("PENDING"),
    aprobadas: de("APPROVED"),
    rechazadas: de("REJECTED"),
  };
}

/**
 * URL privada del portafolio de una solicitud.
 *
 * Solo la llama la ruta de administración, que ya comprobó el
 * rol. Se aísla aquí para que ninguna consulta de listado
 * arrastre esa referencia por descuido.
 */
export async function archivoDePortafolio(
  solicitudId: string
): Promise<string | null> {
  const fila = await prisma.creatorApplication.findUnique({
    where: { id: solicitudId },
    select: { portfolioFileUrl: true },
  });

  return fila?.portfolioFileUrl ?? null;
}
