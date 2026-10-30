import { redirect } from "next/navigation";

import AccountPageHeader from "@/components/cuenta/AccountPageHeader";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

import CambiarFoto from "./CambiarFoto";

/**
 * Mi cuenta → Perfil (cliente): su foto, nombre y correo, y el botón
 * «Cambiar foto» (avatar de la casa o foto propia). El creador tiene
 * su propio perfil en el Creator Studio.
 */
export default async function PerfilClientePage() {
  const session = await getSession();

  if (!session) redirect("/login?redirect=/mi-cuenta/perfil");
  if (session.role === "CREATOR") redirect("/creadores/panel/perfil");
  if (session.role !== "CLIENT") redirect("/mi-cuenta");

  const usuario = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, avatarUrl: true },
  });

  if (!usuario) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-8">
      <AccountPageHeader title="Perfil" subtitle="Tu foto y los datos de tu cuenta." />

      <section className="rk-fade-up rk-enter-1 rk-card mt-6 p-5 sm:p-6">
        <CambiarFoto
          avatarUrl={usuario.avatarUrl}
          nombre={usuario.name || usuario.email}
        />

        <div className="rk-divider mt-5" />

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-ink/60">Nombre</dt>
            <dd className="mt-1.5 truncate text-sm font-medium">{usuario.name || "Sin nombre"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-ink/60">Correo</dt>
            <dd className="mt-1.5 truncate text-sm font-medium">{usuario.email}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
