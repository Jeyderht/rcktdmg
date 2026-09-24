import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

/*
  Las notificaciones son de quien ha iniciado sesión.
*/
export const metadata: Metadata = paginaPrivada("Notificaciones");

/**
 * Este layout no dibuja nada.
 *
 * Existe solo para declarar la metadata de la sección: las
 * páginas que cuelgan de aquí son Client Components y en
 * Next.js un Client Component no puede exportar metadata.
 * Devolver los hijos tal cual deja el HTML exactamente igual
 * que antes.
 */
export default function NotificacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
