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
    <div data-vista="otra" className="rk-fade-up">
      <header className="rk-vh">
        <h1 className="rk-title">
          Etiquetas
        </h1>

        <p>
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
