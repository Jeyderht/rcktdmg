/**
 * Lo que comparten el buscador del cliente y la búsqueda del
 * servidor. Va aparte porque `busqueda.ts` usa Prisma y no
 * puede entrar en un componente de cliente.
 */

export type Sugerencia = {
  tipo: "recurso" | "categoria" | "etiqueta" | "creador";
  etiqueta: string;
  /** Texto secundario, solo si aporta algo. */
  detalle?: string;
  href: string;
};

/** Mínimo de caracteres antes de consultar nada. */
export const MINIMO_SUGERENCIA = 2;
