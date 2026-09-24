/**
 * Categorías comerciales.
 *
 * Reglas de forma y de retirada. No consulta la base: lo que
 * escribe está en las rutas de administración, que son las
 * únicas autorizadas a hacerlo.
 */

export const LARGO_NOMBRE_CATEGORIA = 60;
export const LARGO_DESCRIPCION_CATEGORIA = 300;

export function slugificarCategoria(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function validarCategoria(datos: Record<string, unknown>):
  | {
      ok: true;
      name: string;
      description: string | null;
      coverUrl: string | null;
    }
  | { ok: false; error: string } {
  const name = String(datos.name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, LARGO_NOMBRE_CATEGORIA);

  if (name.length < 2) {
    return { ok: false, error: "El nombre de la categoría es demasiado corto." };
  }

  if (!slugificarCategoria(name)) {
    return {
      ok: false,
      error: "El nombre debe contener al menos una letra o un número.",
    };
  }

  const descripcionCruda = String(datos.description ?? "").trim();

  /*
    La portada es pública y la sube administración. Se acepta
    tal cual llega del almacén público; no se genera ni se
    deduce de los recursos de la categoría.
  */
  const portadaCruda = String(datos.coverUrl ?? "").trim();

  return {
    ok: true,
    name,
    description: descripcionCruda
      ? descripcionCruda.slice(0, LARGO_DESCRIPCION_CATEGORIA)
      : null,
    coverUrl: portadaCruda || null,
  };
}
