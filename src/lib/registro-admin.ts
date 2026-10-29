/**
 * Registro de los cambios que hace la administración en un recurso.
 *
 * Hoy es UNA línea JSON en los logs del servidor por cada cambio.
 * Las rutas solo llaman a `registrarCambioAdmin`: cuando exista la
 * tabla `AdminLog`, se cambia el interior de esta función y las
 * rutas no se tocan.
 *
 * Sin datos personales ni secretos: ids, campos y valores del
 * recurso (nombre, precio, categoría, etiquetas, estado…). Los
 * textos largos se recortan para que la línea no crezca sin límite.
 */

export type CambioAdmin = {
  campo: string;
  antes: unknown;
  despues: unknown;
};

/** Largo máximo de un valor de texto en el registro. */
const LARGO_MAXIMO_VALOR = 300;

function recortar(valor: unknown): unknown {
  if (typeof valor === "string" && valor.length > LARGO_MAXIMO_VALOR) {
    return `${valor.slice(0, LARGO_MAXIMO_VALOR)}…`;
  }

  return valor;
}

export function registrarCambioAdmin({
  adminId,
  recursoId,
  cambios,
}: {
  adminId: string;
  recursoId: string;
  cambios: CambioAdmin[];
}): void {
  if (cambios.length === 0) return;

  console.log(
    JSON.stringify({
      evento: "admin_recurso_cambio",
      adminId,
      recursoId,
      fecha: new Date().toISOString(),
      cambios: cambios.map((c) => ({
        campo: c.campo,
        antes: recortar(c.antes),
        despues: recortar(c.despues),
      })),
    })
  );
}
