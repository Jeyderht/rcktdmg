/**
 * Formatos de fecha y dinero que se repetían, idénticos, en varias
 * páginas. Sin dependencias: se usan igual en el servidor y en
 * componentes cliente.
 *
 * El precio en soles con dos decimales sin separador de miles
 * («S/ 25.00») es formatPrice() de lib/pricing.
 */

/** «13 oct 2026» (fecha de una cadena ISO). */
export function fechaMedia(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/** «13/10/2026». */
export function fechaNumerica(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** «13 oct. 2026», con el día a dos cifras. */
export function fechaMesCorto(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** «S/ 1,234.50»: moneda PEN con separador de miles. */
export function solesMoneda(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}
