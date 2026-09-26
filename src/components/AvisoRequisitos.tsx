"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";

import {
  requisitoPorClave,
  resumirRequisito,
  type MedidaExigida,
} from "@/lib/requisitos-contenido";

/**
 * Las reglas de un campo, a un toque.
 *
 * Va junto a la etiqueta del campo y abre un panel pequeño
 * con lo que se le va a exigir a ese archivo. Existe porque
 * enterarse de que una imagen no vale DESPUÉS de elegirla es
 * el peor momento para saberlo.
 *
 * Lo que enseña sale de requisitos-contenido.ts: lo mismo que
 * valida el navegador, lo mismo que valida el servidor y lo
 * mismo que dice la página pública de requisitos. No hay una
 * versión resumida distinta de la real.
 *
 * `medida` permite sobrescribir el tamaño para el caso en que
 * lo imponga el TIPO de publicación elegido —una story exige
 * 1080 × 1920 y un corporativo 1080 × 1350—, que es algo que
 * el requisito base no puede saber por sí solo.
 */
export default function AvisoRequisitos({
  clave,
  medida,
}: {
  /** Clave del requisito en requisitos-contenido.ts. */
  clave: string;
  /** Medida que impone el tipo elegido, si impone alguna. */
  medida?: MedidaExigida | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  /* Se cierra al pulsar fuera o con Escape, como cualquier panel. */
  useEffect(() => {
    if (!abierto) return;

    function fuera(evento: MouseEvent) {
      if (!caja.current?.contains(evento.target as Node)) setAbierto(false);
    }

    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);

    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const requisito = requisitoPorClave(clave);

  if (!requisito) return null;

  /*
    Si el tipo impone una medida, manda esa: es la que se va a
    comprobar de verdad al subir el archivo.
  */
  const efectivo = medida ? { ...requisito, medida } : requisito;

  const lineas = resumirRequisito(efectivo);

  return (
    <span ref={caja} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`Requisitos de ${requisito.nombre.toLowerCase()}`}
        className="rk-press inline-flex h-11 w-11 items-center justify-center rounded-full text-ink/45 transition-colors duration-fast hover:text-ink"
      >
        <Info size={15} aria-hidden />
      </button>

      {abierto && (
        <span
          role="dialog"
          aria-label={`Requisitos de ${requisito.nombre.toLowerCase()}`}
          className="rk-glass-strong rk-float animate-fade-up absolute left-0 top-full z-50 mt-1 block w-[17rem] rounded-rk-md p-4"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="block text-[13px] font-semibold uppercase tracking-wide">
              {requisito.nombre}
            </span>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="rk-press -mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/45 hover:text-ink"
            >
              <X size={13} aria-hidden />
            </button>
          </span>

          <span className="mt-2.5 block space-y-0.5">
            {lineas.map((linea) => (
              <span
                key={linea}
                className="block text-[13px] font-medium tabular-nums"
              >
                {linea}
              </span>
            ))}
          </span>

          {requisito.notas && (
            <span className="mt-3 block space-y-1.5 border-t border-line/12 pt-3">
              {requisito.notas.map((nota) => (
                <span
                  key={nota}
                  className="block text-[12px] leading-5 text-ink/60"
                >
                  {nota}
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
