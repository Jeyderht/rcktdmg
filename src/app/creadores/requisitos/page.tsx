import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TablaRequisitos from "@/components/TablaRequisitos";
import BotonGuia from "@/components/BotonGuia";
import { TIPOS_PUBLICACION } from "@/lib/tipos-publicacion";
import { paginaPublica } from "@/lib/seo";

export const metadata: Metadata = paginaPublica({
  titulo: "Requisitos para creadores",
  descripcion:
    "Medidas, formatos y pesos que RCKTDMG exige a cada tipo de contenido. Las mismas reglas que comprueba el sistema al subir un archivo.",
  ruta: "/creadores/requisitos",
});

/**
 * Los requisitos, para quien aún no conoce el sistema.
 *
 * No es un resumen ni una aproximación: los números salen de
 * requisitos-contenido.ts, que es lo que valida de verdad la
 * subida. Si mañana cambia un límite, esta página cambia sola.
 *
 * Está fuera del panel a propósito: alguien que se está
 * planteando presentarse tiene que poder leer qué se le va a
 * pedir sin tener todavía una cuenta.
 */
export default function RequisitosPage() {
  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-5 lg:px-8 lg:pb-24 lg:pt-12">
        <header className="rk-fade-up">
          <p className="rk-kicker">Creadores</p>

          <h1 className="rk-title mt-3 text-[2.25rem] sm:text-5xl">
            Requisitos para creadores
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink/60">
            Estas son las condiciones que debe cumplir lo que publiques.
            Son las mismas que comprueba el sistema al subir cada archivo:
            no hay reglas escritas en un sitio y aplicadas en otro.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/creadores/unete" className="rk-btn rk-btn-primary">
              Únete como creador
              <ArrowUpRight size={15} aria-hidden />
            </Link>

            <BotonGuia />
          </div>
        </header>

        {/* ══════════ TIPOS DE CONTENIDO ══════════ */}
        <section className="rk-fade-up rk-enter-1 mt-14">
          <h2 className="rk-title text-xl sm:text-2xl">
            Tipos de publicación
          </h2>

          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink/60">
            Lo primero que eliges al crear algo. Decide dónde aparece la
            pieza y qué medidas se le exigen.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIPOS_PUBLICACION.map((tipo) => (
              <article key={tipo.clave} className="rk-card p-5">
                <h3 className="text-[15px] font-semibold">{tipo.nombre}</h3>

                <p className="mt-1.5 text-[13px] leading-6 text-ink/60">
                  {tipo.descripcion}
                </p>

                {tipo.formatos.length > 0 && (
                  <ul className="mt-3.5 space-y-1">
                    {tipo.formatos.map((formato) => (
                      <li
                        key={formato.clave}
                        className="flex items-baseline justify-between gap-3 text-[13px]"
                      >
                        <span className="text-ink/60">{formato.nombre}</span>

                        <span className="shrink-0 font-medium tabular-nums">
                          {formato.medida
                            ? `${formato.medida.ancho} × ${formato.medida.alto}`
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

        <div className="rk-fade-up rk-enter-2 mt-14">
          <TablaRequisitos />
        </div>

        {/* ══════════ CÓMO SE PUBLICA ══════════ */}
        <section className="rk-fade-up rk-enter-3 mt-14">
          <h2 className="rk-title text-xl sm:text-2xl">
            Cómo se publica
          </h2>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "1. Lo creas",
                "Eliges el tipo, subes portada, vista previa, galería y el archivo que se vende. Queda guardado como borrador.",
              ],
              [
                "2. Lo envías a revisión",
                "Cuando esté listo, lo mandas. Hasta entonces nadie más lo ve.",
              ],
              [
                "3. Lo revisamos",
                "Se publica, o se te devuelve con un motivo concreto para que lo corrijas y lo vuelvas a enviar.",
              ],
              [
                "4. Se vende",
                "Cada compra genera su licencia y su descarga. Tú cobras tu parte por cada venta.",
              ],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="rk-card p-5">
                <p className="text-[15px] font-semibold">{titulo}</p>

                <p className="mt-1.5 text-[13px] leading-6 text-ink/60">
                  {texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="rk-fade-up rk-enter-4 mt-14 rk-card p-6 text-center sm:p-10">
          <h2 className="rk-title text-xl sm:text-2xl">
            ¿Lo tienes claro?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Preséntate con tu trabajo. Revisamos cada solicitud a mano.
          </p>

          <Link
            href="/creadores/unete"
            className="rk-btn rk-btn-primary mt-7"
          >
            Únete como creador
            <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
