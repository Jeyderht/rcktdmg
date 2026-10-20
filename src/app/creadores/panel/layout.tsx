import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Navbar from "@/components/layout/Navbar";
import PanelShell from "@/components/panel/PanelShell";

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

      <PanelShell titulo="Creator Studio">
        {children}
      </PanelShell>
    </>
  );
}
