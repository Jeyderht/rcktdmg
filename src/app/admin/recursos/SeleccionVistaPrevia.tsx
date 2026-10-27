"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { Lock, LockOpen } from "lucide-react";

import { MAX_RECURSOS_POR_CAMBIO } from "@/lib/vista-previa-permisos";

/**
 * Acción masiva de «vista previa libre» en la lista de recursos de la
 * administración: casillas en cada recurso y una barra con la acción.
 *
 * Antes de cambiar nada pide confirmación con el número exacto («Vas
 * a cambiar N recursos») y al terminar enseña el resumen que devuelve
 * el servidor. Como mucho MAX_RECURSOS_POR_CAMBIO por operación. Quién
 * puede hacerlo lo comprueba el servidor (solo ADMIN); esto es solo la
 * interfaz.
 */

type Seleccion = {
  marcados: Set<string>;
  alternar: (id: string) => void;
};

const Contexto = createContext<Seleccion | null>(null);

export function ProveedorSeleccion({
  ids,
  children,
}: {
  /** Ids de los recursos visibles con el filtro actual. */
  ids: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [pendiente, setPendiente] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resumen, setResumen] = useState("");
  const [error, setError] = useState("");

  const alternar = (id: string) => {
    setResumen("");
    setMarcados((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  };

  const todosMarcados = ids.length > 0 && ids.every((id) => marcados.has(id));
  const cuantos = marcados.size;
  const demasiados = cuantos > MAX_RECURSOS_POR_CAMBIO;

  async function confirmar() {
    if (pendiente === null) return;

    setEnviando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/admin/recursos/vista-previa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...marcados], previewLibre: pendiente }),
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setError(datos.error || "No se pudo aplicar el cambio.");
        return;
      }

      const destino = datos.previewLibre ? "«Vista previa libre»" : "«Solo registrados»";
      const faltan = Array.isArray(datos.noEncontrados) ? datos.noEncontrados.length : 0;

      setResumen(
        `${datos.actualizados} ${datos.actualizados === 1 ? "recurso pasó" : "recursos pasaron"} a ${destino}.` +
          (faltan > 0 ? ` ${faltan} ya no existía${faltan === 1 ? "" : "n"}.` : "")
      );
      setMarcados(new Set());
      setPendiente(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Contexto.Provider value={{ marcados, alternar }}>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={() => {
              setResumen("");
              setMarcados(todosMarcados ? new Set() : new Set(ids));
            }}
            className="h-4 w-4 shrink-0 accent-[rgb(var(--rk-foreground))]"
          />
          Seleccionar todos los visibles
        </label>

        {cuantos > 0 && (
          <span className="text-sm font-medium tabular-nums text-ink/60">
            {cuantos} {cuantos === 1 ? "seleccionado" : "seleccionados"}
          </span>
        )}
      </div>

      {resumen && (
        <p role="status" className="rk-card mt-3 p-3 text-sm">
          {resumen}
        </p>
      )}

      {children}

      {/* BARRA DE ACCIÓN: solo con algo seleccionado */}
      {cuantos > 0 && (
        <div className="rk-card sticky bottom-3 z-20 mt-4 p-3 sm:p-4" role="region" aria-label="Acción masiva">
          {pendiente === null ? (
            <>
              <p className="text-sm text-ink/70">
                Vista previa de {cuantos} {cuantos === 1 ? "recurso" : "recursos"}:
              </p>

              {demasiados && (
                <p className="rk-upload-error mt-2">
                  Como máximo {MAX_RECURSOS_POR_CAMBIO} recursos por operación.
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={demasiados}
                  onClick={() => setPendiente(false)}
                  className="rk-btn rk-btn-line rk-btn-compact"
                >
                  <Lock size={14} aria-hidden />
                  Solo registrados
                </button>

                <button
                  type="button"
                  disabled={demasiados}
                  onClick={() => setPendiente(true)}
                  className="rk-btn rk-btn-line rk-btn-compact"
                >
                  <LockOpen size={14} aria-hidden />
                  Vista previa libre
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                Vas a cambiar {cuantos} {cuantos === 1 ? "recurso" : "recursos"} a{" "}
                {pendiente ? "«Vista previa libre»" : "«Solo registrados»"}.
              </p>

              <p className="mt-1 text-sm text-ink/60">
                {pendiente
                  ? "Cualquiera verá sus imágenes."
                  : "Los visitantes sin sesión dejarán de ver sus imágenes al momento."}
              </p>

              {error && <p role="alert" className="rk-upload-error mt-2">{error}</p>}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => {
                    setPendiente(null);
                    setError("");
                  }}
                  className="rk-btn rk-btn-line rk-btn-compact"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={enviando}
                  onClick={confirmar}
                  className="rk-btn rk-btn-primary rk-btn-compact"
                >
                  {enviando ? "Aplicando…" : "Confirmar"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Contexto.Provider>
  );
}

/** Casilla de un recurso de la lista. */
export function CasillaRecurso({ id, nombre }: { id: string; nombre: string }) {
  const seleccion = useContext(Contexto);

  if (!seleccion) return null;

  return (
    <label className="-m-2 flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer items-center justify-center self-start">
      <input
        type="checkbox"
        checked={seleccion.marcados.has(id)}
        onChange={() => seleccion.alternar(id)}
        className="h-4 w-4 shrink-0 accent-[rgb(var(--rk-foreground))]"
      />
      <span className="sr-only">Seleccionar {nombre}</span>
    </label>
  );
}
