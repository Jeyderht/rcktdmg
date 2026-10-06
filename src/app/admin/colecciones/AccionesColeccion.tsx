"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

/**
 * Publicar o rechazar una colección en revisión.
 *
 * Hermano de lo que administración ya hacía con los recursos, y
 * con la misma exigencia: rechazar obliga a escribir un motivo,
 * porque un "no" sin explicación deja al creador sin nada que
 * corregir.
 *
 * El botón cambia en cuanto se pulsa —antes de que el servidor
 * conteste— para que nunca parezca congelado.
 */
export default function AccionesColeccion({
  collectionId,
  nombre,
}: {
  collectionId: string;
  nombre: string;
}) {
  const router = useRouter();

  const [enCurso, setEnCurso] = useState<"publicar" | "rechazar" | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  async function resolver(accion: "publicar" | "rechazar") {
    setEnCurso(accion);
    setError("");

    try {
      const respuesta = await fetch(`/api/admin/colecciones/${collectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, rejectionReason: motivo }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "No se pudo.");

      setRechazando(false);
      setMotivo("");

      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo.");
    } finally {
      setEnCurso(null);
    }
  }

  if (rechazando) {
    return (
      <div className="w-full">
        <label
          htmlFor={`motivo-${collectionId}`}
          className="text-[13px] font-medium"
        >
          Motivo del rechazo de «{nombre}»
        </label>

        <textarea
          id={`motivo-${collectionId}`}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          maxLength={500}
          autoFocus
          placeholder="Qué tiene que cambiar para poder publicarla."
          className="rk-textarea mt-1.5 w-full"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCurso !== null || !motivo.trim()}
            onClick={() => resolver("rechazar")}
            className="rk-btn rk-btn-line disabled:opacity-50"
          >
            {enCurso === "rechazar" ? (
              <Loader2 size={14} aria-hidden className="animate-spin" />
            ) : (
              <X size={14} aria-hidden />
            )}
            Confirmar rechazo
          </button>

          <button
            type="button"
            onClick={() => {
              setRechazando(false);
              setError("");
            }}
            className="rk-btn rk-btn-line"
          >
            Cancelar
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={enCurso !== null}
        onClick={() => resolver("publicar")}
        className="rk-btn rk-btn-ink disabled:opacity-60"
      >
        {enCurso === "publicar" ? (
          <Loader2 size={14} aria-hidden className="animate-spin" />
        ) : (
          <Check size={14} aria-hidden />
        )}
        Publicar
      </button>

      <button
        type="button"
        disabled={enCurso !== null}
        onClick={() => setRechazando(true)}
        className="rk-btn rk-btn-line disabled:opacity-60"
      >
        <X size={14} aria-hidden />
        Rechazar
      </button>

      {error && (
        <span role="alert" className="text-[13px] text-danger">
          {error}
        </span>
      )}
    </>
  );
}
