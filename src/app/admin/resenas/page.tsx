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
    <div data-vista="otra" className="rk-fade-up">
      <header className="rk-vh">
        <h1 className="rk-title">
          Valoraciones
        </h1>

        <p>
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
