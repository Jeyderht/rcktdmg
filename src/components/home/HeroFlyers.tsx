"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  proporcionDeRecurso,
  type TipoPieza,
} from "@/lib/tipos-publicacion";
import { formatPrice } from "@/lib/pricing";

/**
 * Hero del Home: los flyers del catálogo, en movimiento.
 *
 * Uno manda en el centro y los demás lo acompañan a los lados,
 * más pequeños y más apagados cuanto más lejos están. Cada
 * cierto tiempo el turno pasa al siguiente y la composición
 * entera se reacomoda de una pieza.
 *
 * QUÉ DECIDE CADA COSA
 *
 * La posición de un flyer no se guarda: se calcula a partir de
 * su distancia al que está activo, y esa distancia es circular,
 * así que la rueda no tiene principio ni fin. Del signo sale el
 * lado; del valor absoluto, cuánto se encoge y cuánto se
 * apaga. Una sola fórmula para las tres cosas evita que el
 * tamaño diga una posición y la opacidad otra.
 *
 * Los flyers son enlaces de verdad, siempre, también los de los
 * lados: el que ve uno de reojo y lo quiere, lo pulsa. Los que
 * ya han salido de la composición se retiran del tabulador y del
 * árbol de accesibilidad, porque no se ven.
 *
 * El título, el precio y el botón hablan SIEMPRE del flyer
 * activo. Es lo que convierte la animación en algo que se puede
 * usar y no solo mirar.
 */

export type FlyerHero = {
  id: string;
  name: string;
  slug: string;
  coverUrl: string;
  price: number;
  categoriaNombre: string | null;
  categoriaSlug: string | null;
  pieceType: TipoPieza | null;
};

/** Cada cuánto cambia el flyer destacado. */
const RELEVO = 4600;

/**
 * Cuántos acompañantes se ven a cada lado.
 *
 * En un teléfono solo uno: con dos, el tercero queda tan
 * estrecho que se lee como un borde y no como un flyer.
 */
const ACOMPANANTES_ESTRECHO = 1;
const ACOMPANANTES_ANCHO = 2;

/** Geometría de la composición, por tamaño de pantalla. */
const ESTRECHO = { paso: 54, escala: 0.2, opacidad: 0.42 };
const ANCHO = { paso: 46, escala: 0.15, opacidad: 0.34 };

