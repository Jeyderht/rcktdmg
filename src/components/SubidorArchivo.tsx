"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileArchive, RefreshCw, X } from "lucide-react";

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
        <div className="flex items-start gap-3 rounded-rk-md border border-line/12 p-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-rk-sm bg-ink/[0.06]"
          >
            <FileArchive size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{valor.nombre}</p>

            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 size={12} aria-hidden />
              Subido · <span className="tabular-nums">{enMegas(valor.bytes)}</span>
            </p>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                disabled={subiendo}
                className="rk-btn rk-btn-glass rk-btn-compact !px-3 !py-1.5 !text-xs"
              >
                <RefreshCw size={12} aria-hidden />
                Reemplazar
              </button>

              <button
                type="button"
                onClick={() => alCambiar(null)}
                disabled={subiendo}
                className="rk-btn rk-btn-glass rk-btn-compact !px-3 !py-1.5 !text-xs"
              >
                <X size={12} aria-hidden />
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
          className="rk-press flex w-full items-center gap-3 rounded-rk-md border border-dashed border-line/20 bg-ink/[0.02] p-4 text-left transition-colors duration-fast ease-rk hover:border-ink/40 disabled:opacity-60"
        >
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-rk-sm bg-ink/[0.06]"
          >
            <FileArchive size={17} />
          </span>

          <span className="min-w-0">
            <span className="block text-sm font-medium">
              {subiendo ? "Subiendo…" : `Subir ${etiqueta.toLowerCase()}`}
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-ink/60">
              {ayuda ?? `ZIP, RAR o 7Z · hasta ${enMegas(MAXIMO_BYTES)}`}
            </span>
          </span>
        </button>
      )}

      {subiendo && (
        <div className="mt-2.5">
          <div
            role="progressbar"
            aria-label={`Subiendo ${etiqueta.toLowerCase()}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progreso ?? undefined}
            className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.08]"
          >
            <div
              className={
                progreso === null
                  ? "h-full w-1/3 animate-pulse bg-foreground"
                  : "h-full bg-foreground transition-[width] duration-normal ease-rk"
              }
              style={progreso === null ? undefined : { width: `${progreso}%` }}
            />
          </div>

          <p className="mt-1.5 text-xs tabular-nums text-ink/60">
            {progreso === null ? "Subiendo…" : `${progreso}%`}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-rk-sm border border-danger/25 bg-danger/10 px-3 py-2 text-xs leading-5 text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
