"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CheckCircle2, ImageIcon, RefreshCw, X, Upload } from "lucide-react";

import { subirImagen } from "@/lib/storage/client-upload";
import AvisoRequisitos from "@/components/AvisoRequisitos";
import {
  revisarMedidas,
  type MedidaExigida,
} from "@/lib/tipos-publicacion";

/**
 * Subir una imagen del recurso.
 *
 * Sustituye al campo donde antes había que pegar una URL, que
 * obligaba a subir la imagen a otro sitio primero. Aquí se
 * elige el archivo y ya está.
 *
 * Tres cosas que el campo de texto no podía hacer:
 *
 * - Se ve lo que se ha subido, antes de guardar nada.
 * - Se puede reemplazar sin haber enviado el formulario.
 * - Las medidas se comprueban EN EL NAVEGADOR, leyendo la
 *   propia imagen antes de mandarla. Una story que no es
 *   1080 × 1920 se rechaza sin gastar la subida.
 *
 * La barra de progreso es real cuando el navegador informa
 * del avance —XHR sobre el endpoint local— y pasa a
 * indeterminada cuando la subida va directa al almacén y no
 * hay forma de saberlo. Nunca finge un porcentaje.
 */
export type EstadoImagen = {
  url: string;
  ancho: number | null;
  alto: number | null;
};

/** Lee ancho y alto sin enviar el archivo a ninguna parte. */
async function medirImagen(
  file: File
): Promise<{ ancho: number; alto: number } | null> {
  const objeto = URL.createObjectURL(file);

  try {
    const medidas = await new Promise<{ ancho: number; alto: number } | null>(
      (resolver) => {
        const img = new window.Image();

        img.onload = () =>
          resolver({ ancho: img.naturalWidth, alto: img.naturalHeight });

        img.onerror = () => resolver(null);

        img.src = objeto;
      }
    );

    return medidas;
  } finally {
    URL.revokeObjectURL(objeto);
  }
}

export default function SubidorImagen({
  id,
  etiqueta,
  ayuda,
  medida = null,
  valor,
  alCambiar,
  obligatorio = false,
  requisito,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  /** Medidas exigidas, si el tipo de publicación las impone. */
  medida?: MedidaExigida | null;
  valor: EstadoImagen | null;
  alCambiar: (estado: EstadoImagen | null) => void;
  obligatorio?: boolean;
  /**
   * Clave de requisitos-contenido.ts. Con ella, junto a la
   * etiqueta aparece un ⓘ con las reglas exactas del campo.
   */
  requisito?: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function alElegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];

    /*
      El input NO se vacía todavía.

      Vaciarlo antes de usar el archivo deja el `File` sin su
      respaldo y la imagen no se puede ni medir ni subir: era
      justo lo que pasaba, y se veía como "no se pudieron leer
      las medidas" incluso con una imagen correcta. Se limpia
      al final, que es lo único que hace falta para que elegir
      dos veces el mismo archivo vuelva a avisar.
    */
    const input = evento.target;

    if (!file) {
      input.value = "";
      return;
    }

    setError("");

    const reales = await medirImagen(file);

    const problema = revisarMedidas(medida, reales);

    if (problema) {
      setError(problema);
      input.value = "";
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      const subida = await subirImagen("product-image", file, undefined, {
        alProgresar: (porcentaje) => setProgreso(porcentaje),
      });

      alCambiar({
        url: subida.url,
        ancho: reales?.ancho ?? null,
        alto: reales?.alto ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir la imagen."
      );
    } finally {
      setSubiendo(false);
      setProgreso(null);

      // Ahora sí: para que elegir el mismo archivo vuelva a avisar.
      input.value = "";
    }
  }

  /*
    Soltar un archivo encima de la caja: se pasa al input oculto
    y se reutiliza alElegir, con las mismas comprobaciones.
  */
  function alSoltar(evento: React.DragEvent<HTMLButtonElement>) {
    evento.preventDefault();
    setArrastrando(false);

    if (subiendo) {
      return;
    }

    const archivo = evento.dataTransfer.files?.[0];
    const input = entrada.current;

    if (!archivo || !input) {
      return;
    }

    const transferencia = new DataTransfer();
    transferencia.items.add(archivo);
    input.files = transferencia.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        {etiqueta}

        {obligatorio && (
          <span className="text-ink/45" aria-hidden>
            *
          </span>
        )}

        {medida && (
          <span className="rk-badge rk-badge-neutral tabular-nums">
            {medida.ancho} × {medida.alto}
          </span>
        )}

        {requisito && <AvisoRequisitos clave={requisito} medida={medida} />}
      </p>

      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={alElegir}
        disabled={subiendo}
        className="hidden"
      />

      {valor ? (
        <div className="rk-upload-file">
          <span className="rk-upload-thumb">
            <Image
              src={valor.url}
              alt={`${etiqueta} subida`}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="rk-upload-status" style={{ marginTop: 0 }}>
              <CheckCircle2 aria-hidden />
              Subida
            </p>

            {valor.ancho && valor.alto && (
              <p className="rk-upload-meta">
                {valor.ancho} × {valor.alto} px
              </p>
            )}

            <div className="rk-upload-actions">
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                disabled={subiendo}
                className="rk-btn rk-btn-line"
              >
                <RefreshCw aria-hidden />
                Reemplazar
              </button>

              <button
                type="button"
                onClick={() => alCambiar(null)}
                disabled={subiendo}
                className="rk-btn rk-btn-danger"
              >
                <X aria-hidden />
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={subiendo}
          className={`rk-upload${arrastrando ? " is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
        >
          <span aria-hidden className="rk-upload-icon">
            {subiendo ? <ImageIcon /> : <Upload />}
          </span>

          <span className="rk-upload-body">
            <span className="rk-upload-title">
              {subiendo ? "Subiendo…" : `Subir ${etiqueta.toLowerCase()}`}
            </span>

            <span className="rk-upload-hint">
              {ayuda ?? "PNG, JPG o WEBP · hasta 10 MB"}
            </span>
          </span>
        </button>
      )}

      {/* PROGRESO */}
      {subiendo && (
        <div
          className={`rk-progress-wrap${
            progreso === null ? " rk-progress-indeterminate" : ""
          }`}
        >
          <div
            role="progressbar"
            aria-label={`Subiendo ${etiqueta.toLowerCase()}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progreso ?? undefined}
            className="rk-progress"
          >
            <div
              className="rk-progress-bar"
              style={progreso === null ? undefined : { width: `${progreso}%` }}
            />
          </div>

          <p className="rk-progress-meta">
            <span>Subiendo…</span>
            {progreso !== null && <strong>{progreso}%</strong>}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rk-upload-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
