"use client";

import Link from "next/link";
import { useState } from "react";

import { useDialogo } from "@/components/ui/Dialogos";

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
  const { confirmar, avisar, pedirTexto } = useDialogo();

  async function handleAction(action: "publicar" | "rechazar") {
    let rejectionReason = "";

    if (action === "rechazar") {
      rejectionReason =
        (await pedirTexto({
          titulo: "Rechazar recurso",
          mensaje: "El creador verá este motivo.",
          etiqueta: "Motivo del rechazo",
          aceptar: "Rechazar",
          peligro: true,
          obligatorio: true,
        })) || "";

      if (!rejectionReason) return;
    } else {
      const confirmed = await confirmar({
        titulo: "¿Publicar este recurso?",
        mensaje: "Se verá en la tienda en cuanto lo publiques.",
        aceptar: "Publicar",
      });

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

      await avisar(
        data.message ||
          (action === "publicar"
            ? "Recurso publicado correctamente."
            : "Recurso rechazado correctamente.")
      );

      window.location.reload();
    } catch (error) {
      console.error(error);

      await avisar({
        titulo: "No se pudo completar",
        mensaje:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-row flex-wrap gap-2 lg:w-40 lg:flex-col">
      <Link
        href={`/admin/recursos/${resourceId}`}
        className="rk-btn rk-btn-line flex-1 lg:flex-none"
      >
        Ver recurso
      </Link>

      {status === "PUBLISHED" && (
        <Link
          href={`/tienda/${resourceSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rk-btn rk-btn-line flex-1 lg:flex-none"
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
            className="rk-btn rk-btn-primary flex-1 lg:flex-none"
          >
            {loading ? "Procesando..." : "Publicar"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction("rechazar")}
            className="rk-upload-error rk-btn flex-1 hover:bg-danger/10 lg:flex-none"
          >
            Rechazar
          </button>
        </>
      )}
    </div>
  );
}