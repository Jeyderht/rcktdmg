import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import CreatorNav from "@/components/CreatorNav";
import Navbar from "@/components/Navbar";

/*
  El Creator Studio es el área de trabajo del creador:
  sus borradores, sus ingresos y sus retiros.
*/
export const metadata: Metadata = paginaPrivada("Creator Studio");

export default function CreatorPanelLayout({
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
