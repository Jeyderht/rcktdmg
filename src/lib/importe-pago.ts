/**
 * Comprobación del importe de un pago confirmado por la pasarela.
 *
 * El pedido se cobra en Culqi por `order.total` pasado a céntimos
 * (src/app/api/payments/culqi/route.ts) y siempre en soles: el
 * pedido no guarda moneda, todo el catálogo está en PEN. Antes de
 * dar un pedido por pagado, el webhook comprueba que el evento
 * trae ese mismo importe y esa moneda.
 */

/** Moneda de todos los pedidos (se envía fija al crear la orden en Culqi). */
export const MONEDA_PEDIDOS = "PEN";

/** Importe en céntimos, con el mismo redondeo que al crear la orden en Culqi. */
export function aCentimos(total: number | string | { toString(): string }): number {
  return Math.round(Number(total.toString()) * 100);
}

export type ResultadoImporte =
  | { ok: true }
  | {
      ok: false;
      motivo: "importe" | "moneda";
      esperadoCentimos: number;
      recibidoCentimos: number | null;
      monedaRecibida: string | null;
    };

/**
 * Compara el importe y la moneda del evento con los del pedido.
 *
 * `evento` es el objeto de la orden que manda Culqi: `amount` en
 * céntimos y `currency_code` (o `currency`). Si el importe falta o
 * no es un entero, no se puede verificar y cuenta como distinto.
 */
export function compararImporte(
  evento: { amount?: unknown; currency_code?: unknown; currency?: unknown } | null | undefined,
  totalPedido: number | string | { toString(): string }
): ResultadoImporte {
  const esperadoCentimos = aCentimos(totalPedido);

  const bruto = Number(evento?.amount);
  const recibidoCentimos = Number.isInteger(bruto) ? bruto : null;

  const moneda = evento?.currency_code ?? evento?.currency;
  const monedaRecibida = typeof moneda === "string" ? moneda.toUpperCase() : null;

  if (recibidoCentimos === null || recibidoCentimos !== esperadoCentimos) {
    return { ok: false, motivo: "importe", esperadoCentimos, recibidoCentimos, monedaRecibida };
  }

  if (monedaRecibida !== MONEDA_PEDIDOS) {
    return { ok: false, motivo: "moneda", esperadoCentimos, recibidoCentimos, monedaRecibida };
  }

  return { ok: true };
}
