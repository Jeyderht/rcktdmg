import { prisma } from "@/lib/prisma";
import {
  esTipoNotificacion,
  type NotificacionVista,
  type TipoNotificacion,
} from "@/lib/notificaciones-comun";

export * from "@/lib/notificaciones-comun";

/**
 * Notificaciones: lectura y escritura.
 *
 * Todo pasa por aquí. Las rutas de API y los puntos donde
 * ocurren los hechos (una venta, un seguidor, un retiro) no
 * hablan con Prisma directamente: llaman a estas funciones.
 * Así la validación y los límites están en un solo sitio.
 */

export const POR_PAGINA_NOTIFICACIONES = 20;

/** Tope duro: ni con page=99999 se pide más de esto. */
const MAXIMO_POR_PAGINA = 25;

export const LARGO_TITULO = 120;
export const LARGO_CUERPO = 280;

export type EntradaNotificacion = {
  userId: string;
  type: TipoNotificacion;
  title: string;
  body?: string | null;
  href?: string | null;
};

/**
 * Recorta un texto sin cortarlo en seco a mitad de palabra.
 *
 * Los títulos y cuerpos se componen con nombres de recurso que
 * puede escribir cualquiera, así que se acotan aquí y no se
 * confía en que quien llama lo haya hecho.
 */
function recortar(valor: string, maximo: number): string {
  const limpio = valor.trim().replace(/\s+/g, " ");

  if (limpio.length <= maximo) return limpio;

  return `${limpio.slice(0, maximo - 1).trimEnd()}…`;
}

/**
 * Valida un destino.
 *
 * Solo se aceptan rutas internas. Una notificación con un
 * `href` externo sería un enlace que la plataforma muestra
 * como propio llevando a otro sitio, y no hay ningún motivo
 * legítimo para ello. Se rechazan también las que empiezan
 * por `//`, que el navegador trata como otro dominio.
 */
export function hrefValido(
  valor: string | null | undefined
): string | null {
  if (typeof valor !== "string") return null;

  const limpio = valor.trim();

  if (!limpio.startsWith("/") || limpio.startsWith("//")) {
    return null;
  }

  return limpio.slice(0, 512);
}

/** Convierte una entrada suelta en datos listos para Prisma. */
function normalizar(entrada: EntradaNotificacion) {
  const userId = String(entrada.userId ?? "").trim();
  const title = recortar(String(entrada.title ?? ""), LARGO_TITULO);

  if (!userId || !title || !esTipoNotificacion(entrada.type)) {
    return null;
  }

  const body = entrada.body
    ? recortar(String(entrada.body), LARGO_CUERPO)
    : null;

  return {
    userId,
    type: entrada.type,
    title,
    body: body || null,
    href: hrefValido(entrada.href),
  };
}

/**
 * Crea una notificación.
 *
 * Nunca lanza: una notificación es un efecto secundario del
 * hecho principal. Si falla al guardar el aviso de una venta,
 * la venta ya ocurrió y no debe deshacerse por eso. El fallo
 * se registra y se sigue.
 */
export async function crearNotificacion(
  entrada: EntradaNotificacion
): Promise<boolean> {
  const datos = normalizar(entrada);

  if (!datos) return false;

  try {
    await prisma.notification.create({ data: datos });

    return true;
  } catch (error) {
    console.error("crearNotificacion:", error);

    return false;
  }
}

/** Varias de golpe. Descarta en silencio las inválidas. */
export async function crearNotificaciones(
  entradas: EntradaNotificacion[]
): Promise<number> {
  const datos = entradas.flatMap((e) => {
    const n = normalizar(e);

    return n ? [n] : [];
  });

  if (datos.length === 0) return 0;

  try {
    const r = await prisma.notification.createMany({ data: datos });

    return r.count;
  } catch (error) {
    console.error("crearNotificaciones:", error);

    return 0;
  }
}

/**
 * Avisa a todos los administradores.
 *
 * Los destinatarios se resuelven aquí y no en cada ruta: si
 * mañana hay dos administradores, los avisos existentes
 * empiezan a llegarles a los dos sin tocar nada más.
 */
export async function notificarAdmins(
  entrada: Omit<EntradaNotificacion, "userId">
): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return crearNotificaciones(
    admins.map((admin) => ({ ...entrada, userId: admin.id }))
  );
}

export type ListadoNotificaciones = {
  notificaciones: NotificacionVista[];
  total: number;
  noLeidas: number;
  pagina: number;
  totalPaginas: number;
};

/**
 * Notificaciones de un usuario, paginadas.
 *
 * `userId` lo pone siempre quien llama a partir de la sesión,
 * nunca el cliente: ver esto es la puerta a los datos de otra
 * cuenta.
 */
export async function obtenerNotificaciones(
  userId: string,
  opciones: { pagina?: number; porPagina?: number } = {}
): Promise<ListadoNotificaciones> {
  const porPagina = Math.min(
    Math.max(opciones.porPagina ?? POR_PAGINA_NOTIFICACIONES, 1),
    MAXIMO_POR_PAGINA
  );

  const pedida =
    Number.isFinite(opciones.pagina) && (opciones.pagina ?? 1) > 1
      ? Math.floor(opciones.pagina as number)
      : 1;

  const [total, noLeidas] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    contarNoLeidas(userId),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(pedida, totalPaginas);

  const filas = await prisma.notification.findMany({
    where: { userId },
    /*
      El id cierra el orden: dos notificaciones creadas en el
      mismo milisegundo —un pedido avisa a comprador, creador
      y admin a la vez— podrían intercambiarse entre páginas.
    */
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagina - 1) * porPagina,
    take: porPagina,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    notificaciones: filas.map((fila) => ({
      id: fila.id,
      type: fila.type as TipoNotificacion,
      title: fila.title,
      body: fila.body,
      href: fila.href,
      readAt: fila.readAt ? fila.readAt.toISOString() : null,
      createdAt: fila.createdAt.toISOString(),
    })),
    total,
    noLeidas,
    pagina,
    totalPaginas,
  };
}

export function contarNoLeidas(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

/**
 * Marca una notificación como leída.
 *
 * El `userId` va en el WHERE, no en una comprobación previa:
 * así la consulta no puede tocar la fila de otra persona ni
 * siquiera por accidente. Devuelve false si no existe o no es
 * suya —desde fuera son indistinguibles, que es lo correcto:
 * decir "existe pero no es tuya" ya filtra información.
 */
export async function marcarComoLeida(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const id = String(notificationId ?? "").trim();

  if (!id) return false;

  const r = await prisma.notification.updateMany({
    // Ya leída: no se reescribe la fecha original.
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });

  if (r.count > 0) return true;

  // Puede que existiera y ya estuviera leída: eso también es
  // un éxito, y hay que distinguirlo de "no es tuya".
  const suya = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  return suya !== null;
}

/** Marca como leídas todas las del usuario. Devuelve cuántas. */
export async function marcarTodasComoLeidas(
  userId: string
): Promise<number> {
  const r = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return r.count;
}
