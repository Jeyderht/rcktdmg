"use client";

import { useState } from "react";

/**
 * Interruptor «Vista previa libre» de un recurso (editor del creador).
 *
 * Encendido: cualquiera ve sus imágenes. Apagado: «solo para
 * registrados»; los visitantes sin sesión ven la miniatura
 * desenfocada (o un fondo neutro mientras no exista).
 *
 * Se guarda al pulsarlo, aparte del formulario, con su propio
 * endpoint: así funciona también en recursos ya publicados, cuyo
 * formulario solo deja cambiar la portada. Quién puede cambiarlo lo
 * comprueba el servidor; aquí solo se enseña el resultado.
 */
export default function InterruptorVistaPrevia({
  productId,
  inicial,
}: {
  productId: string;
  inicial: boolean;
}) {
  const [libre, setLibre] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cambiar() {
    const siguiente = !libre;

    setGuardando(true);
    setError("");
    setLibre(siguiente);

    try {
      const respuesta = await fetch(
        `/api/creadores/productos/${productId}/vista-previa`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewLibre: siguiente }),
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setLibre(!siguiente);
        setError(datos.error || "No se pudo guardar el cambio.");
        return;
      }

      setLibre(datos.previewLibre === true);
    } catch {
      setLibre(!siguiente);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex min-h-[2.75rem] items-center justify-between gap-4">
        <div className="min-w-0">
          <p id={`vp-${productId}`} className="rk-label">
            Vista previa libre
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            {libre
              ? "Cualquiera ve sus imágenes, con o sin cuenta."
              : "Solo registrados: los visitantes ven una miniatura desenfocada y se les invita a crear una cuenta."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={libre}
          aria-labelledby={`vp-${productId}`}
          disabled={guardando}
          onClick={cambiar}
          /* Área táctil de 44 px; la pista visible es más pequeña. */
          className="rk-press grid h-11 w-14 shrink-0 place-items-center disabled:opacity-60"
        >
          <span
            aria-hidden
            className={`relative block h-7 w-12 rounded-full border border-line transition-colors duration-200 motion-reduce:transition-none ${
              libre ? "bg-ink" : "bg-ink/10"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 block h-[22px] w-[22px] rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
                libre ? "translate-x-5 bg-background" : "translate-x-0 bg-ink/60"
              }`}
            />
          </span>
        </button>
      </div>

      {error && (
        <p role="alert" className="rk-upload-error mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
