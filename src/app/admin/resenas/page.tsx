import type { Metadata } from "next";

import ResenasManager from "./ResenasManager";

export const metadata: Metadata = {
  title: "Valoraciones",
};

/**
 * Moderación de valoraciones.
 *
 * El acceso lo resuelve el middleware para todo /admin, y la
 * API vuelve a comprobar el rol por su cuenta: la interfaz
 * nunca es la única barrera.
 */
export default function AdminResenasPage() {
  return (
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Comunidad</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Valoraciones
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Ocultar una valoración la retira de la ficha y deja de
          contar para la media, y avisa a quien la escribió.
          Eliminar es definitivo.
        </p>
      </header>

      <div className="mt-7">
        <ResenasManager />
      </div>
    </div>
  );
}
