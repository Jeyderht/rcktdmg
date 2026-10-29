/**
 * Quién puede cambiar «vista previa libre» de qué recursos.
 *
 * Es una función pura (sin base de datos ni cookies) para poder
 * probarla sola: src/lib/vista-previa-permisos.test.ts. La usan los
 * dos puntos de entrada, el interruptor del creador y la acción
 * masiva de la administración, a través de vista-previa-cambio.ts.
 *
 *   - Sin sesión o con rol CLIENT: 403.
 *   - CREATOR: solo recursos suyos. Si alguno de los pedidos no es
 *     suyo (o no existe), 403 y no se cambia NINGUNO: así no puede
 *     averiguar qué ids existen probando.
 *   - ADMIN: cualquiera; los que no existen se informan aparte.
 */

/** Máximo de recursos por operación (la acción masiva). */
export const MAX_RECURSOS_POR_CAMBIO = 100;

export type Actor = {
  userId: string;
  role: "ADMIN" | "CREATOR" | "CLIENT";
} | null;

export type PeticionCambio = {
  ids: string[];
  previewLibre: boolean;
};

export type ErrorCambio = { status: 400 | 403; error: string };

/** Valida y normaliza el cuerpo: ids únicos, dentro del tope, y un booleano. */
export function leerPeticion(
  cuerpo: unknown,
  tope = MAX_RECURSOS_POR_CAMBIO
): PeticionCambio | ErrorCambio {
  const datos = (cuerpo ?? {}) as { ids?: unknown; previewLibre?: unknown };

  if (typeof datos.previewLibre !== "boolean") {
    return { status: 400, error: "Falta el valor de «Vista previa libre»." };
  }

  if (!Array.isArray(datos.ids) || datos.ids.length === 0) {
    return { status: 400, error: "No se indicó ningún recurso." };
  }

  if (!datos.ids.every((id) => typeof id === "string" && /^[a-z0-9]{10,40}$/i.test(id))) {
    return { status: 400, error: "Hay un identificador de recurso no válido." };
  }

  const ids = [...new Set(datos.ids as string[])];

  if (ids.length > tope) {
    return {
      status: 400,
      error: `Como máximo ${tope} recursos por operación.`,
    };
  }

  return { ids, previewLibre: datos.previewLibre };
}

export function esErrorCambio<T extends object>(
  valor: T | ErrorCambio
): valor is ErrorCambio {
  return "error" in valor;
}

/**
 * ¿Puede este actor cambiar estos recursos?
 * `encontrados` son los que existen de entre los pedidos, con su dueño.
 */
export function autorizarCambio(
  actor: Actor,
  pedidos: string[],
  encontrados: { id: string; creatorId: string }[]
): { ok: true } | ErrorCambio {
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "CREATOR")) {
    return {
      status: 403,
      error: "No tienes permiso para cambiar la vista previa de recursos.",
    };
  }

  if (actor.role === "ADMIN") {
    return { ok: true };
  }

  // Creador: todos tienen que existir y ser suyos; si no, ninguno.
  const suyos = new Set(
    encontrados.filter((r) => r.creatorId === actor.userId).map((r) => r.id)
  );

  if (!pedidos.every((id) => suyos.has(id))) {
    return {
      status: 403,
      error: "Solo puedes cambiar la vista previa de tus propios recursos.",
    };
  }

  return { ok: true };
}
