import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PanelShell from "@/components/panel/PanelShell";
import type { ElementoPanel } from "@/components/panel/PanelNav";

/*
  El panel de administración exige rol ADMIN. Aunque el
  middleware ya lo protege, declararlo aquí evita que una
  URL filtrada acabe indexada.
*/
export const metadata: Metadata = paginaPrivada("Administración");

/*
  Secciones del panel.

  Son exactamente las mismas que tenía la barra lateral
  anterior, con sus dos vistas filtradas —Creadores y
  Revisiones— declaradas con `consulta` para que se enciendan
  ellas y no su sección madre. Ninguna ruta nueva.
*/
const SECCIONES: ElementoPanel[] = [
  { href: "/admin", label: "Dashboard", icono: "LayoutDashboard", exacto: true },
  { href: "/admin/usuarios", label: "Usuarios", icono: "Users" },
  {
    href: "/admin/usuarios?rol=CREATOR",
    label: "Creadores",
    icono: "UserRound",
    consulta: { ruta: "/admin/usuarios", query: "rol=CREATOR" },
  },
  { href: "/admin/recursos", label: "Recursos", icono: "Package" },
  {
    href: "/admin/recursos?estado=PENDING_REVIEW",
    label: "Revisiones",
    icono: "ClipboardCheck",
    consulta: { ruta: "/admin/recursos", query: "estado=PENDING_REVIEW" },
  },
  { href: "/admin/creadores", label: "Solicitudes", icono: "Inbox" },
  { href: "/admin/requisitos", label: "Requisitos", icono: "BookOpen" },
  { href: "/admin/packs", label: "Packs", icono: "Layers" },
  { href: "/admin/colecciones", label: "Colecciones", icono: "Library" },
  { href: "/admin/categorias", label: "Categorías", icono: "FolderTree" },
  { href: "/admin/resenas", label: "Valoraciones", icono: "Star" },
  { href: "/admin/tags", label: "Etiquetas", icono: "Tag" },
  { href: "/admin/retiros", label: "Retiros", icono: "Wallet" },
  { href: "/admin/usuarios/nuevo", label: "Crear creador", icono: "UserPlus" },
];

/**
 * Estructura del área de administración:
 *
 *  - Navbar arriba, igual que en el resto del sitio.
 *  - Escritorio: columna lateral fija + contenido a la derecha.
 *  - Móvil: cajón lateral, en lugar de la tira horizontal que
 *    había antes, para que el panel se maneje igual en los tres
 *    tableros del sitio.
 *
 * El pie vive aquí para no repetirlo en cada página del panel.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <PanelShell elementos={SECCIONES} titulo="Administración">
        {children}
      </PanelShell>

      <Footer />
    </>
  );
}
