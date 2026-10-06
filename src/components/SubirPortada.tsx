"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

/**
 * Subida de portada, con vista previa.
 *
 * La portada es PÚBLICA: va al almacén público, que es el
 * mismo que ya usan las imágenes de los recursos. No se toca
 * el almacén privado, donde viven los archivos que se venden.
 *
 * Lo usan las categorías y las colecciones comerciales, que
 * necesitan exactamente lo mismo: elegir una imagen, verla
 * antes de guardar, reemplazarla y quitarla.
 *
 * Sube el archivo al momento y devuelve su URL a quien lo
 * monta; guardar la relación con la categoría o la colección
 * es cosa del formulario que lo contiene.
 */
export default function SubirPortada({
  valor,
  alCambiar,
  etiqueta = "Portada",
  ayuda,
}: {
  /** URL actual, o null si todavía no hay ninguna. */
  valor: string | null;
  /** Se llama con la URL nueva, o con null al quitarla. */
  alCambiar: (url: string | null) => void;
  etiqueta?: string;
  ayuda?: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(archivo: File) {
    setSubiendo(true);
    setError("");

    try {
      const datos = new FormData();

      datos.append("file", archivo);

      const respuesta = await fetch("/api/uploads/product-image", {
        method: "POST",
        body: datos,
      });

      const json = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(json.error || "No se pudo subir la imagen.");
      }

      alCambiar(json.imageUrl);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo subir."
      );
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <span className="rk-label">{etiqueta}</span>

      {valor ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <span className="rk-frame relative block h-24 w-40 shrink-0 overflow-hidden rounded-rk-sm">
            <Image
              src={valor}
              alt="Vista previa de la portada"
              fill
              className="object-cover"
              sizes="160px"
            />
          </span>

          <div className="flex flex-wrap gap-2">
            <label className="rk-btn rk-btn-line cursor-pointer">
              {subiendo ? (
                <Loader2 size={14} aria-hidden className="animate-spin" />
              ) : (
                <ImagePlus size={14} aria-hidden />
              )}
              Reemplazar

              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];

                  if (archivo) void subir(archivo);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => alCambiar(null)}
              aria-label="Quitar portada"
              className="rk-icon-button-danger"
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <label className="rk-upload mt-1.5 justify-center">
          {subiendo ? (
            <>
              <Loader2 size={15} aria-hidden className="animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <ImagePlus size={15} aria-hidden />
              Subir portada
            </>
          )}

          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const archivo = e.target.files?.[0];

              if (archivo) void subir(archivo);
            }}
          />
        </label>
      )}

      {ayuda && (
        <p className="mt-1.5 text-[13px] leading-6 text-ink/50">{ayuda}</p>
      )}

      {error && (
        <p role="alert" className="rk-upload-error mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
