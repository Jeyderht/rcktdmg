import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import PanelShell from "@/components/panel/PanelShell";

/*
  El panel de administración exige rol ADMIN. Aunque el
  middleware ya lo protege, declararlo aquí evita que una
  URL filtrada acabe indexada.
*/
export const metadata: Metadata = paginaPrivada("Administración");

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

      <PanelShell titulo="Administración">
        {children}
      </PanelShell>

      <Footer />
    </>
  );
}
