"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  History,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";

import { subirArchivoDeProducto } from "@/lib/storage/client-upload";
import {
  LARGO_CHANGELOG,
  mostrarVersion,
  normalizarVersion,
  type VersionVista,
} from "@/lib/versiones-comun";

/**
 * Historial de versiones de un recurso.
 *
 * El archivo de cada versión se sube al almacén privado con el
 * mismo camino que usa el formulario del recurso. La URL que
 * devuelve la subida no se enseña en ningún sitio: viaja al
 * servidor al publicar y ahí se queda.
 */
export default function VersionesManager({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [versiones, setVersiones] = useState<VersionVista[]>([]);
  const [sinVersionar, setSinVersionar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [abierto, setAbierto] = useState(false);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const respuesta = await fetch(
        `/api/creadores/productos/${productId}/versiones`,
        { cache: "no-store" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar.");
      }

      setVersiones(datos.versiones ?? []);
      setSinVersionar(datos.tieneArchivoSinVersionar === true);
      setError("");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron cargar las versiones."
      );
    } finally {
      setCargando(false);
    }
  }, [productId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;

    const t = setTimeout(() => setAviso(""), 4000);

    return () => clearTimeout(t);
  }, [aviso]);

  async function subir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];

    if (!archivo) return;

    setSubiendo(true);
    setError("");

    try {
      const subido = await subirArchivoDeProducto(archivo);

      setFileUrl(subido.fileUrl);
      setFileName(subido.fileName);
    } catch (fallo) {
      setFileUrl("");
      setFileName("");

      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();

    if (guardando) return;

    const numero = normalizarVersion(version);

    if (!numero) {
      setError(
        "El número de versión no es válido. Usa por ejemplo 1.0, 2.1 o 2.1.3."
      );
      return;
    }

    if (!fileUrl) {
      setError("Sube el archivo de esta versión.");
      return;
    }

    // Comprobación amable antes de enviar; el índice único de
    // la base es el que manda de verdad.
    if (versiones.some((v) => v.version === numero)) {
      setError(`Este recurso ya tiene una versión ${mostrarVersion(numero)}.`);
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch(
        `/api/creadores/productos/${productId}/versiones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: numero,
            fileUrl,
            changelog,
            hacerActual: true,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo publicar.");
      }

      setVersiones(datos.versiones ?? []);
      setSinVersionar(false);
      setAviso(
        `${mostrarVersion(numero)} publicada. Los compradores ya pueden descargarla.`
      );

      setVersion("");
      setChangelog("");
      setFileUrl("");
      setFileName("");
      setAbierto(false);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo publicar."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function hacerActual(v: VersionVista) {
    const confirmado = window.confirm(
      `¿Volver a ${mostrarVersion(v.version)} como versión vigente?\n\nSerá la que descarguen los compradores a partir de ahora. Las demás versiones se conservan.`
    );

    if (!confirmado) return;

    try {
      const respuesta = await fetch(
        `/api/creadores/productos/${productId}/versiones`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: v.id }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo cambiar.");
      }

      setVersiones(datos.versiones ?? []);
      setAviso(`${mostrarVersion(v.version)} es ahora la versión vigente.`);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo cambiar."
      );
    }
  }

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { dateStyle: "medium" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {cargando
            ? "Cargando…"
            : versiones.length === 0
              ? "Este recurso todavía no tiene versiones."
              : `${versiones.length} ${
                  versiones.length === 1 ? "versión" : "versiones"
                }`}
        </p>

        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rk-btn rk-btn-ink !px-4 !py-2.5 !text-[13px]"
          >
            <Plus size={15} aria-hidden />
            Nueva versión
          </button>
        )}
      </div>

      {/* Recurso anterior al versionado: se explica. */}
      {sinVersionar && !cargando && (
        <p className="mt-4 rounded-rk-sm border border-line/15 bg-ink/[0.03] px-4 py-3.5 text-sm leading-6 text-ink/65">
          Este recurso se publicó antes del versionado, así que su
          archivo actual no tiene número. Sigue descargándose con
          normalidad. Cuando publiques tu primera versión, pasará a
          ser la vigente.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-rk-sm border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {aviso && (
        <p
          role="status"
          className="mt-4 rounded-rk-sm border border-line/15 bg-ink/[0.04] px-4 py-3 text-sm"
        >
          {aviso}
        </p>
      )}

      {/* ══════ FORMULARIO ══════ */}
      {abierto && (
        <form onSubmit={publicar} className="rk-tile mt-5 p-5 sm:p-6">
          <p className="rk-kicker">Publicar una versión de {productName}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="version"
                className="mb-2 block text-sm font-medium"
              >
                Número de versión
              </label>

              <input
                id="version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                maxLength={20}
                disabled={guardando}
                className="rk-input w-full"
              />

              <p className="mt-2 text-xs text-ink/55">
                Por ejemplo 1.0, 2.1 o 2.1.3. No puede repetirse.
              </p>
            </div>

            <div>
              <label
                htmlFor="archivo-version"
                className="mb-2 block text-sm font-medium"
              >
                Archivo de esta versión
              </label>

              <input
                id="archivo-version"
                type="file"
                onChange={subir}
                disabled={subiendo || guardando}
                className="rk-input w-full !py-2.5 file:mr-3 file:rounded-rk-sm file:border-0 file:bg-ink/[0.07] file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />

              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/55">
                {subiendo ? (
                  <>
                    <Upload size={12} aria-hidden />
                    Subiendo…
                  </>
                ) : fileName ? (
                  <>
                    <CheckCircle2 size={12} aria-hidden />
                    <span className="truncate">{fileName}</span>
                  </>
                ) : (
                  "El archivo anterior se conserva."
                )}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="changelog"
              className="mb-2 block text-sm font-medium"
            >
              Qué cambia
              <span className="ml-1.5 font-normal text-ink/45">
                (opcional)
              </span>
            </label>

            <textarea
              id="changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              maxLength={LARGO_CHANGELOG}
              rows={4}
              disabled={guardando}
              placeholder="Se añadieron 5 plantillas nuevas y se corrigieron las medidas de Stories."
              className="rk-textarea w-full"
            />

            <p className="mt-2 text-xs text-ink/55">
              Lo verán los compradores en la ficha del recurso.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setError("");
              }}
              className="rk-btn rk-btn-line !px-4 !py-2.5 !text-[13px]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando || subiendo || !fileUrl}
              className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-50"
            >
              {guardando ? "Publicando…" : "Publicar versión"}
            </button>
          </div>
        </form>
      )}

      {/* ══════ HISTORIAL ══════ */}
      {cargando ? (
        <div aria-busy="true" className="mt-5 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-rk-sm bg-ink/[0.05]"
            />
          ))}
        </div>
      ) : versiones.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {versiones.map((v) => (
            <li
              key={v.id}
              className={`rounded-rk-sm border px-4 py-3.5 ${
                v.isCurrent
                  ? "border-ink/35 bg-ink/[0.03]"
                  : "border-line/12"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {mostrarVersion(v.version)}
                    </span>

                    {v.isCurrent && (
                      <span className="rk-badge rk-badge-neutral">
                        Vigente
                      </span>
                    )}

                    {v.fileFormat && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                        {v.fileFormat}
                      </span>
                    )}
                  </p>

                  <p className="mt-0.5 text-xs text-ink/50">
                    {fecha(v.createdAt)}
                  </p>
                </div>

                {!v.isCurrent && (
                  <button
                    type="button"
                    onClick={() => hacerActual(v)}
                    className="rk-btn rk-btn-line !px-3.5 !py-2 !text-[12px]"
                  >
                    <RotateCcw size={13} aria-hidden />
                    Hacer vigente
                  </button>
                )}
              </div>

              {v.changelog && (
                <p className="mt-2.5 whitespace-pre-line break-words text-sm leading-6 text-ink/65">
                  {v.changelog}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !sinVersionar && (
          <div className="mt-5 rounded-rk-sm border border-line/12 px-5 py-10 text-center">
            <div
              aria-hidden
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-md bg-ink/[0.05]"
            >
              <History size={20} className="text-ink/55" />
            </div>

            <p className="mt-3 text-sm text-ink/60">
              Publica una versión para llevar el historial de cambios
              de este recurso.
            </p>
          </div>
        )
      )}
    </div>
  );
}
