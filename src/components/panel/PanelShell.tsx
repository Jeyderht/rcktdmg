import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

import PanelNav, { type ElementoPanel } from "./PanelNav";

/**
 * Armazón de los tableros.
 *
 * Pone la columna de navegación a la izquierda y el contenido
 * a la derecha, y resuelve por su cuenta quién ha iniciado
 * sesión para el bloque de identidad: así cada panel se limita
 * a declarar sus enlaces y a pintar su contenido.
 *
 * No comprueba permisos. De eso ya se encargan el middleware y
 * cada página; duplicar la comprobación aquí crearía un
 * segundo sitio donde pueden separarse las reglas.
 */
const NOMBRE_ROL: Record<string, string> = {
  ADMIN: "Administración",
  CREATOR: "Creador",
  CLIENT: "Cliente",
};

export default async function PanelShell({
  elementos,
  titulo,
  children,
}: {
  elementos: ElementoPanel[];
  titulo: string;
  children: React.ReactNode;
}) {
  const session = await getSession();

  /*
    El avatar y el nombre público no viajan en la sesión, así
    que se leen una vez aquí. Es una consulta por carga de
    panel con tres columnas, no una por tarjeta.
  */
  const usuario = session?.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, publicName: true, avatarUrl: true, role: true },
      })
    : null;

  return (
    <>
      {/* Separador bajo la barra superior, igual que en el inicio:
          sin él, la barra del panel quedaba pegada al menú. */}
      <div aria-hidden className="rk-separador rk-separador-arriba">
        <span className="rk-separador-linea" />
      </div>

      <div className="mx-auto flex w-full max-w-[110rem] flex-col lg:flex-row">
        <PanelNav
          elementos={elementos}
          titulo={titulo}
          usuario={{
            nombre:
              usuario?.publicName || usuario?.name || "Mi cuenta",
            rol: NOMBRE_ROL[usuario?.role ?? ""] ?? "Cuenta",
            avatarUrl: usuario?.avatarUrl ?? null,
          }}
        />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
