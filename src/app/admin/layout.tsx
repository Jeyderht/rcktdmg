import AdminNav from "@/components/AdminNav";
import AdminSidebar from "@/components/AdminSidebar";
import Navbar from "@/components/Navbar";

/**
 * Estructura del área de administración:
 *
 *  - Navbar arriba (igual que en el resto del sitio).
 *  - Escritorio: barra lateral fija + contenido a la derecha.
 *  - Móvil y tablet: navegación horizontal desplazable.
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

      <div className="mx-auto flex w-full max-w-[94rem] gap-6 lg:px-6 lg:pt-6">
        <AdminSidebar />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
