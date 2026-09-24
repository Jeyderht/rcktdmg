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
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Catálogo</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Categorías
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
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
