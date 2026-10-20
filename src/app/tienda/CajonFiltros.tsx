"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Evento con el que el botón «Filtros» abre el cajón. */
const EVENTO_ABRIR = "rk-explorar-filtros";

/**
 * Contenedor del panel de filtros de Explorar.
 *
 * Desde 1024 px es la columna izquierda (fija al hacer scroll).
 * Por debajo es un cajón que entra desde la izquierda, con el
 * fondo oscurecido detrás; lo abre BotonFiltros, que vive en la
 * barra de resultados. El panel se pinta una sola vez: el mismo
 * HTML sirve para los dos casos y solo cambia el CSS.
 *
 * Marcar un filtro navega (enlaces reales) y este componente
 * sigue montado, así que el cajón no se cierra al elegir: se
 * cierra con la ✕, con el fondo, con Esc o con «Ver resultados».
 */
export default function CajonFiltros({
  total,
  children,
}: {
  total: number;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const abrir = () => setAbierto(true);

    window.addEventListener(EVENTO_ABRIR, abrir);

    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  // Esc cierra; el fondo no se desplaza; si la ventana crece hasta
  // escritorio, el cajón deja de tener sentido y se cierra.
  useEffect(() => {
    if (!abierto) return;

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const escritorio = window.matchMedia("(min-width: 1024px)");
    const alCrecer = () => {
      if (escritorio.matches) setAbierto(false);
    };

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);
    escritorio.addEventListener("change", alCrecer);

    return () => {
      document.body.style.overflow = overflowAntes;
      window.removeEventListener("keydown", alTeclear);
      escritorio.removeEventListener("change", alCrecer);
    };
  }, [abierto]);

  const cerrar = () => setAbierto(false);

  return (
    <div className="rk-ex-cajon" data-abierto={abierto || undefined}>
      <button
        type="button"
        className="rk-ex-velo"
        aria-label="Cerrar filtros"
        tabIndex={-1}
        onClick={cerrar}
      />

      <aside
        id="rk-ex-panel"
        className="rk-ex-panel"
        aria-label="Filtros"
        role={abierto ? "dialog" : undefined}
        aria-modal={abierto || undefined}
      >
        <button
          type="button"
          className="rk-ex-cerrar"
          aria-label="Cerrar filtros"
          onClick={cerrar}
        >
          <X size={18} aria-hidden />
        </button>

        {children}

        <div className="rk-ex-cajon-pie">
          <button
            type="button"
            className="rk-btn rk-btn-ink w-full"
            onClick={cerrar}
          >
            Ver {total} {total === 1 ? "resultado" : "resultados"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/** Botón «Filtros» de la barra, solo por debajo de 1024 px. */
export function BotonFiltros({ activos }: { activos: number }) {
  return (
    <button
      type="button"
      className="rk-btn rk-btn-line rk-ex-boton-filtros"
      aria-controls="rk-ex-panel"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
    >
      <SlidersHorizontal size={16} aria-hidden />
      Filtros
      {activos > 0 && (
        <span className="rk-chip-count" aria-label={`${activos} activos`}>
          {activos}
        </span>
      )}
    </button>
  );
}
