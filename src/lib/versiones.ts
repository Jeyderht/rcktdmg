import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crearNotificaciones } from "@/lib/notificaciones";
import { formatoDesdeUrl } from "@/lib/producto-metadata";
import {
  compararVersiones,
  limpiarChangelog,
  mostrarVersion,
  normalizarVersion,
  type VersionVista,
} from "@/lib/versiones-comun";

export * from "@/lib/versiones-comun";

/**
 * Versiones de un recurso digital.
 *
 * QUÉ VERSIÓN RECIBE CADA UNO
 *
 * Todo comprador con licencia vigente descarga la versión
 * VIGENTE, también quien compró antes de que existiera. Una
 * corrección publicada hoy no puede quedar fuera del alcance
 * de quien pagó ayer; eso es lo que la gente espera al comprar
 * una plantilla, y lo contrario se percibe como un cobro por
 * el mismo producto.
 *
 * Lo que sí queda registrado es qué versión compró cada uno,
 * en `Download.versionId`. Es un dato histórico y NUNCA se
 * reescribe: las descargas anteriores a esta etapa se quedan
 * en null, que significa "se compró cuando no había
 * versiones", y siguen funcionando igual que siempre.
 *
 * EL ESPEJO
 *
 * Al publicar una versión, su archivo se copia también a
 * `Product.fileUrl` y `Product.fileFormat`. Así la ficha
 * pública, el panel del creador, el de administración y el
 * envío a revisión siguen leyendo lo de siempre y ven el
 * archivo correcto, sin tocar ninguno de esos sitios.
 */

export const MAXIMO_VERSIONES = 100;

export type ResultadoVersion =
  | { ok: true; id: string; version: string }
  | { ok: false; estado: number; error: string };

/**
 * Comprueba que el recurso existe y que quien lo edita puede.
 *
 * Un creador solo administra lo suyo; ADMIN puede con todo,
 * que es la misma regla que ya aplican el resto de rutas del
 * Creator Studio.
 */
async function productoEditable(
  productId: string,
  userId: string,
  role: string
) {
  const producto = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      creatorId: true,
      fileUrl: true,
      fileFormat: true,
    },
  });

  if (!producto) return { producto: null, permitido: false };

  const permitido =
    role === "ADMIN" || producto.creatorId === userId;

  return { producto, permitido };
}

/**
 * Publica una versión nueva.
 *
 * El índice único sobre (productId, version) impide dos
 * versiones con el mismo número, y de paso hace que un doble
 * envío del formulario no cree dos filas: la segunda choca
 * con P2002 y se responde 409 en vez de duplicar.
 */
export async function crearVersion(
  productId: string,
  usuario: { userId: string; role: string },
  datos: {
    version: unknown;
    fileUrl: unknown;
    changelog: unknown;
    hacerActual?: boolean;
  }
): Promise<ResultadoVersion> {
  const { producto, permitido } = await productoEditable(
    productId,
    usuario.userId,
    usuario.role
  );

  if (!producto) {
    return { ok: false, estado: 404, error: "Recurso no encontrado." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes administrar las versiones de este recurso.",
    };
  }

  const version = normalizarVersion(datos.version);

  if (!version) {
    return {
      ok: false,
      estado: 400,
      error:
        "El número de versión no es válido. Usa por ejemplo 1.0, 2.1 o 2.1.3.",
    };
  }

  const fileUrl =
    typeof datos.fileUrl === "string" ? datos.fileUrl.trim() : "";

  if (!fileUrl) {
    return {
      ok: false,
      estado: 400,
      error: "Sube el archivo de esta versión.",
    };
  }

  const cuantas = await prisma.productVersion.count({
    where: { productId },
  });

  if (cuantas >= MAXIMO_VERSIONES) {
    return {
      ok: false,
      estado: 400,
      error: `Este recurso ya tiene ${MAXIMO_VERSIONES} versiones.`,
    };
  }

  /*
    La primera versión de un recurso es siempre la vigente:
    publicarla y dejarla sin marcar dejaría el recurso sin
    archivo actual.
  */
  const actual = cuantas === 0 ? true : datos.hacerActual !== false;

  const changelog = limpiarChangelog(datos.changelog);
  const fileFormat = formatoDesdeUrl(fileUrl);

  try {
    const creada = await prisma.$transaction(async (tx) => {
      const nueva = await tx.productVersion.create({
        data: {
          productId,
          version,
          fileUrl,
          fileFormat,
          changelog,
          isCurrent: actual,
        },
        select: { id: true, version: true },
      });

      if (actual) {
        // Solo una vigente por recurso.
        await tx.productVersion.updateMany({
          where: { productId, id: { not: nueva.id } },
          data: { isCurrent: false },
        });

        // El espejo, en la misma transacción que el cambio.
        await tx.product.update({
          where: { id: productId },
          data: { fileUrl, fileFormat },
        });
      }

      return nueva;
    });

    if (actual) {
      await avisarCompradores(productId, producto.name, producto.slug, version);
    }

    return { ok: true, id: creada.id, version: creada.version };
  } catch (error) {
    const repetida =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    if (repetida) {
      return {
        ok: false,
        estado: 409,
        error: `Este recurso ya tiene una versión ${mostrarVersion(
          version
        )}.`,
      };
    }

    console.error("crearVersion:", error);

    return {
      ok: false,
      estado: 500,
      error: "No se pudo publicar la versión.",
    };
  }
}

