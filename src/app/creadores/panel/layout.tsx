import type { Metadata } from "next";

import { paginaPrivada } from "@/lib/seo";

import Navbar from "@/components/Navbar";
import PanelShell from "@/components/panel/PanelShell";
import type { ElementoPanel } from "@/components/panel/PanelNav";

/*
  El Creator Studio es el área de trabajo del creador:
  sus borradores, sus ingresos y sus retiros.
*/
export const metadata: Metadata = paginaPrivada("Creator Studio");

/*
  Secciones del panel. Son las mismas que ya ofrecía la
  navegación horizontal anterior: ninguna ruta nueva, ningún
  acceso a algo que no exista todavía.
*/
const SECCIONES: ElementoPanel[] = [
  { href: "/creadores/panel", label: "Inicio", icono: "LayoutDashboard", exacto: true },
  { href: "/creadores/panel/recursos", label: "Mis recursos", icono: "Package" },
  { href: "/creadores/panel/nuevo", label: "Crear recurso", icono: "Plus" },
  { href: "/creadores/panel/packs", label: "Packs", icono: "Layers" },
  { href: "/creadores/panel/colecciones", label: "Colecciones", icono: "Library" },
  { href: "/creadores/panel/retiros", label: "Ganancias", icono: "Wallet" },
  { href: "/creadores/panel/metodos-pago", label: "Métodos de pago", icono: "CreditCard" },
  { href: "/creadores/panel/seguidores", label: "Seguidores", icono: "Users" },
  { href: "/creadores/panel/perfil", label: "Perfil", icono: "UserRound" },
];

export default function CreatorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <PanelShell elementos={SECCIONES} titulo="Creator Studio">
        {children}
      </PanelShell>
    </>
  );
}
