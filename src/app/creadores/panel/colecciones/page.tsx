"use client";

import ColeccionesManager from "./ColeccionesManager";
import { MINIMO_RECURSOS_COLECCION } from "@/lib/colecciones-comerciales-comun";

/**
 * Colecciones comerciales del creador.
 *
 * El acceso lo resuelve el middleware para /creadores/panel, y
 * la API vuelve a comprobar rol y propiedad en cada operación.
 */
export default function PanelColeccionesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-8">
      <header className="rk-fade-up">
        <p className="rk-eyebrow">Creator Studio</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Colecciones
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Reúne varios de tus recursos publicados y véndelos como un
          conjunto, con un precio propio. Para publicar una colección
          hacen falta al menos {MINIMO_RECURSOS_COLECCION} recursos, y
          todos tienen que seguir publicados.
        </p>
      </header>

      <div className="mt-7">
        <ColeccionesManager />
      </div>
    </main>
  );
}
