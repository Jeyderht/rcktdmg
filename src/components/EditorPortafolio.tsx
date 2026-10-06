"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";

import SubidorImagen, { type EstadoImagen } from "@/components/SubidorImagen";
import {
  LARGO_DESCRIPCION_TRABAJO,
  LARGO_TITULO_TRABAJO,
  MAXIMO_TRABAJOS_PORTAFOLIO,
  type TrabajoPortafolio,
} from "@/lib/solicitudes-comun";

/**
 * El portafolio de un candidato a creador.
 *
 * Cada trabajo lleva título y, al menos, una imagen o un
 * enlace: un título suelto no enseña nada y el servidor lo
 * rechaza igual, así que aquí se avisa antes.
 *
 * El ORDEN importa: es en el que administración va a verlo, y
 * quien se presenta sabe mejor que nadie por dónde quiere que
 * empiecen a mirar. Se arrastra en escritorio y se mueve con
 * flechas en táctil, las dos cosas sobre la misma función.
 */
export default function EditorPortafolio({
  trabajos,
  alCambiar,
}: {
  trabajos: TrabajoPortafolio[];
  alCambiar: (trabajos: TrabajoPortafolio[]) => void;
}) {
  const [arrastrado, setArrastrado] = useState<number | null>(null);

  const lleno = trabajos.length >= MAXIMO_TRABAJOS_PORTAFOLIO;

  function cambiar(indice: number, parche: Partial<TrabajoPortafolio>) {
    alCambiar(
      trabajos.map((t, i) => (i === indice ? { ...t, ...parche } : t))
    );
  }

  /** Mueve un trabajo de sitio. La usan el arrastre y las flechas. */
  function mover(desde: number | null, hasta: number) {
    if (desde === null || desde === hasta) return;
    if (hasta < 0 || hasta >= trabajos.length) return;

    const copia = [...trabajos];
    const [pieza] = copia.splice(desde, 1);

    copia.splice(hasta, 0, pieza);

    alCambiar(copia);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Tus trabajos</p>

        <p className="text-[12px] tabular-nums text-ink/55">
          {trabajos.length} de {MAXIMO_TRABAJOS_PORTAFOLIO}
        </p>
      </div>

      <p className="mt-1 text-[13px] leading-5 text-ink/60">
        Sube las piezas que mejor te representen. Se verán en este orden.
      </p>

      {trabajos.length > 0 && (
        <ol className="mt-4 space-y-3">
          {trabajos.map((trabajo, indice) => (
            <li
              key={indice}
              draggable
              onDragStart={() => setArrastrado(indice)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                mover(arrastrado, indice);
                setArrastrado(null);
              }}
              onDragEnd={() => setArrastrado(null)}
              className={`rk-row-card transition-opacity duration-fast ${
                arrastrado === indice ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {/* El asa solo sirve con ratón; en táctil mandan las flechas. */}
                <span
                  aria-hidden
                  className="hidden shrink-0 cursor-grab text-ink/35 sm:block"
                >
                  <GripVertical size={15} />
                </span>

                <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-ink/45">
                  {indice + 1}
                </span>

                <span className="min-w-0 flex-1" />

                <button
                  type="button"
                  onClick={() => mover(indice, indice - 1)}
                  disabled={indice === 0}
                  aria-label={`Subir el trabajo ${indice + 1}`}
                  className="rk-notif-check disabled:opacity-30" style={{ margin: 0, width: 40, height: 40 }}
                >
                  <ChevronUp size={16} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => mover(indice, indice + 1)}
                  disabled={indice === trabajos.length - 1}
                  aria-label={`Bajar el trabajo ${indice + 1}`}
                  className="rk-notif-check disabled:opacity-30" style={{ margin: 0, width: 40, height: 40 }}
                >
                  <ChevronDown size={16} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    alCambiar(trabajos.filter((_, i) => i !== indice))
                  }
                  aria-label={`Quitar el trabajo ${indice + 1}`}
                  className="rk-icon-button-danger"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-[7rem_1fr]">
                <div>
                  {trabajo.imageUrl ? (
                    <div>
                      <span className="rk-media relative block aspect-square w-full overflow-hidden rounded-rk-sm">
                        <Image
                          src={trabajo.imageUrl}
                          alt={trabajo.title || `Trabajo ${indice + 1}`}
                          fill
                          className="object-cover"
                          sizes="112px"
                          unoptimized
                        />
                      </span>

                      <button
                        type="button"
                        onClick={() => cambiar(indice, { imageUrl: null })}
                        className="rk-btn rk-btn-line rk-btn-compact mt-2 w-full"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  ) : (
                    <SubidorImagen
                      id={`trabajo-${indice}`}
                      etiqueta="Imagen"
                      valor={null}
                      alCambiar={(imagen: EstadoImagen | null) =>
                        cambiar(indice, { imageUrl: imagen?.url ?? null })
                      }
                      ayuda="Opcional si dejas un enlace."
                    />
                  )}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label
                      htmlFor={`titulo-${indice}`}
                      className="rk-label"
                    >
                      Título
                    </label>

                    <input
                      id={`titulo-${indice}`}
                      value={trabajo.title}
                      onChange={(e) =>
                        cambiar(indice, { title: e.target.value })
                      }
                      maxLength={LARGO_TITULO_TRABAJO}
                      placeholder="Campaña de verano para…"
                      className="rk-input mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`enlace-${indice}`}
                      className="rk-label"
                    >
                      Enlace
                    </label>

                    <input
                      id={`enlace-${indice}`}
                      type="url"
                      value={trabajo.linkUrl ?? ""}
                      onChange={(e) =>
                        cambiar(indice, { linkUrl: e.target.value || null })
                      }
                      placeholder="https://…"
                      className="rk-input mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`desc-${indice}`}
                      className="rk-label"
                    >
                      Qué es
                    </label>

                    <textarea
                      id={`desc-${indice}`}
                      value={trabajo.description ?? ""}
                      onChange={(e) =>
                        cambiar(indice, {
                          description: e.target.value || null,
                        })
                      }
                      maxLength={LARGO_DESCRIPCION_TRABAJO}
                      rows={2}
                      placeholder="Para quién lo hiciste y qué resolvía."
                      className="rk-textarea mt-1 w-full"
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        disabled={lleno}
        onClick={() =>
          alCambiar([
            ...trabajos,
            { title: "", description: null, imageUrl: null, linkUrl: null },
          ])
        }
        className="rk-btn rk-btn-line mt-4 w-full disabled:opacity-50"
      >
        <Plus size={15} aria-hidden />
        {lleno ? "Has llegado al máximo" : "Añadir un trabajo"}
      </button>
    </div>
  );
}
