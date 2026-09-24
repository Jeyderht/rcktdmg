/**
 * Notificaciones: parte compartida con el navegador.
 *
 * No toca la base de datos a propósito: lo importan la campana
 * y la página de notificaciones, que son componentes de
 * cliente. Las funciones que leen o escriben están en
 * src/lib/notificaciones.ts, que reexporta todo esto.
 */

/*
  El tipo sale del enum de Prisma, no de una lista escrita a
  mano. `import type` se borra al compilar, así que esto no
  arrastra Prisma al navegador, y a cambio el compilador avisa
  si el enum y este módulo se separan. Ya pasó una vez: al
  añadir REVIEW al esquema, la lista de aquí se quedó atrás.
*/
import type { $Enums } from "@prisma/client";

export type TipoNotificacion = $Enums.NotificationType;

export const TIPOS_NOTIFICACION = [
  "PRODUCT_SUBMITTED",
  "PRODUCT_PUBLISHED",
  "PRODUCT_REJECTED",
  "SALE",
  "FAVORITE",
  "FOLLOW",
  "REVIEW",
  "REVIEW_HIDDEN",
  "LICENSE_REVOKED",
  "PRODUCT_VERSION",
  "PACK_PUBLISHED",
  "WITHDRAWAL_REQUESTED",
  "WITHDRAWAL_UPDATED",
  "ORDER_PAID",
  "ORDER_UPDATED",
  "DOWNLOAD_READY",
  "USER_REGISTERED",
  "SYSTEM",
] as const satisfies readonly TipoNotificacion[];

/*
  Y al revés: si el enum gana un valor que no está en la lista
  de arriba, `Olvidados` deja de ser `never` y esto no compila.
*/
type Olvidados = Exclude<
  TipoNotificacion,
  (typeof TIPOS_NOTIFICACION)[number]
>;

const _sinOlvidos: Olvidados extends never ? true : never = true;

void _sinOlvidos;

export type TonoNotificacion =
  | "neutral"
  | "success"
  | "warning"
  | "danger";

export function esTipoNotificacion(
  valor: unknown
): valor is TipoNotificacion {
  return (
    typeof valor === "string" &&
    (TIPOS_NOTIFICACION as readonly string[]).includes(valor)
  );
}

/**
 * Tono de cada tipo.
 *
 * El tono NO se guarda en la base: se deduce del tipo. Un
 * campo más que siempre vale lo mismo para el mismo tipo solo
 * sirve para que algún día discrepen.
 */
export const TONO_POR_TIPO: Record<
  TipoNotificacion,
  TonoNotificacion
> = {
  PRODUCT_SUBMITTED: "warning",
  PRODUCT_PUBLISHED: "success",
  PRODUCT_REJECTED: "danger",
  SALE: "success",
  FAVORITE: "neutral",
  FOLLOW: "success",
  REVIEW: "neutral",
  REVIEW_HIDDEN: "warning",
  LICENSE_REVOKED: "danger",
  PRODUCT_VERSION: "success",
  PACK_PUBLISHED: "success",
  WITHDRAWAL_REQUESTED: "warning",
  WITHDRAWAL_UPDATED: "neutral",
  ORDER_PAID: "success",
  ORDER_UPDATED: "neutral",
  DOWNLOAD_READY: "success",
  USER_REGISTERED: "neutral",
  SYSTEM: "neutral",
};

export function tonoDe(tipo: string): TonoNotificacion {
  return esTipoNotificacion(tipo) ? TONO_POR_TIPO[tipo] : "neutral";
}

/** Notificación tal y como viaja de la API al navegador. */
export type NotificacionVista = {
  id: string;
  type: TipoNotificacion;
  title: string;
  body: string | null;
  href: string | null;
  /** ISO, o null si sigue sin leer. */
  readAt: string | null;
  createdAt: string;
};

/** "hace 5 min", "hace 3 h", "12 sep". */
export function haceCuanto(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();

  const minutos = Math.floor(diff / 60000);

  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} d`;

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}
