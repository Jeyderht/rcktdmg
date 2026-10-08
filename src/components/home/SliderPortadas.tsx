"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PortadaHome } from "@/lib/portadas";

const INTERVALO_MS = 6000;

/**
 * Slider de portadas promocionales a todo el ancho.
 *
 * Un solo marco grande; las portadas se relevan dentro con un
 * fundido y un leve acercamiento. Encima: categoría arriba a la
 * izquierda, contador «2/5» arriba a la derecha, flechas de vidrio
 * a los lados y una píldora de puntos centrada abajo. Sin textos
 * de información: toda la portada es el enlace.
 *
 *  - Avanza solo cada 6 s. Se pausa al pasar el puntero, al
 *    enfocar algo dentro, con la pestaña oculta y siempre si el
 *    sistema pide menos movimiento.
 *  - Se desliza con el dedo y con las flechas del teclado.
 *  - Con una sola portada no hay flechas, puntos ni avance.
 *
 * Los datos llegan del servidor (portadasActivas); este
 * componente solo pinta y anima.
 */
export default function SliderPortadas({
  portadas,
}: {
  portadas: PortadaHome[];
}) {
  const total = portadas.length;

  const [activo, setActivo] = useState(0);
  const [pausaTemporal, setPausaTemporal] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);

  const inicioToque = useRef<{ x: number; y: number } | null>(null);
  const arrastro = useRef(false);

  const ir = useCallback(
    (indice: number) => setActivo(((indice % total) + total) % total),
    [total]
  );

  const siguiente = useCallback(() => ir(activo + 1), [activo, ir]);
  const anterior = useCallback(() => ir(activo - 1), [activo, ir]);

  /* Preferencia del sistema: menos movimiento → sin avance solo. */
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenosMovimiento(consulta.matches);
    const alCambiar = () => setMenosMovimiento(consulta.matches);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  /* Pestaña oculta → pausa. */
  useEffect(() => {
    const alCambiar = () => setPausaTemporal(document.hidden);
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  const corre = total > 1 && !pausaTemporal && !menosMovimiento;

  useEffect(() => {
    if (!corre) return;
    const t = window.setTimeout(siguiente, INTERVALO_MS);
    return () => window.clearTimeout(t);
  }, [corre, activo, siguiente]);

  if (total === 0) return null;

  function alPresionar(e: React.PointerEvent) {
    inicioToque.current = { x: e.clientX, y: e.clientY };
    arrastro.current = false;
  }

  function alSoltar(e: React.PointerEvent) {
    const inicio = inicioToque.current;
    inicioToque.current = null;
    if (!inicio || total < 2) return;

    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;

    // Solo un gesto claramente horizontal cambia de portada.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      arrastro.current = true;
      if (dx < 0) siguiente();
      else anterior();
    }
  }

  const actual = portadas[activo];

  return (
    <section
      className="rk-sp"
      aria-roledescription="carrusel"
      aria-label="Recursos destacados"
      onMouseEnter={() => setPausaTemporal(true)}
      onMouseLeave={() => setPausaTemporal(false)}
      onFocus={() => setPausaTemporal(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPausaTemporal(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") siguiente();
        if (e.key === "ArrowLeft") anterior();
      }}
    >
      <div
        className="rk-sp-marco"
        onPointerDown={alPresionar}
        onPointerUp={alSoltar}
        onPointerCancel={() => (inicioToque.current = null)}
      >
        {/* Todas apiladas: la activa visible, el resto en fundido. */}
        {portadas.map((p, indice) => (
          <div
            key={p.id}
            className={`rk-sp-slide ${indice === activo ? "is-active" : ""}`}
            aria-roledescription="diapositiva"
            aria-label={`${indice + 1} de ${total}: ${p.title}`}
            aria-hidden={indice !== activo}
          >
            <Image
              src={p.imageUrl}
              alt=""
              fill
              priority={indice === 0}
              sizes="(min-width: 1280px) 1240px, 100vw"
              className="rk-sp-img"
              draggable={false}
            />
          </div>
        ))}

        {/* Categoría y contador */}
        {actual.categoria && (
          <span className="rk-sp-chip rk-sp-cristal">{actual.categoria}</span>
        )}
        {total > 1 && (
          <span className="rk-sp-contador rk-sp-cristal" aria-hidden>
            {activo + 1}/{total}
          </span>
        )}

        {/* Toda la portada es el enlace; sin textos encima */}
        <Link
          key={actual.id}
          href={actual.href}
          className="rk-sp-enlace"
          onClick={(e) => {
            if (arrastro.current) e.preventDefault();
          }}
          draggable={false}
        >
          <span className="sr-only">
            {actual.title} · {actual.ctaLabel}
          </span>
        </Link>

        {total > 1 && (
          <>
            <button
              type="button"
              className="rk-sp-flecha rk-sp-flecha-prev rk-sp-cristal"
              aria-label="Portada anterior"
              onClick={anterior}
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              className="rk-sp-flecha rk-sp-flecha-next rk-sp-cristal"
              aria-label="Portada siguiente"
              onClick={siguiente}
            >
              <ChevronRight aria-hidden />
            </button>

            {/* Píldora de puntos */}
            <div className="rk-sp-puntos">
              <div role="tablist" aria-label="Elegir portada" className="rk-sp-puntos-fila">
                {portadas.map((p, indice) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={indice === activo}
                    aria-label={`Portada ${indice + 1}: ${p.title}`}
                    className="rk-sp-punto"
                    data-lejos={Math.min(Math.abs(indice - activo), 3)}
                    onClick={() => ir(indice)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
