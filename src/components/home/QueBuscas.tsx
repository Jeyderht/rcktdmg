"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Layers,
  Shapes,
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
  /** Recursos publicados en la opción (dato real). */
  total: number;
  /** «de eventos» / «en total». */
  sufijo: string;
  /** Creadores, Formato y Desde: solo las que tienen dato. */
  columnas: { etiqueta: string; valor: string }[];
};

const ICONO_OPCION = { eventos: CalendarDays, generales: Shapes } as const;

const SALIDA_MS = 600;
const HUECO_MS = 80;
const ENTRADA_MS = 650;

/**
 * «¿Qué estás buscando?»: tira con progreso, marco con las
 * portadas reales y resumen de la opción activa.
 *
 * Cada 8 s pasa sola a la otra opción (la línea lavanda de
 * arriba marca el tiempo: el relevo llega con su animationend).
 * Se pausa con el ratón encima, con foco dentro, mientras se
 * toca, fuera de pantalla y con la pestaña oculta. El cambio es
 * salida (600 ms, opacidad y desenfoque), hueco (80 ms) y
 * entrada (650 ms); los clics de en medio se ignoran. Con
 * reducir movimiento no avanza sola ni desenfoca.
 *
 * Nada decorativo: sin barras de ventana ni rutas en el marco,
 * sin botón final. El único enlace del resumen es la flecha.
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
          window.setTimeout(
            () => {
              setFuera(false);
              window.setTimeout(() => {
                ocupado.current = false;
              }, reducido ? 0 : ENTRADA_MS);
            },
            reducido ? 0 : HUECO_MS
          );
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
            <span
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
            </span>
          </Link>
        )}

        <div className="rk-qb-resumen rk-qb-cambia">
          <div className="rk-qb-cabecera">
            <Layers aria-hidden />
            <span>Recursos publicados</span>
            <Link
              href={opcion.href}
              aria-label={`Ver ${opcion.titulo.toLowerCase()}`}
              className="rk-qb-ir"
            >
              <ArrowRight aria-hidden />
            </Link>
          </div>

          <p className="rk-qb-cifra">
            {opcion.total}
            <span>{opcion.sufijo}</span>
          </p>

          {opcion.columnas.length > 0 && (
            <dl className="rk-qb-columnas">
              {opcion.columnas.map((c) => (
                <div key={c.etiqueta}>
                  <dt>{c.etiqueta}</dt>
                  <dd>{c.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
