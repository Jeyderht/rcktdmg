"use client";

import Footer from "@/components/Footer";
import PacksManager from "./PacksManager";

/**
 * Packs del creador.
 *
 * El acceso a /creadores/panel lo resuelve el middleware; que
 * cada pack sea SUYO lo comprueba la API en cada operación.
 */
export default function PacksPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <header className="rk-fade-up">
          <p className="rk-eyebrow">Creator Studio</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Packs
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">
            Agrupa recursos tuyos ya publicados y véndelos juntos
            por un precio único. Quien lo compre recibe cada
            recurso por separado, con su propia licencia.
          </p>
        </header>

        <div className="rk-divider mt-7" />

        <div className="mt-6">
          <PacksManager />
        </div>
      </main>

      <Footer />
    </>
  );
}
