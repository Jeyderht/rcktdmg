import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

/*
  El pago es un paso de una compra en curso, atado a un
  carrito concreto. No es una página de destino.
*/
export const metadata: Metadata = paginaPrivada("Pago");

/**
 * Este layout no dibuja nada.
 *
 * Existe solo para declarar la metadata de la sección: las
 * páginas que cuelgan de aquí son Client Components y en
 * Next.js un Client Component no puede exportar metadata.
 * Devolver los hijos tal cual deja el HTML exactamente igual
 * que antes.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
