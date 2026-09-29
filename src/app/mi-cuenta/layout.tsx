import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Navbar from "@/components/Navbar";
import PanelShell from "@/components/panel/PanelShell";
import type { ElementoPanel } from "@/components/panel/PanelNav";

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
const SECCIONES: ElementoPanel[] = [
  { href: "/mi-cuenta", label: "Resumen", icono: "LayoutDashboard", exacto: true },
  { href: "/mi-cuenta/compras", label: "Compras", icono: "Receipt" },
  { href: "/mi-cuenta/descargas", label: "Descargas", icono: "Download" },
  { href: "/mi-cuenta/licencias", label: "Licencias", icono: "BadgeCheck" },
  { href: "/mi-cuenta/colecciones", label: "Colecciones", icono: "Library" },
  { href: "/mi-cuenta/favoritos", label: "Favoritos", icono: "Heart" },
  { href: "/mi-cuenta/siguiendo", label: "Siguiendo", icono: "Users" },
];

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

      <PanelShell elementos={SECCIONES} titulo="Mi cuenta">
        {children}
      </PanelShell>
    </>
  );
}
