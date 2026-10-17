/**
 * Colores de serie del panel de administración, en orden.
 *
 * Son los de la antigua dona (DonaAdmin) y los mismos que dan
 * las reglas [data-c="1..5"] de globals.css (sección BC): el
 * punto de una leyenda y su arco en el anillo de Pedidos tienen
 * que coincidir.
 *
 * Leen los tokens --rk-serie-1…5 (globals.css, §0 PALETA): el
 * color se cambia allí, no aquí. Sirven en atributos SVG (stroke)
 * y en style.
 */
export const COLORES_ADMIN = [
  "rgb(var(--rk-serie-1))",
  "rgb(var(--rk-serie-2))",
  "rgb(var(--rk-serie-3))",
  "rgb(var(--rk-serie-4))",
  "rgb(var(--rk-serie-5))",
] as const;