/**
 * Cambia cuál es la versión vigente.
 *
 * Permite volver atrás si una versión sale defectuosa, sin
 * borrar nada ni perder el historial.
 */
export async function marcarVersionActual(
  productId: string,
  versionId: string,
  usuario: { userId: string; role: string }
): Promise<ResultadoVersion> {
  const { producto, permitido } = await productoEditable(
    productId,
    usuario.userId,
    usuario.role
  );

  if (!producto) {
    return { ok: false, estado: 404, error: "Recurso no encontrado." };
  }

  if (!permitido) {
    return {
      ok: false,
      estado: 403,
      error: "No puedes administrar las versiones de este recurso.",
    };
  }

  const version = await prisma.productVersion.findFirst({
    // productId en el WHERE: no se puede activar la versión de
    // otro recurso pasando su id.
    where: { id: versionId, productId },
    select: { id: true, version: true, fileUrl: true, fileFormat: true },
  });

  if (!version) {
    return { ok: false, estado: 404, error: "Versión no encontrada." };
  }

  await prisma.$transaction([
    prisma.productVersion.updateMany({
      where: { productId },
      data: { isCurrent: false },
    }),

    prisma.productVersion.update({
      where: { id: version.id },
      data: { isCurrent: true },
    }),

    prisma.product.update({
      where: { id: productId },
      data: {
        fileUrl: version.fileUrl,
        fileFormat: version.fileFormat,
      },
    }),
  ]);

  return { ok: true, id: version.id, version: version.version };
}

/**
 * Avisa a quien compró el recurso de que hay versión nueva.
 *
 * Solo a quien tiene licencia VIGENTE: si se le retiró por un
 * reembolso, ya no es su recurso. Se manda un aviso por
 * persona, no por compra: quien lo compró dos veces no recibe
 * dos avisos iguales.
 */
async function avisarCompradores(
  productId: string,
  nombre: string,
  slug: string,
  version: string
): Promise<void> {
  try {
    const titulares = await prisma.license.findMany({
      where: { productId, status: "ACTIVE" },
      select: { userId: true },
      distinct: ["userId"],
    });

    if (titulares.length === 0) return;

    await crearNotificaciones(
      titulares.map((t) => ({
        userId: t.userId,
        type: "PRODUCT_VERSION" as const,
        title: "Nueva versión disponible",
        body: `${nombre} se actualizó a ${mostrarVersion(version)}. Ya puedes descargarla.`,
        href: "/mi-cuenta/descargas",
      }))
    );
  } catch (error) {
    console.error("avisarCompradores:", error);
  }
}

/* ══════════════ LECTURA ══════════════ */

/**
 * Versión vigente de un recurso, o null si no tiene ninguna.
 *
 * null NO es un error: los recursos anteriores a esta etapa no
 * tienen versiones y su archivo es `Product.fileUrl`.
 */
export async function versionVigente(productId: string) {
  return prisma.productVersion.findFirst({
    where: { productId, isCurrent: true },
    select: {
      id: true,
      version: true,
      fileUrl: true,
      fileFormat: true,
    },
  });
}

/** Historial completo, de la más nueva a la más antigua. */
export async function listarVersiones(
  productId: string
): Promise<VersionVista[]> {
  const filas = await prisma.productVersion.findMany({
    where: { productId },
    select: {
      id: true,
      version: true,
      fileFormat: true,
      changelog: true,
      isCurrent: true,
      createdAt: true,
    },
  });

  return filas
    .sort((a, b) => compararVersiones(b.version, a.version))
    .map((fila) => ({
      ...fila,
      createdAt: fila.createdAt.toISOString(),
    }));
}
