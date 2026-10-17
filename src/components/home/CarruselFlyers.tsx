"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type TouchEvent } from "react";

import { formatPrice } from "@/lib/pricing";

/** Un flyer de Eventos, ya cargado en el servidor (datosCatalogoInicio). */
export type FlyerCarrusel = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imagen: string;
  creador: string;
};

const PASO_MS = 4000;
const UMBRAL_DEDO = 40;

/**
 * Carrusel de flyers de Eventos del hero (formato Story 9:16).
 *
 * Tres a la vez como mucho: el central recto y uno a cada lado en
 * perspectiva. Con 1 flyer solo se ve el central (sin autoplay ni
 * controles); con 2, el central y el otro a un lado. Nunca se
 * duplican flyers para rellenar.
 *
 * Avanza solo cada 4 s; se pausa con el ratón encima, con foco
 * dentro, mientras se toca y con la pestaña oculta, y no arranca
 * con «reducir movimiento». Deslizar (40 px), tocar un lateral
 * (lo trae al centro) y las flechas del teclado también lo mueven.
 */
export default function CarruselFlyers({ flyers }: { flyers: FlyerCarrusel[] }) {
  const n = flyers.length;
  const [cur, setCur] = useState(0);
  const [pausas, setPausas] = useState({ puntero: false, foco: false, toque: false, pestana: false });
  const [reducido, setReducido] = useState(false);
  const inicioDedo = useRef<{ x: number; y: number } | null>(null);

  const enPausa = Object.values(pausas).some(Boolean);
  const automatico = n > 1 && !reducido;

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setReducido(consulta.matches);
    leer();
    consulta.addEventListener("change", leer);

    const alCambiarPestana = () => setPausas((p) => ({ ...p, pestana: document.hidden }));
    document.addEventListener("visibilitychange", alCambiarPestana);

    return () => {
      consulta.removeEventListener("change", leer);
      document.removeEventListener("visibilitychange", alCambiarPestana);
    };
  }, []);

  // Autoplay: se reinicia con cada cambio, así la barra y el salto van juntos.
  useEffect(() => {
    if (!automatico || enPausa) return;

    const reloj = window.setInterval(() => setCur((c) => (c + 1) % n), PASO_MS);

    return () => window.clearInterval(reloj);
  }, [automatico, enPausa, n, cur]);

  if (n === 0) return null;

  const ir = (paso: number) => setCur((c) => (c + paso + n) % n);
  const h = Math.floor(n / 2);
  const posicion = (i: number) => {
    const d = ((i - cur + n + h) % n) - h;
    return Math.abs(d) > 1 ? "x" : String(d);
  };

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (n < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
  }

  function alEmpezarToque(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    inicioDedo.current = t ? { x: t.clientX, y: t.clientY } : null;
    setPausas((p) => ({ ...p, toque: true }));
  }

  function alTerminarToque(e: TouchEvent<HTMLDivElement>) {
    setPausas((p) => ({ ...p, toque: false }));
    const inicio = inicioDedo.current;
    const t = e.changedTouches[0];
    inicioDedo.current = null;
    if (!inicio || !t || n < 2) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    // Más vertical que horizontal es scroll, no un deslizamiento.
    if (Math.abs(dx) < UMBRAL_DEDO || Math.abs(dx) < Math.abs(dy)) return;
    ir(dx < 0 ? 1 : -1);
  }

  function alPulsarTarjeta(e: MouseEvent<HTMLAnchorElement>, i: number, pos: string) {
    if (pos === "0") return; // el central abre la ficha
    e.preventDefault();
    if (pos !== "x") setCur(i);
  }

  return (
    <div
      className={`rkp-cf${enPausa || !automatico ? " pausa" : ""}`}
      role="group"
      aria-roledescription="carrusel"
      aria-label="Flyers de eventos más recientes"
      onKeyDown={alTeclear}
      onMouseEnter={() => setPausas((p) => ({ ...p, puntero: true }))}
      onMouseLeave={() => setPausas((p) => ({ ...p, puntero: false }))}
      onFocus={() => setPausas((p) => ({ ...p, foco: true }))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPausas((p) => ({ ...p, foco: false }));
      }}
      onTouchStart={alEmpezarToque}
      onTouchEnd={alTerminarToque}
      onTouchCancel={() => setPausas((p) => ({ ...p, toque: false }))}
    >
      <div className="rkp-cf-pista">
        {flyers.map((f, i) => {
          const pos = posicion(i);
          const precio = formatPrice(f.price);

          return (
            <Link
              key={f.id}
              href={`/tienda/${f.slug}`}
              className="rkp-cf-card"
              data-pos={pos}
              aria-label={`${f.name}, ${precio}`}
              aria-hidden={pos === "x" || undefined}
              tabIndex={pos === "x" ? -1 : undefined}
              onClick={(e) => alPulsarTarjeta(e, i, pos)}
            >
              <Image src={f.imagen} alt="" fill sizes="(min-width: 640px) 260px, 41vw" className="object-cover" />
              <span className="rkp-cf-nuevo">Nuevo</span>
              <span className="rkp-cf-pie" aria-hidden>
                <b>{f.name}</b>
                <i>
                  {f.creador} · {precio}
                </i>
              </span>
            </Link>
          );
        })}
      </div>

      {n > 1 && (
        <div className="rkp-cf-nav">
          <button type="button" aria-label="Anterior" onClick={() => ir(-1)}>
            <ChevronLeft size={18} aria-hidden />
          </button>

          <div className="rkp-cf-puntos" aria-hidden>
            {flyers.map((f, i) => (
              <span key={i === cur ? `on-${cur}` : f.id} className={i === cur ? "on" : undefined} />
            ))}
          </div>

          <button type="button" aria-label="Siguiente" onClick={() => ir(1)}>
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
