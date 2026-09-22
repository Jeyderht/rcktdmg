import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

/**
 * La navegación y el pie viven en el layout para que también
 * acompañen a los estados de carga y de error de la página.
 */
export default function CollectionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
