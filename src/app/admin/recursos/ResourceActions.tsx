"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  resourceId: string;
  resourceSlug: string;
  status: string;
};

export default function ResourceActions({
  resourceId,
  resourceSlug,
  status,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "publicar" | "rechazar") {
    let rejectionReason = "";

    if (action === "rechazar") {
      rejectionReason = window.prompt(
        "Escribe el motivo del rechazo:"
      )?.trim() || "";

      if (!rejectionReason) {
        alert("Debes indicar un motivo para rechazar el recurso.");
        return;
      }

      const confirmed = window.confirm(
        `¿Seguro que deseas rechazar este recurso?\n\nMotivo:\n${rejectionReason}`
      );

      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "¿Seguro que deseas publicar este recurso?"
      );

      if (!confirmed) return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/recursos/${resourceId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body:
            action === "rechazar"
              ? JSON.stringify({ rejectionReason })
              : undefined,
        }
      );

      const text = await response.text();

      let data: {
        error?: string;
        message?: string;
      };

      try {
        data = JSON.parse(text);
      } catch {
        console.error("RESPUESTA DEL SERVIDOR:", text);
        throw new Error(
          "El servidor devolvió una respuesta inesperada."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `No se pudo ${
              action === "publicar"
                ? "publicar"
                : "rechazar"
            } el recurso.`
        );
      }

      alert(
        data.message ||
          (action === "publicar"
            ? "Recurso publicado correctamente."
            : "Recurso rechazado correctamente.")
      );

      window.location.reload();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rk-rec-acc">
      <Link href={`/admin/recursos/${resourceId}`} className="rk-btn rk-btn-line">
        Ver recurso
      </Link>

      {status === "PUBLISHED" && (
        <Link
          href={`/tienda/${resourceSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rk-btn rk-btn-line"
        >
          Ver publicado
        </Link>
      )}

      {status === "PENDING_REVIEW" && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("publicar")}
            className="rk-btn rk-btn-primary"
          >
            {loading ? "Procesando..." : "Publicar"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("rechazar")}
            className="rk-btn rk-us-peli"
          >
            Rechazar
          </button>
        </>
      )}
    </div>
  );
}
