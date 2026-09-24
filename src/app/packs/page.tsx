import type { Metadata } from "next";

import { paginaPublica } from "@/lib/seo";
import { Layers } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/EmptyState";
import PackCard from "@/components/PackCard";
import { listarPacksPublicos } from "@/lib/packs";

export const metadata: Metadata = paginaPublica({
  titulo: "Packs",
  descripcion:
    "Colecciones de recursos digitales de RCKTDMG, con varios recursos por un precio único.",
  ruta: "/packs",
});

export const dynamic = "force-dynamic";

/**
 * Catálogo de packs.
 *
 * Solo packs PUBLICADOS. Los borradores y los archivados no
 * aparecen aquí ni se pueden abrir por su URL.
 */
export default async function PacksPage() {
  const packs = await listarPacksPublicos();

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-10">
        <section className="rk-fade-up">
          <p className="rk-kicker">RCKTDMG Store</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl lg:text-5xl">
            Packs
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Varios recursos de un mismo creador por un precio
            único, más barato que comprarlos por separado.
          </p>
        </section>

        <div className="rk-divider mt-7" />

        {packs.length > 0 ? (
          <>
            <p className="mt-6 text-sm font-medium tabular-nums text-ink/60">
              {packs.length} {packs.length === 1 ? "pack" : "packs"}
            </p>

            <div className="rk-fade-up rk-enter-1 mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {packs.map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-7">
            <EmptyState
              icon={Layers}
              title="Todavía no hay packs publicados"
              description="Cuando los creadores agrupen sus recursos en packs, aparecerán aquí."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
