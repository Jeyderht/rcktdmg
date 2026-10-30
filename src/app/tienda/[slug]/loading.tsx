/**
 * Carga de la ficha: la misma pantalla de carga del sitio.
 *
 * Sin este archivo, al ir de /tienda (o de otra ficha) a
 * /tienda/[slug] no había ningún límite de carga por debajo del
 * segmento «tienda», que no cambia: el toque no respondía hasta
 * que el servidor terminaba la ficha entera. Con él, la URL cambia
 * y el cargador aparece al momento, y la precarga de los enlaces
 * trae este esqueleto por adelantado.
 */
export { default } from "../../loading";
