/**
 * Identificador de la caja de búsqueda principal de la tienda.
 *
 * Vive aparte porque lo usan dos componentes que no se
 * importan entre sí: la caja de /tienda lo pone en su input, y
 * la cabecera lo busca para llevar el foco allí en lugar de
 * pintar un segundo buscador idéntico.
 */
export const ID_BUSCADOR_TIENDA = "rk-buscador-tienda";
