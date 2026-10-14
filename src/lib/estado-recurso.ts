/**
 * Clase de insignia (rk-badge-*) según el estado de un recurso.
 * Pendiente en ámbar, publicado en verde, rechazado en rojo; el
 * resto (borrador, archivado o desconocido) neutro.
 */
export function claseInsigniaEstado(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "rk-badge-success";

    case "PENDING_REVIEW":
      return "rk-badge-warning";

    case "REJECTED":
      return "rk-badge-danger";

    default:
      return "rk-badge-neutral";
  }
}