export default function HeroFlyers({ flyers }: { flyers: FlyerHero[] }) {
  const [activo, setActivo] = useState(0);
  const [estrecho, setEstrecho] = useState(false);
  const [quieto, setQuieto] = useState(false);

  const escena = useRef<HTMLDivElement | null>(null);
  const pausas = useRef<Set<string>>(new Set());
  const idTitulo = useId();

  const total = flyers.length;

  const avanzar = useCallback(() => {
    setActivo((actual) => (actual + 1) % total);
  }, [total]);

  /* Ancho de pantalla y preferencia de movimiento. */
  useEffect(() => {
    const angosto = window.matchMedia("(max-width: 639px)");
    const menosMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const leer = () => {
      setEstrecho(angosto.matches);
      setQuieto(menosMovimiento.matches);
    };

    leer();
    angosto.addEventListener("change", leer);
    menosMovimiento.addEventListener("change", leer);

    return () => {
      angosto.removeEventListener("change", leer);
      menosMovimiento.removeEventListener("change", leer);
    };
  }, []);

  /*
    El relevo automático.

    No existe si hay un solo flyer ni si se pidió menos
    movimiento: en ese caso la rueda se maneja con los puntos de
    abajo, que son botones de verdad.
  */
  useEffect(() => {
    if (quieto || total < 2) return;

    const caja = escena.current;
    if (!caja) return;

    const motivos = pausas.current;

    const marcar = (motivo: string, activoAhora: boolean) => {
      if (activoAhora) motivos.add(motivo);
      else motivos.delete(motivo);
    };

    /* La pestaña puede estar ya en segundo plano al montar. */
    marcar("oculta", document.hidden);

    const reloj = window.setInterval(() => {
      if (motivos.size === 0) avanzar();
    }, RELEVO);

    const entra = () => marcar("puntero", true);
    const sale = () => marcar("puntero", false);
    const enfoca = () => marcar("foco", true);
    const desenfoca = () => marcar("foco", false);
    const visibilidad = () => marcar("oculta", document.hidden);

    caja.addEventListener("pointerenter", entra);
    caja.addEventListener("pointerleave", sale);
    caja.addEventListener("focusin", enfoca);
    caja.addEventListener("focusout", desenfoca);
    document.addEventListener("visibilitychange", visibilidad);

    /* Fuera de pantalla no se relevan: no lo ve nadie. */
    const mirilla = new IntersectionObserver(
      (entradas) => marcar("fuera", !entradas[0]?.isIntersecting),
      { threshold: 0.15 }
    );
    mirilla.observe(caja);

    return () => {
      window.clearInterval(reloj);
      mirilla.disconnect();
      caja.removeEventListener("pointerenter", entra);
      caja.removeEventListener("pointerleave", sale);
      caja.removeEventListener("focusin", enfoca);
      caja.removeEventListener("focusout", desenfoca);
      document.removeEventListener("visibilitychange", visibilidad);
      motivos.clear();
    };
  }, [avanzar, quieto, total]);

  if (total === 0) return null;

  const geometria = estrecho ? ESTRECHO : ANCHO;
  const acompanantes = estrecho
    ? ACOMPANANTES_ESTRECHO
    : ACOMPANANTES_ANCHO;

  const destacado = flyers[activo];

  /**
   * Distancia circular al flyer activo, con signo.
   *
   * Devuelve el camino más corto, de modo que el primero y el
   * último son vecinos y la rueda no da un salto largo al pasar
   * por el final de la lista.
   */
  const desvio = (indice: number) => {
    const bruto = (indice - activo + total) % total;

    return bruto > total / 2 ? bruto - total : bruto;
  };

  return (
    <div className="rk-fade-up rk-enter-2 min-w-0">
      {/*
        La escena es cuadrada y los flyers viven dentro en
        absoluto: así el alto no cambia al pasar de un flyer 9:16
        a uno 4:5 y la página no salta con cada relevo.
      */}
      <div
        ref={escena}
        className="rk-escena relative mx-auto aspect-square w-full max-w-[34rem]"
      >
        {flyers.map((flyer, indice) => {
          const lejania = desvio(indice);
          const distancia = Math.abs(lejania);
          const fuera = distancia > acompanantes;

          /*
            Una sola fórmula para el sitio, el tamaño y la
            presencia. El flyer activo queda a escala 1 y opaco;
            cada paso que se aleja le resta lo mismo.
          */
          const escala = Math.max(0, 1 - distancia * geometria.escala);
          const opacidad = fuera
            ? 0
            : Math.max(0, 1 - distancia * geometria.opacidad);

          return (
            <Link
              key={flyer.id}
              href={`/tienda/${flyer.slug}`}
              aria-label={flyer.name}
              aria-hidden={fuera || undefined}
              tabIndex={fuera ? -1 : undefined}
              className="rk-escena-flyer absolute left-1/2 top-1/2 w-[54%]"
              style={{
                transform: `translate(-50%, -50%) translateX(${
                  lejania * geometria.paso
                }%) scale(${escala})`,
                opacity: opacidad,
                zIndex: total - distancia,
                pointerEvents: fuera ? "none" : undefined,
              }}
            >
              <div
                className="rk-frame rk-card-glow w-full overflow-hidden"
                style={{
                  aspectRatio:
                    proporcionDeRecurso(
                      flyer.categoriaSlug,
                      flyer.pieceType
                    ) ?? "1080 / 1350",
                }}
              >
                <Image
                  src={flyer.coverUrl}
                  alt={flyer.name}
                  fill
                  className="rk-card-zoom object-cover"
                  sizes="(max-width: 640px) 55vw, (max-width: 1024px) 40vw, 19vw"
                  /*
                    Solo el primero entra con prioridad: es el que
                    se ve al abrir la página. Pedir prioridad para
                    todos sería no pedirla para ninguno.
                  */
                  priority={indice === 0}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── QUIÉN ES EL FLYER ACTIVO ── */}
      <div className="mt-7 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45">
          {destacado.categoriaNombre ?? "Recurso digital"}
        </p>

        {/*
          `aria-live` para que quien no ve la composición se
          entere del relevo. "polite" y no "assertive": es un
          cambio de escaparate, no un aviso que deba interrumpir
          lo que se esté leyendo.
        */}
        <p
          id={idTitulo}
          aria-live="polite"
          className="rk-title mx-auto mt-2 max-w-[22ch] text-lg sm:text-xl"
        >
          {destacado.name}
        </p>

        <p className="mt-1.5 text-sm text-ink/60 tabular-nums">
          {formatPrice(destacado.price)}
        </p>

        <Link
          href={`/tienda/${destacado.slug}`}
          className="rk-btn rk-btn-ink rk-btn-cta mt-5"
        >
          Ver este recurso
          <ArrowRight size={16} />
        </Link>
      </div>

      {/*
        LOS PUNTOS

        Botones de verdad, no adornos. Son la forma de manejar la
        rueda con el teclado y la única con `prefers-reduced-
        motion`, donde no hay relevo automático.
      */}
      {total > 1 && (
        <div
          role="group"
          aria-label="Elegir recurso destacado"
          className="mt-6 flex items-center justify-center gap-2"
        >
          {flyers.map((flyer, indice) => (
            <button
              key={flyer.id}
              type="button"
              onClick={() => setActivo(indice)}
              aria-label={flyer.name}
              aria-current={indice === activo || undefined}
              className={`rk-escena-punto ${
                indice === activo ? "rk-escena-punto-activo" : ""
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
