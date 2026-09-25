"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * Descargar una colección entera.
 *
 * No es un enlace normal a propósito. El servidor puede tener
 * que armar el ZIP en el momento, y eso tarda: con un <a> la
 * persona pulsa y no pasa nada visible durante varios
 * segundos, así que vuelve a pulsar y pide el trabajo dos
 * veces.
 *
 * Además, cuando el ZIP no se puede armar —demasiado grande,
 * o una pieza sin archivo— el servidor responde con un motivo
 * en JSON. Un enlace descargaría ESE JSON como si fuera el
 * archivo. Aquí se lee y se enseña como lo que es: una
 * explicación.
 *
 * La URL privada del almacén nunca aparece: se pide siempre a
 * la misma ruta del servidor, que comprueba la compra.
 */
export default function BotonDescargarColeccion({
  collectionId,
  nombre,
}: {
  collectionId: string;
  nombre: string;
}) {
  const [estado, setEstado] = useState<"quieto" | "preparando">("quieto");
  const [error, setError] = useState("");

  async function descargar() {
    // Segundo clic mientras trabaja: se ignora.
    if (estado === "preparando") return;

    setEstado("preparando");
    setError("");

    try {
      const respuesta = await fetch(
        `/api/downloads/coleccion/${collectionId}`
      );

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));

        throw new Error(datos.error || "No se pudo preparar la descarga.");
      }

      const archivo = await respuesta.blob();

      /*
        El nombre lo manda el servidor en la cabecera; si no
        viene, se compone con el de la colección.
      */
      const cabecera = respuesta.headers.get("content-disposition") || "";
      const coincidencia = cabecera.match(/filename="([^"]+)"/);

      const enlace = document.createElement("a");
      const url = URL.createObjectURL(archivo);

      enlace.href = url;
      enlace.download = coincidencia?.[1] || `${nombre}.zip`;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo preparar la descarga."
      );
    } finally {
      setEstado("quieto");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={descargar}
        disabled={estado === "preparando"}
        aria-busy={estado === "preparando"}
        /*
          `!py-3` y no `!py-2.5`: con el padding anterior el
          botón medía 42 px de alto, por debajo del mínimo
          táctil de 44. Medido en el navegador a 375, 390 y
          414 px.
        */
        className="rk-btn rk-btn-primary w-full rk-btn-compact !py-3 !text-sm disabled:opacity-70"
      >
        {estado === "preparando" ? (
          <>
            <Loader2 size={14} aria-hidden className="animate-spin" />
            Preparando…
          </>
        ) : (
          <>
            <Download size={14} aria-hidden />
            Descargar colección
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-rk-sm border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] leading-5 text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
