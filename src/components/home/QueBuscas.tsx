"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileType,
  Layers,
  Shapes,
  Users,
} from "lucide-react";

/** Una opción ya resuelta en el servidor (SelectorBusqueda). */
export type OpcionQueBuscasVista = {
  clave: "eventos" | "generales";
  titulo: string;
  texto: string;
  href: string;
  /** Portadas 9:16 (eventos) o 4:5 (diseños generales). */
  vertical: boolean;
  portadas: { id: string; nombre: string; imagen: string }[];
  /** Solo las cifras que no son 0. */
  cifras: { clave: "recursos" | "creadores" | "formatos"; etiqueta: string; valor: string }[];
  boton: string;
};

const ICONO_OPCION = { eventos: CalendarDays, generales: Shapes } as const;
const ICONO_CIFRA = { recursos: Layers, creadores: Users, formatos: FileType } as const;

const SALIDA_MS = 200;
const ENTRADA_MS = 300;

/**
 * «¿Qué estás buscando?»: tira con progreso, marco con las
 * portadas reales y cifras de la opción activa.
 *
 * Cada 6 s pasa sola a la otra opción (la línea lavanda de
 * arriba marca el tiempo: el relevo llega con su animationend).
 * Se pausa con el ratón encima, con foco dentro, mientras se
 * toca, fuera de pantalla y con la pestaña oculta. El cambio
 * es salida (200 ms, opacidad y desenfoque), hueco y entrada
 * (300 ms); los clics de en medio se ignoran. Con reducir
 * movimiento no avanza sola ni desenfoca.
 */
export default function QueBuscas({ opciones }: { opciones: OpcionQueBuscasVista[] }) {
  const [indice, setIndice] = useState(0);
  const [fuera, setFuera] = useState(false);
  const [pausas, setPausas] = useState({ puntero: false, foco: false, toque: false, pantalla: false, pestana: false });

  const ocupado = useRef(false);
  const seccion = useRef<HTMLElement>(null);

  const total = opciones.length;

  const ir = useCallback(
    (paso: number) => {
      if (ocupado.current || total < 2) return;

      ocupado.current = true;

      const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setFuera(true);

      window.setTimeout(
        () => {
          setIndice((i) => (i + paso + total) % total);
          setFuera(false);
          window.setTimeout(() => {
            ocupado.current = false;
          }, reducido ? 0 : ENTRADA_MS);
        },
        reducido ? 0 : SALIDA_MS
      );
    },
    [total]
  );

  // Fuera de pantalla o con la pestaña oculta, en pausa.
  useEffect(() => {
    const el = seccion.current;
    if (!el) return;

    const observador = new IntersectionObserver(([entrada]) =>
      setPausas((p) => ({ ...p, pantalla: !entrada.isIntersecting }))
    );
    observador.observe(el);

    const alCambiarPestana = () => setPausas((p) => ({ ...p, pestana: document.hidden }));
    document.addEventListener("visibilitychange", alCambiarPestana);

    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", alCambiarPestana);
    };
  }, []);

  if (total === 0) return null;

  const opcion = opciones[indice];
  const Icono = ICONO_OPCION[opcion.clave];
  const enPausa = Object.values(pausas).some(Boolean);

  return (
    <section ref={seccion} className="rk-qb" data-fuera={fuera || undefined}>
      <h2 className="rk-qb-titulo">¿Qué estás buscando?</h2>

      <div
        className="rk-qb-tira"
        role="group"
        aria-roledescription="carrusel"
        aria-label="Qué estás buscando"
        data-pausa={enPausa || undefined}
        onMouseEnter={() => setPausas((p) => ({ ...p, puntero: true }))}
        onMouseLeave={() => setPausas((p) => ({ ...p, puntero: false }))}
        onFocus={() => setPausas((p) => ({ ...p, foco: true }))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setPausas((p) => ({ ...p, foco: false }));
          }
        }}
        onTouchStart={() => setPausas((p) => ({ ...p, toque: true }))}
        onTouchEnd={() => setPausas((p) => ({ ...p, toque: false }))}
      >
        {total > 1 && (
          <span
            key={indice}
            aria-hidden
            className="rk-qb-progreso"
            onAnimationEnd={() => ir(1)}
          />
        )}

        <div className="rk-qb-tira-dentro">
          <span aria-hidden className="rk-qb-icono rk-qb-cambia">
            <Icono />
          </span>

          <div className="rk-qb-texto rk-qb-cambia">
            <b>{opcion.titulo}</b>
            <span aria-live="polite">{opcion.texto}</span>
          </div>

          {total > 1 && (
            <div className="rk-qb-flechas">
              <button type="button" aria-label="Opción anterior" onClick={() => ir(-1)}>
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" aria-label="Opción siguiente" onClick={() => ir(1)}>
                <ChevronRight aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rk-qb-cuerpo">
        {/* Sin portadas reales, el marco no se pinta: vacío no dice nada. */}
        {opcion.portadas.length > 0 && (
          <Link
            href={opcion.href}
            aria-label={`Ver ${opcion.titulo.toLowerCase()}`}
            className="rk-qb-marco rk-qb-cambia"
          >
            <div className="rk-qb-interior">
              <div aria-hidden className="rk-qb-barra">
                <i />
                <i />
                <i />
                <span>{opcion.href}</span>
              </div>

              <div
                className="rk-qb-portadas"
                data-forma={opcion.vertical ? "vertical" : "general"}
              >
                {opcion.portadas.map((p) => (
                  <span key={p.id} className="rk-qb-portada">
                    <Image
                      src={p.imagen}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 260px, 33vw"
                      className="object-cover"
                    />
                  </span>
                ))}
              </div>
            </div>
          </Link>
        )}

        {opcion.cifras.length > 0 && (
          <dl className="rk-qb-cifras rk-qb-cambia">
            {opcion.cifras.map((c) => {
              const IconoCifra = ICONO_CIFRA[c.clave];

              return (
                <div key={c.clave} className="rk-qb-cifra">
                  <span aria-hidden className="rk-qb-cifra-icono">
                    <IconoCifra />
                  </span>
                  <div>
                    <dt>{c.etiqueta}</dt>
                    <dd>{c.valor}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        )}
      </div>

      <div className="rk-qb-ir rk-qb-cambia">
        <Link href={opcion.href} className="rk-btn rk-btn-ink">
          {opcion.boton}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
