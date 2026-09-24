import type { aTarjeta } from "@/lib/catalogo";

/**
 * Tipos de recomendación compartidos con el navegador.
 *
 * Van aparte de src/lib/recomendaciones.ts porque ese módulo
 * importa Prisma, y los componentes de cliente solo necesitan
 * la forma de los datos.
 */

export type Recomendacion = ReturnType<typeof aTarjeta>;

export type BloqueRecomendaciones = {
  titulo: string;
  subtitulo: string | null;
  productos: Recomendacion[];
};
