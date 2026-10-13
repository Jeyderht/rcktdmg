import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import TablaRequisitos from "@/components/TablaRequisitos";
import { TIPOS_PUBLICACION } from "@/lib/tipos-publicacion";

export const metadata: Metadata = {
  title: "Requisitos de contenido",
};

/**
 * Los requisitos, para quien revisa.
 *
 * Es EXACTAMENTE lo mismo que ve el creador: el mismo
 * componente, alimentado por la misma fuente. Si la versión
 * de administración fuera una copia, tarde o temprano se
 * rechazaría contenido por una regla que el creador nunca
 * llegó a leer.
 */
export default function AdminRequisitosPage() {
  return (
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Moderación</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Requisitos de contenido
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Las condiciones que debe cumplir lo que se publica. Son las
          mismas que ve el creador y las mismas que aplica el sistema al
          subir cada archivo.
        </p>

        <Link
          href="/creadores/requisitos"
          className="rk-btn rk-btn-line mt-5"
        >
          <ExternalLink size={14} aria-hidden />
          Ver la página pública
        </Link>
      </header>

      {/* ══════════ TIPOS ══════════ */}
      <section className="mt-10">
        <h2 className="rk-title text-lg">Tipos de publicación</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIPOS_PUBLICACION.map((tipo) => (
            <article key={tipo.clave} className="rk-row-card">
              <p className="text-[14px] font-semibold">{tipo.nombre}</p>

              <p className="mt-1 text-[12px] leading-5 text-ink/55">
                {tipo.categoriaSlug
                  ? `Categoría: ${tipo.categoriaSlug}`
                  : "Se arma con recursos ya publicados"}
              </p>

              {tipo.formatos.length > 0 && (
                <ul className="rk-specs mt-1.5">
                  {tipo.formatos.map((formato) => (
                    <li
                      key={formato.clave}
                      className=""
                    >
                      <span className="text-ink/55">{formato.nombre}</span>

                      <span className="shrink-0 font-semibold tabular-nums">
                        {formato.medida
                          ? `${formato.medida.ancho}×${formato.medida.alto}`
                          : "libre"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <TablaRequisitos />
      </div>
    </div>
  );
}
