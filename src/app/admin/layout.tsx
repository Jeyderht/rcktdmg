import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import AdminMenu, { type ItemMenuAdmin } from "@/components/admin/AdminMenu";

/*
  El panel de administración exige rol ADMIN. Aunque el
  middleware ya lo protege, declararlo aquí evita que una
  URL filtrada acabe indexada.
*/
export const metadata: Metadata = paginaPrivada("Administración");

/*
  Secciones del menú: las rutas reales del panel, con sus dos
  vistas filtradas declaradas con `consulta`. «Revisiones» no
  va en el menú (es Recursos filtrado; se llega desde el
  Dashboard con «Revisar pendientes»). Los iconos son los del
  menú aprobado.
*/
const SECCIONES: ItemMenuAdmin[] = [
  {
    href: "/admin",
    label: "Dashboard",
    exacto: true,
    icono: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icono: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  },
  {
    href: "/admin/usuarios?rol=CREATOR",
    label: "Creadores",
    consulta: { ruta: "/admin/usuarios", query: "rol=CREATOR" },
    icono: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  },
  {
    href: "/admin/recursos",
    label: "Recursos",
    icono: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
  },
  {
    href: "/admin/creadores",
    label: "Solicitudes",
    icono: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  },
  {
    href: "/admin/requisitos",
    label: "Requisitos",
    icono: '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
  },
  {
    href: "/admin/packs",
    label: "Packs",
    icono: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  },
  {
    href: "/admin/colecciones",
    label: "Colecciones",
    icono: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  },
  {
    href: "/admin/categorias",
    label: "Categorías",
    icono: '<path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a2 2 0 0 0 2 2h3"/><path d="M3 3v13a2 2 0 0 0 2 2h3"/>',
  },
  {
    href: "/admin/resenas",
    label: "Valoraciones",
    icono: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  },
  {
    href: "/admin/tags",
    label: "Etiquetas",
    icono: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  },
  {
    href: "/admin/retiros",
    label: "Retiros",
    icono: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  },
  {
    href: "/admin/usuarios/nuevo",
    label: "Crear creador",
    icono: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  },
];

/**
 * Estructura del área de administración, como el preview
 * aprobado: sin la barra ni el pie del sitio; arriba la barra
 * del admin (AdminMenu) y debajo la página, en el contenedor
 * rk-mn-pagina (430 → 760 → 1160 px).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // El nombre público no viaja en la sesión: se lee una vez aquí.
  const usuario = session?.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, publicName: true },
      })
    : null;

  return (
    <main className="rk-mn-pagina">
      <AdminMenu
        items={SECCIONES}
        usuario={{
          nombre: usuario?.publicName || usuario?.name || "Administrador",
          rol: "Administración",
        }}
      />
      {children}
    </main>
  );
}
