import type { Metadata } from "next";
import { Library } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/EmptyState";
import ColeccionCard from "@/components/ColeccionCard";
import { listarColeccionesPublicas } from "@/lib/colecciones-comerciales";
import { paginaPublica } from "@/lib/seo";

export const metadata: Metadata = paginaPublica({
  titulo: "Colecciones",
  descripcion:
    "Colecciones completas de recursos digitales de RcktX: varios recursos de una misma temática por un precio único.",
  ruta: "/colecciones-comerciales",
});

export const dynamic = "force-dynamic";

/**
 * Catálogo de colecciones comerciales.
 *
 * Solo las PUBLICADAS. Los borradores y las archivadas no
 * aparecen aquí ni se pueden abrir por su URL.
 */
export default async function ColeccionesComercialesPage() {
  const colecciones = await listarColeccionesPublicas();

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
        <section className="rk-fade-up">
          <p className="rk-kicker">RcktX Store</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl lg:text-5xl">
            Colecciones
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Conjuntos completos de una misma temática, con todo lo
            necesario para cubrirla, por un precio único.
          </p>
        </section>

        <div className="rk-divider mt-7" />

        {colecciones.length > 0 ? (
          <>
            <p className="mt-6 text-sm font-medium tabular-nums text-ink/60">
              {colecciones.length}{" "}
              {colecciones.length === 1 ? "colección" : "colecciones"}
            </p>

            <div className="rk-fade-up rk-enter-1 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colecciones.map((coleccion) => (
                <ColeccionCard
                  key={coleccion.id}
                  coleccion={coleccion}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-7">
            <EmptyState
              icon={Library}
              title="Todavía no hay colecciones publicadas"
              description="Cuando los creadores reúnan sus recursos en colecciones, aparecerán aquí."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
