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
        className="rk-swatch rk-swatch-multi"
      />
    );
  }

  const muestra = COLORES.find((c) => c.valor === color)?.muestra;

  if (!muestra) return null;

  return (
    <span
      aria-hidden
      className="rk-swatch"
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
      <div className="rk-sheet-section">
        <p className="rk-filter-title" style={{ marginLeft: 0 }}>
          {titulo}
        </p>

        <div className="rk-sheet-chips">
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
                  <span className="rk-filter-count">
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
      <div className="rk-filter-bar lg:hidden">
        <button
          type="button"
          onClick={() => abrir("filtros")}
          className="rk-btn rk-btn-line"
        >
          <SlidersHorizontal size={15} />
          Filtros
          {activos > 0 && (
            <span className="rk-filter-badge">
              {activos}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => abrir("orden")}
          className="rk-btn rk-btn-line"
        >
          <ArrowUpDown size={15} />
          <span>{ordenActual.etiqueta}</span>
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

          <div className="rk-sheet-panel animate-fade-up">
            <span aria-hidden className="rk-menu-grabber" />

            <div className="rk-sheet-head">
              <h2 className="rk-sheet-title">
                {modo === "orden" ? "Ordenar" : "Filtros"}
              </h2>

              <button
                type="button"
                onClick={() => setModo(null)}
                aria-label="Cerrar"
                className="rk-notif-check"
                style={{ margin: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="rk-sheet-body">
              {modo === "orden" ? (
                <div className="rk-filter-options">
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
                        className="rk-filter-option"
                      >
                        <span className="rk-filter-label">{opcion.etiqueta}</span>

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

            <div className="rk-sheet-foot">
              <button
                type="button"
                onClick={limpiar}
                className="rk-btn rk-btn-line"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={aplicar}
                className="rk-btn rk-btn-primary"
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
