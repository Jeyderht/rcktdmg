import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

/*
  Las pantallas de acceso no aportan contenido a los
  buscadores y compiten con las páginas que sí lo hacen.
*/
export const metadata: Metadata = paginaPrivada("Crear cuenta");

/**
 * Este layout no dibuja nada.
 *
 * Existe solo para declarar la metadata de la sección: las
 * páginas que cuelgan de aquí son Client Components y en
 * Next.js un Client Component no puede exportar metadata.
 * Devolver los hijos tal cual deja el HTML exactamente igual
 * que antes.
 */
export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
