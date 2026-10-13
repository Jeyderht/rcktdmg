import type { Metadata } from "next";

import CategoriasManager from "./CategoriasManager";

export const metadata: Metadata = {
  title: "Categorías",
};

/**
 * Panel de categorías.
 *
 * Las categorías son la estructura del catálogo. Hasta ahora
 * solo existían las creadas al montar la base y no había
 * ninguna forma de tocarlas; esta pantalla es esa forma, y
 * sigue siendo exclusiva de administración.
 */
export default function AdminCategoriasPage() {
  return (
    <div data-vista="otra" className="rk-fade-up">
      <header className="rk-vh">
        <h1 className="rk-title">
          Categorías
        </h1>

        <p>
          Las secciones comerciales de la tienda. Los creadores eligen
          entre estas al publicar y no pueden añadir ninguna. Una
          categoría con recursos se retira, no se borra.
        </p>
      </header>

      <div className="mt-7">
        <CategoriasManager />
      </div>
    </div>
  );
}
