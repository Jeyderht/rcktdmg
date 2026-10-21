import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import PanelShell from "@/components/panel/PanelShell";

/*
  El panel de administración exige rol ADMIN. Aunque el
  middleware ya lo protege, declararlo aquí evita que una
  URL filtrada acabe indexada.
*/
export const metadata: Metadata = paginaPrivada("Administración");

/**
 * Estructura del área de administración: el marco de app de
 * PanelShell (columna con el menú y barra superior propia, sin
 * el Navbar ni el pie del sitio); en móvil, cajón lateral.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PanelShell titulo="Administración">{children}</PanelShell>;
}
