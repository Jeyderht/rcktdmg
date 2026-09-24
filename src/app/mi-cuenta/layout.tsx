import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

/*
  Todo lo que cuelga de /mi-cuenta es privado: compras,
  descargas, licencias, favoritos y colecciones de una
  persona concreta. Ni se indexa ni se sigue.
*/
export const metadata: Metadata = paginaPrivada("Mi cuenta");

/**
 * Este layout no dibuja nada.
 *
 * Existe solo para declarar la metadata de la sección: las
 * páginas que cuelgan de aquí son Client Components y en
 * Next.js un Client Component no puede exportar metadata.
 * Devolver los hijos tal cual deja el HTML exactamente igual
 * que antes.
 */
export default function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
