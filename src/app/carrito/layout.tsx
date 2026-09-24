import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

/*
  El carrito es distinto para cada visitante y está vacío
  para quien llegue desde un buscador.
*/
export const metadata: Metadata = paginaPrivada("Carrito");

/**
 * Este layout no dibuja nada.
 *
 * Existe solo para declarar la metadata de la sección: las
 * páginas que cuelgan de aquí son Client Components y en
 * Next.js un Client Component no puede exportar metadata.
 * Devolver los hijos tal cual deja el HTML exactamente igual
 * que antes.
 */
export default function CarritoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
