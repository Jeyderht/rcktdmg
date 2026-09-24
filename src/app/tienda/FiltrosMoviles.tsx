"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpDown, Check, SlidersHorizontal, X } from "lucide-react";

import {
  COLORES,
  RANGOS_PRECIO,
  ordenPorDefecto,
  ordenesDisponibles,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";

type Opcion = { valor: string; etiqueta: string; conteo?: number };

/** Punto de color de la opción, si esa muestra existe. */
function Muestra({ color }: { color: string }) {
  if (color === "multicolor") {
    return (
      <span
        aria-hidden
        className="h-3 w-3 rounded-full border border-line/25"
        style={{
          backgroundImage:
            "conic-gradient(#d03a3a, #e6c02f, #3a9d5d, #2f6fe0, #7a4fd0, #d03a3a)",
        }}
      />
    );
  }

  const muestra = COLORES.find((c) => c.valor === color)?.muestra;

  if (!muestra) return null;

  return (
    <span
      aria-hidden
      className="h-3 w-3 rounded-full border border-line/25"
      style={{ backgroundColor: muestra }}
    />
  );
}

/**
 * Filtros en móvil: una hoja inferior con dos entradas,
 * [Filtros] y [Ordenar].
 *
 * La selección se hace en local y solo viaja a la URL al pulsar
 * APLICAR: en una pantalla pequeña, recargar a cada toque haría
 * perder el sitio. LIMPIAR quita los filtros pero respeta la
 * búsqueda escrita, que es otra cosa.
 */
export default function FiltrosMoviles({
  actuales,
  formatos,
  colores,
  etiquetas,
  totalPacks,
}: {
  actuales: ParametrosTienda;
  formatos: Opcion[];
  colores: Opcion[];
  etiquetas: Opcion[];
  totalPacks: number;
}) {
  const router = useRouter();

  const [modo, setModo] = useState<"filtros" | "orden" | null>(null);
  const [pendientes, setPendientes] =
    useState<ParametrosTienda>(actuales);

  // Mientras la hoja está abierta, la página de detrás no se
  // mueve y Escape la cierra.
  useEffect(() => {
    if (!modo) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setModo(null);
    }

    window.addEventListener("keydown", alPulsar);

    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alPulsar);
    };
  }, [modo]);

  function abrir(siguiente: "filtros" | "orden") {
    // Se parte siempre de lo que hay en la URL.
    setPendientes(actuales);
    setModo(siguiente);
  }

  function alternar(clave: keyof ParametrosTienda, valor: string) {
    setPendientes((previos) => ({
      ...previos,
      [clave]: previos[clave] === valor ? undefined : valor,
    }));
  }

  function aplicar() {
    setModo(null);
    router.push(urlTienda(actuales, pendientes));
  }

  function limpiar() {
    setPendientes({ q: actuales.q });
  }

  const activos = [
    actuales.precio,
    actuales.formato,
    actuales.color,
    actuales.tag,
    actuales.pack,
  ].filter(Boolean).length;

  const hayBusqueda = Boolean(actuales.q);

  const disponibles = ordenesDisponibles(hayBusqueda);

  const ordenActual =
    disponibles.find((o) => o.valor === actuales.sort) ??
    disponibles.find((o) => o.valor === ordenPorDefecto(hayBusqueda)) ??
    disponibles[0];

  function Grupo({
    titulo,
    clave,
    opciones,
    conMuestra = false,
  }: {
    titulo: string;
    clave: keyof ParametrosTienda;
    opciones: Opcion[];
    conMuestra?: boolean;
  }) {
    if (opciones.length === 0) return null;

    return (
      <div className="mt-5 first:mt-0">
        <p className="rk-kicker">{titulo}</p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {opciones.map((opcion) => {
            const seleccionada = pendientes[clave] === opcion.valor;

            return (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => alternar(clave, opcion.valor)}
                aria-pressed={seleccionada}
                className={`rk-chip ${
                  seleccionada ? "rk-chip-active" : ""
                }`}
              >
                {conMuestra && <Muestra color={opcion.valor} />}

                {opcion.etiqueta}

                {typeof opcion.conteo === "number" && (
                  <span className="text-[10px] tabular-nums opacity-60">
                    {opcion.conteo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ACCESOS */}
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => abrir("filtros")}
          className="rk-btn rk-btn-line flex-1 !px-4 !py-3 !text-sm"
        >
          <SlidersHorizontal size={15} />
          Filtros
          {activos > 0 && (
            <span className="ml-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-background">
              {activos}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => abrir("orden")}
          className="rk-btn rk-btn-line flex-1 !px-4 !py-3 !text-sm"
        >
          <ArrowUpDown size={15} />
          <span className="truncate">{ordenActual.etiqueta}</span>
        </button>
      </div>

      {/* HOJA INFERIOR */}
      {modo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modo === "orden" ? "Ordenar" : "Filtros"}
          className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setModo(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <div className="rk-glass-strong rk-float animate-fade-up relative flex max-h-[85vh] w-full flex-col rounded-t-rk-xl">
            <div
              aria-hidden
              className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-ink/15"
            />

            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-3">
              <h2 className="text-base font-semibold tracking-tight">
                {modo === "orden" ? "Ordenar" : "Filtros"}
              </h2>

              <button
                type="button"
                onClick={() => setModo(null)}
                aria-label="Cerrar"
                className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
              {modo === "orden" ? (
                <div className="space-y-0.5">
                  {disponibles.map((opcion) => {
                    const seleccionada =
                      (pendientes.sort ?? ordenPorDefecto(hayBusqueda)) ===
                      opcion.valor;

                    return (
                      <button
                        key={opcion.valor}
                        type="button"
                        onClick={() =>
                          setPendientes((previos) => ({
                            ...previos,
                            sort: opcion.valor,
                          }))
                        }
                        aria-pressed={seleccionada}
                        className={`flex w-full items-center gap-2 rounded-rk-sm px-3 py-3 text-left text-sm transition-colors duration-fast ease-rk ${
                          seleccionada
                            ? "bg-ink/[0.07] font-semibold"
                            : "text-ink/70 hover:bg-ink/[0.04]"
                        }`}
                      >
                        <span className="flex-1">{opcion.etiqueta}</span>

                        {seleccionada && <Check size={15} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <Grupo
                    titulo="Precio"
                    clave="precio"
                    opciones={RANGOS_PRECIO.map((r) => ({
                      valor: r.valor,
                      etiqueta: r.etiqueta,
                    }))}
                  />

                  <Grupo
                    titulo="Etiquetas"
                    clave="tag"
                    opciones={etiquetas}
                  />

                  <Grupo
                    titulo="Formato"
                    clave="formato"
                    opciones={formatos}
                  />

                  <Grupo
                    titulo="Color"
                    clave="color"
                    opciones={colores}
                    conMuestra
                  />

                  {totalPacks > 0 && (
                    <Grupo
                      titulo="Tipo"
                      clave="pack"
                      opciones={[
                        {
                          valor: "true",
                          etiqueta: "Solo packs",
                          conteo: totalPacks,
                        },
                      ]}
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex shrink-0 gap-2.5 border-t border-line/10 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={limpiar}
                className="rk-btn rk-btn-line flex-1 !py-3 !text-sm"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={aplicar}
                className="rk-btn rk-btn-ink flex-1 !py-3 !text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
