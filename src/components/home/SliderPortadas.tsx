"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import type { PortadaHome } from "@/lib/portadas";

const INTERVALO_MS = 6000;

/**
 * Slider de portadas promocionales (coverflow).
 *
 * La portada activa va al centro, grande y con su información;
 * las vecinas asoman a los lados, más pequeñas y atenuadas.
 *
 *  - Avanza solo cada 6 s. Se pausa al pasar el puntero, al
 *    enfocar algo dentro, con la pestaña oculta, con el botón de
 *    pausa y siempre si el sistema pide menos movimiento.
 *  - Se desliza con el dedo; tocar una vecina la trae al centro.
 *  - Con una sola portada no hay flechas ni avance automático.
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
  const [pausaManual, setPausaManual] = useState(false);
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

  const corre = total > 1 && !pausaManual && !pausaTemporal && !menosMovimiento;

  useEffect(() => {
    if (!corre) return;

    const t = window.setTimeout(siguiente, INTERVALO_MS);

    return () => window.clearTimeout(t);
  }, [corre, activo, siguiente]);

  if (total === 0) return null;

  /* Distancia circular más corta entre la portada y la activa. */
  function distancia(indice: number) {
    let d = indice - activo;

    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;

    return d;
  }

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

  return (
    <section
      className="rk-promo"
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
        className="rk-promo-stage"
        onPointerDown={alPresionar}
        onPointerUp={alSoltar}
        onPointerCancel={() => (inicioToque.current = null)}
      >
        {portadas.map((p, indice) => {
          const d = distancia(indice);
          const ad = Math.abs(d);
          const esActiva = d === 0;

          return (
            <div
              key={p.id}
              className={`rk-promo-slide ${esActiva ? "is-active" : ""}`}
              style={
                {
                  "--d": d,
                  zIndex: 10 - Math.min(ad, 3),
                  filter:
                    ad === 0
                      ? "none"
                      : `brightness(${1 - Math.min(ad, 2) * 0.3}) saturate(${
                          1 - Math.min(ad, 2) * 0.15
                        })`,
                  "--escala": 1 - Math.min(ad, 3) * 0.14,
                  "--giro": `${-Math.sign(d) * Math.min(ad, 2) * 10}deg`,
                } as React.CSSProperties
              }
              aria-roledescription="diapositiva"
              aria-label={`${indice + 1} de ${total}: ${p.title}`}
              aria-hidden={!esActiva}
              data-oculta={ad > 2 ? "true" : undefined}
            >
              <Image
                src={p.imageUrl}
                alt=""
                fill
                priority={indice === 0}
                sizes="(min-width: 1024px) 780px, 86vw"
                className="rk-promo-img"
                draggable={false}
              />

              {esActiva ? (
                <Link
                  href={p.href}
                  className="rk-promo-info"
                  tabIndex={0}
                  onClick={(e) => {
                    if (arrastro.current) e.preventDefault();
                  }}
                  draggable={false}
                >
                  {/* Categoría arriba a la izquierda. */}
                  {p.categoria && (
                    <span className="rk-glass-on-image rk-promo-chip">
                      {p.categoria}
                    </span>
                  )}

                  <span className="rk-promo-text">
                    <span className="rk-promo-title">{p.title}</span>

                    {p.subtitle && (
                      <span className="rk-promo-sub">{p.subtitle}</span>
                    )}

                    {p.precio && (
                      <span className="rk-promo-price">
                        <small>S/</small>
                        {p.precio}
                      </span>
                    )}
                  </span>

                  {/* Solo el círculo con el ícono; el texto queda para lectores de pantalla. */}
                  <span className="rk-btn rk-btn-line rk-btn-icon rk-promo-cta">
                    <ArrowUpRight aria-hidden />
                    <span className="sr-only">{p.ctaLabel}</span>
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="rk-promo-peek"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => {
                    if (!arrastro.current) ir(indice);
                  }}
                />
              )}
            </div>
          );
        })}

        {total > 1 && (
          <>
            <button
              type="button"
              className="rk-glass-on-image rk-promo-arrow rk-promo-arrow-prev"
              aria-label="Portada anterior"
              onClick={anterior}
            >
              <ChevronLeft aria-hidden />
            </button>

            <button
              type="button"
              className="rk-glass-on-image rk-promo-arrow rk-promo-arrow-next"
              aria-label="Portada siguiente"
              onClick={siguiente}
            >
              <ChevronRight aria-hidden />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="rk-promo-nav">
          <div className="rk-promo-dots" role="tablist" aria-label="Elegir portada">
            {portadas.map((p, indice) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={indice === activo}
                aria-label={`Portada ${indice + 1}: ${p.title}`}
                className="rk-promo-dot"
                onClick={() => ir(indice)}
              >
                {indice === activo && (
                  <span
                    key={`${activo}-${corre}`}
                    className={`rk-promo-dot-fill ${corre ? "is-running" : ""}`}
                    style={{ animationDuration: `${INTERVALO_MS}ms` }}
                  />
                )}
              </button>
            ))}
          </div>

          {!menosMovimiento && (
            <button
              type="button"
              className="rk-promo-pause"
              aria-label={pausaManual ? "Reanudar" : "Pausar"}
              onClick={() => setPausaManual((v) => !v)}
            >
              {pausaManual ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
