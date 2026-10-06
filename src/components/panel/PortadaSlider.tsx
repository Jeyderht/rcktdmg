"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import SubirPortada from "@/components/SubirPortada";

/**
 * Portada horizontal del slider del inicio, para un recurso.
 *
 * Se monta en «Imágenes» del recurso. Sube la imagen con el
 * mismo componente que las categorías y la guarda al momento:
 * el servidor comprueba que sea horizontal 16:9 y, si no, la
 * rechaza con el motivo.
 */
export default function PortadaSlider({ productId }: { productId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch(
          `/api/creadores/productos/${productId}/slider`,
          { cache: "no-store" }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) throw new Error(datos.error || "No se pudo cargar.");

        if (!cancelado) setUrl(datos.sliderUrl ?? null);
      } catch (fallo) {
        if (!cancelado) {
          setError(fallo instanceof Error ? fallo.message : "No se pudo cargar.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [productId]);

  async function guardar(nueva: string | null) {
    setGuardando(true);
    setError("");
    setAviso("");

    try {
      const respuesta = await fetch(
        `/api/creadores/productos/${productId}/slider`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sliderUrl: nueva }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar.");

      setUrl(datos.sliderUrl ?? null);
      setAviso(nueva ? "Portada del slider guardada." : "Portada del slider quitada.");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rk-card mt-6 p-5 sm:p-6">
      <p className="rk-kicker">Inicio</p>

      <h2 className="rk-title mt-2 text-xl">Portada para el slider</h2>

      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink/60">
        Opcional. Una imagen horizontal para promocionar este recurso en el
        slider de arriba del inicio. Debe ser 16:9, por ejemplo 1600 × 900 px
        (mínimo 1280 px de ancho). Sale cuando el recurso está publicado.
      </p>

      <div className="mt-4">
        {cargando ? (
          <p className="flex items-center gap-2 text-sm text-ink/55">
            <Loader2 size={15} aria-hidden className="animate-spin" />
            Cargando…
          </p>
        ) : (
          <SubirPortada
            valor={url}
            alCambiar={(nueva) => void guardar(nueva)}
            etiqueta="Imagen horizontal (16:9)"
            ayuda="JPG, PNG o WEBP. Recomendado 1600 × 900 px."
          />
        )}
      </div>

      {guardando && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink/55">
          <Loader2 size={15} aria-hidden className="animate-spin" />
          Guardando…
        </p>
      )}

      {error && (
        <p role="alert" className="rk-upload-error mt-3">
          {error}
        </p>
      )}

      {aviso && !error && (
        <p role="status" className="mt-3 text-sm text-ink/70">
          {aviso}
        </p>
      )}
    </section>
  );
}
