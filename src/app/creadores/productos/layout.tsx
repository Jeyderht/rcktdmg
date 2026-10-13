import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import CreatorNav from "@/components/creador/CreatorNav";
import Navbar from "@/components/layout/Navbar";

/*
  La gestión de un recurso (edición, versiones, imágenes,
  estadísticas) es privada del creador que lo publica. La
  ficha pública vive en /tienda/[slug], que sí se indexa.
*/
export const metadata: Metadata = paginaPrivada("Mis recursos");

export default function CreatorProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <CreatorNav />
      {children}
    </>
  );
}
