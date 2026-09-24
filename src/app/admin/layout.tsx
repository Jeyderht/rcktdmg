import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import AdminNav from "@/components/AdminNav";
import AdminSidebar from "@/components/AdminSidebar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

/*
  El panel de administración exige rol ADMIN. Aunque el
  middleware ya lo protege, declararlo aquí evita que una
  URL filtrada acabe indexada.
*/
export const metadata: Metadata = paginaPrivada("Administración");

/**
 * Estructura del área de administración:
 *
 *  - Navbar arriba (igual que en el resto del sitio).
 *  - Escritorio: barra lateral fija + contenido a la derecha.
 *  - Móvil y tablet: navegación horizontal desplazable.
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

      {/* Navegación horizontal solo hasta lg */}
      <div className="lg:hidden">
        <AdminNav />
      </div>

      <div className="mx-auto flex w-full max-w-[94rem] gap-6 px-0 lg:px-6 lg:pt-6">
        <AdminSidebar />

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <Footer />
    </>
  );
}
