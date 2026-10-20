import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Navbar from "@/components/layout/Navbar";
import PanelShell from "@/components/panel/PanelShell";

/*
  Todo lo que cuelga de /mi-cuenta es privado: compras,
  descargas, licencias, favoritos y colecciones de una
  persona concreta. Ni se indexa ni se sigue.
*/
export const metadata: Metadata = paginaPrivada("Mi cuenta");

/*
  Secciones del área de cliente. Todas existen ya como página;
  no se añade ningún acceso a algo sin implementar.
*/

export default function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    El navbar va FUERA del armazón, y por eso se pinta aquí en
    lugar de dentro de cada página.

    Antes lo incluía cada página, y al envolverlas en el panel
    la barra quedaba dentro de la columna de contenido: a
    1280 px medía 1025 en vez de ocupar el ancho entero, y sus
    botones de la derecha se salían. Arriba del todo recupera
    el ancho completo y se comporta igual que en el resto del
    sitio.
  */
  return (
    <>
      <Navbar />

      <PanelShell titulo="Mi cuenta">
        {children}
      </PanelShell>
    </>
  );
}
