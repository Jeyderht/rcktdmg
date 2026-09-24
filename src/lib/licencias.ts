import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import {
  condicionesDe,
  type LicenciaVista,
  type TipoLicencia,
} from "@/lib/licencias-comun";

export * from "@/lib/licencias-comun";

/**
 * Licencias digitales.
 *
 * Una licencia nace de una línea de pedido pagada y acredita
 * qué puede hacer su titular con ese recurso. Todo pasa por
 * aquí: otorgarlas, sincronizarlas cuando el pedido cambia de
 * estado y comprobarlas al descargar.
 */

/**
 * Código legible, derivado de la línea de compra.
 *
 * Se deriva en lugar de sortearse para que sea ESTABLE: si el
 * webhook reintenta y se vuelve a calcular, sale el mismo
 * código, y no hace falta un bucle de reintentos por colisión
 * contra el índice único.
 *
 * No es un secreto y no sirve para autenticarse: es un
 * identificador para soporte. Quien lo tenga sigue sin poder
 * consultar la licencia sin la sesión de su titular.
 */
export function codigoDeLicencia(orderItemId: string): string {
  const hash = createHash("sha256")
    .update(`rcktdmg-license:${orderItemId}`)
    .digest("base64url")
    .toUpperCase()
    // Fuera lo que se confunde al dictarlo por teléfono.
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[OI01]/g, "")
    .slice(0, 12);

  return `RK-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/**
 * Otorga las licencias de un pedido pagado.
 *
 * Una por línea: un pedido con tres recursos da tres
 * licencias, porque cada recurso puede venderse con
 * condiciones distintas.
 *
 * Es idempotente. El índice único sobre `orderItemId` impide
 * la segunda licencia de la misma línea, y `skipDuplicates`
 * hace que un reintento del webhook no falle, simplemente no
 * inserte nada.
 *
 * Nunca lanza: la compra ya está cobrada cuando se llama a
 * esto, y un fallo al emitir el documento no debe deshacerla.
 */
export async function otorgarLicenciasDePedido(
  orderId: string
): Promise<number> {
  try {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        items: {
          select: {
            id: true,
            productId: true,
            // El tipo se copia del recurso EN ESTE MOMENTO.
            product: { select: { licenseType: true } },
          },
        },
      },
    });

    // Solo un pedido pagado otorga licencias.
    if (!pedido || pedido.status !== "PAID") return 0;

    const resultado = await prisma.license.createMany({
      data: pedido.items.map((item) => {
        const tipo = item.product.licenseType as TipoLicencia;

        return {
          code: codigoDeLicencia(item.id),
          userId: pedido.userId,
          productId: item.productId,
          orderId: pedido.id,
          orderItemId: item.id,
          type: tipo,
          terms: condicionesDe(tipo),
        };
      }),
      skipDuplicates: true,
    });

    return resultado.count;
  } catch (error) {
    console.error("otorgarLicenciasDePedido:", error);

    return 0;
  }
}

/**
 * Pone las licencias de un pedido al día con su estado.
 *
 * Es el único sitio que hay que llamar cuando un pedido cambia
 * de estado, y hoy lo llaman el cobro y la cancelación. El día
 * que existan los reembolsos —hoy NO existen: ningún código
 * del proyecto pone un pedido en REFUNDED— bastará con
 * llamarla también desde ahí.
 *
 *   PAID              → licencias vigentes
 *   CANCELED/REFUNDED → licencias retiradas
 *   PENDING           → no se toca nada
 */
export async function sincronizarLicenciasDePedido(
  orderId: string
): Promise<void> {
  try {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });

    if (!pedido) return;

    if (pedido.status === "PAID") {
      await otorgarLicenciasDePedido(orderId);

      // Un pedido que vuelve a estar pagado recupera lo suyo.
      await prisma.license.updateMany({
        where: { orderId, status: "REVOKED" },
        data: { status: "ACTIVE", revokedAt: null, revokedReason: null },
      });

      return;
    }

    if (pedido.status === "CANCELED" || pedido.status === "REFUNDED") {
      const motivo =
        pedido.status === "REFUNDED"
          ? "El pedido fue reembolsado."
          : "El pedido fue cancelado.";

      const afectadas = await prisma.license.findMany({
        where: { orderId, status: "ACTIVE" },
        select: {
          id: true,
          userId: true,
          product: { select: { name: true } },
        },
      });

      if (afectadas.length === 0) return;

      await prisma.license.updateMany({
        where: { orderId, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: motivo,
        },
      });

      /*
        Se avisa una vez por pedido, no una por licencia: tres
        avisos idénticos por una sola cancelación son ruido.
      */
      await crearNotificacion({
        userId: pedido.userId,
        type: "LICENSE_REVOKED",
        title:
          afectadas.length === 1
            ? "Tu licencia ya no está vigente"
            : "Tus licencias ya no están vigentes",
        body: motivo,
        href: "/mi-cuenta/licencias",
      });
    }
  } catch (error) {
    console.error("sincronizarLicenciasDePedido:", error);
  }
}

/**
 * ¿Tiene este usuario licencia vigente sobre este recurso?
 *
 * La usa la descarga protegida. Devuelve la licencia si hay
 * alguna ACTIVE, y null si no hay ninguna o están todas
 * retiradas.
 */
export async function licenciaVigente(
  userId: string,
  productId: string
): Promise<{ id: string; code: string; type: TipoLicencia } | null> {
  const licencia = await prisma.license.findFirst({
    where: { userId, productId, status: "ACTIVE" },
    orderBy: { grantedAt: "desc" },
    select: { id: true, code: true, type: true },
  });

  return licencia
    ? { ...licencia, type: licencia.type as TipoLicencia }
    : null;
}

/**
 * ¿Hay alguna licencia RETIRADA de este usuario sobre este
 * recurso, y ninguna vigente?
 *
 * Distinguir "retirada" de "nunca existió" permite a la
 * descarga explicar por qué se deniega en lugar de dar un
 * error genérico.
 */
export async function licenciaRetirada(
  userId: string,
  productId: string
): Promise<{ revokedReason: string | null } | null> {
  const vigente = await licenciaVigente(userId, productId);

  if (vigente) return null;

  return prisma.license.findFirst({
    where: { userId, productId, status: "REVOKED" },
    orderBy: { revokedAt: "desc" },
    select: { revokedReason: true },
  });
}

/* ══════════════ LECTURA ══════════════ */

const SELECCION = {
  id: true,
  code: true,
  type: true,
  status: true,
  terms: true,
  grantedAt: true,
  revokedAt: true,
  revokedReason: true,
  product: { select: { name: true, slug: true, coverUrl: true } },
  orderId: true,
  orderItem: { select: { price: true } },
} as const;

type FilaLicencia = {
  id: string;
  code: string;
  type: string;
  status: string;
  terms: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  product: { name: string; slug: string; coverUrl: string | null };
  orderId: string;
  orderItem: { price: unknown };
};

function aVista(fila: FilaLicencia): LicenciaVista {
  return {
    id: fila.id,
    code: fila.code,
    type: fila.type as TipoLicencia,
    status: fila.status as LicenciaVista["status"],
    terms: fila.terms,
    grantedAt: fila.grantedAt.toISOString(),
    revokedAt: fila.revokedAt ? fila.revokedAt.toISOString() : null,
    revokedReason: fila.revokedReason,
    producto: fila.product,
    pedido: {
      id: fila.orderId,
      precio: Number(fila.orderItem.price),
    },
  };
}

/**
 * Licencias de un usuario.
 *
 * `userId` lo pone siempre quien llama a partir de la sesión.
 * Nunca llega del cliente: son documentos personales.
 */
export async function obtenerLicencias(
  userId: string
): Promise<LicenciaVista[]> {
  const filas = await prisma.license.findMany({
    where: { userId },
    // Las vigentes primero, luego por fecha.
    orderBy: [{ status: "asc" }, { grantedAt: "desc" }],
    take: 200,
    select: SELECCION,
  });

  return filas.map(aVista);
}

/**
 * Una licencia concreta, solo si es de este usuario.
 *
 * El `userId` va en el WHERE: la consulta no puede alcanzar la
 * licencia de otra persona ni por error.
 */
export async function obtenerLicencia(
  userId: string,
  idOCodigo: string
): Promise<LicenciaVista | null> {
  const fila = await prisma.license.findFirst({
    where: {
      userId,
      OR: [{ id: idOCodigo }, { code: idOCodigo.toUpperCase() }],
    },
    select: SELECCION,
  });

  return fila ? aVista(fila) : null;
}
