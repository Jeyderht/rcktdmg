"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileArchive, RefreshCw, X, Upload } from "lucide-react";

import { subirArchivoDeProducto } from "@/lib/storage/client-upload";
import {
  EXTENSIONES_COMPRIMIDO,
  MAXIMO_BYTES_ARCHIVO,
  enMegas as formatearMegas,
} from "@/lib/requisitos-contenido";

/**
 * Subir un archivo privado (el ZIP de una colección).
 *
 * Hermano de SubidorImagen y con las mismas reglas: se ve lo
 * subido, se puede reemplazar o quitar antes de guardar, y la
 * barra de progreso solo enseña un número cuando ese número es
 * real.
 *
 * El archivo va al almacén PRIVADO. Lo que se guarda aquí es
 * una referencia, no un enlace público: para descargarlo hay
 * que pasar por /api/downloads, que comprueba la compra.
 *
 * La extensión y el tamaño se miran antes de enviar nada, para
 * no gastar una subida de 100 MB que el servidor va a rechazar.
 * El límite de verdad sigue estando en el servidor.
 */
export type ArchivoGuardado = {
  url: string;
  nombre: string;
  bytes: number;
};

/*
  Las reglas vienen de requisitos-contenido.ts: las mismas que
  se le enseñan al creador en la página de requisitos y las
  mismas que comprueba el servidor.
*/
const EXTENSIONES: readonly string[] = EXTENSIONES_COMPRIMIDO;

const MAXIMO_BYTES = MAXIMO_BYTES_ARCHIVO;

const enMegas = formatearMegas;

export default function SubidorArchivo({
  id,
  etiqueta,
  ayuda,
  valor,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  valor: ArchivoGuardado | null;
  alCambiar: (archivo: ArchivoGuardado | null) => void;
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

    const punto = file.name.lastIndexOf(".");
    const extension = punto > -1 ? file.name.slice(punto).toLowerCase() : "";

    if (!EXTENSIONES.includes(extension)) {
      setError(
        `Formato no admitido${
          extension ? ` (${extension})` : ""
        }. Sube un ${EXTENSIONES.join(", ")}.`
      );
      input.value = "";
      return;
    }

    if (file.size > MAXIMO_BYTES) {
      setError(
        `El archivo pesa ${enMegas(file.size)} y el máximo son ${enMegas(
          MAXIMO_BYTES
        )}.`
      );
      input.value = "";
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      const subido = await subirArchivoDeProducto(file, {
        alProgresar: (porcentaje) => setProgreso(porcentaje),
      });

      alCambiar({
        url: subido.fileUrl,
        nombre: subido.fileName,
        bytes: file.size,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir el archivo."
      );
    } finally {
      setSubiendo(false);
      setProgreso(null);

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
      <p className="mb-2 text-sm font-medium">{etiqueta}</p>

      <input
        ref={entrada}
        id={id}
        type="file"
        accept={EXTENSIONES.join(",")}
        onChange={alElegir}
        disabled={subiendo}
        className="hidden"
      />

      {valor ? (
        <div className="rk-upload-file">
          <span aria-hidden className="rk-upload-icon">
            <FileArchive />
          </span>

          <div className="min-w-0 flex-1">
            <p className="rk-upload-name">{valor.nombre}</p>

            <p className="rk-upload-status">
              <CheckCircle2 aria-hidden />
              Subido · <span className="tabular-nums">{enMegas(valor.bytes)}</span>
            </p>

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
            {subiendo ? <FileArchive /> : <Upload />}
          </span>

          <span className="rk-upload-body">
            <span className="rk-upload-title">
              {subiendo ? "Subiendo…" : `Subir ${etiqueta.toLowerCase()}`}
            </span>

            <span className="rk-upload-hint">
              {ayuda ?? `ZIP, RAR o 7Z · hasta ${enMegas(MAXIMO_BYTES)}`}
            </span>
          </span>
        </button>
      )}

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
