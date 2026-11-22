import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import PanelShell from "@/components/panel/PanelShell";

/*
  El Creator Studio es el área de trabajo del creador:
  sus borradores, sus ingresos y sus retiros.
*/
export const metadata: Metadata = paginaPrivada("Creator Studio");

export default async function CreatorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await requireRole(["CREATOR", "ADMIN"]))) redirect("/");
  return <PanelShell titulo="Creator Studio">{children}</PanelShell>;
}
