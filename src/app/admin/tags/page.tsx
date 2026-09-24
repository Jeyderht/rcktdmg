import type { Metadata } from "next";

import TagsManager from "./TagsManager";

export const metadata: Metadata = {
  title: "Etiquetas",
};

/**
 * Panel de etiquetas.
 *
 * El acceso ya lo resuelve el middleware para todo /admin, y
 * las APIs vuelven a comprobar el rol por su cuenta: la
 * interfaz nunca es la única barrera.
 */
export default function AdminTagsPage() {
  return (
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Catálogo</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Etiquetas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Las etiquetas agrupan recursos por temática,
          herramienta o estilo, y alimentan la búsqueda y los
          filtros de la tienda.
        </p>
      </header>

      <div className="mt-7">
        <TagsManager />
      </div>
    </div>
  );
}
