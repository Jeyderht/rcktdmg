import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import PanelShell from "@/components/panel/PanelShell";

/*
  Todo lo que cuelga de /mi-cuenta es privado: compras,
  descargas, licencias, favoritos y colecciones de una
  persona concreta. Ni se indexa ni se sigue.
*/
export const metadata: Metadata = paginaPrivada("Mi cuenta");

export default function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    Marco de app: sin el Navbar ni el pie del sitio. La barra
    superior y el menú los pinta PanelShell para todo el panel.
  */
  return <PanelShell titulo="Mi cuenta">{children}</PanelShell>;
}
