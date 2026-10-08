import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import Isotipo from "@/components/Isotipo";

type VacioCajaProps = {
  /** Antetítulo de la tarjeta, arriba a la izquierda (p. ej. "Carrito"). */
  kicker: string;
  /** Marca de la derecha (p. ej. "#0"). */
  marca?: string;
  /** Título de la tarjeta interior (p. ej. "Tu pedido"). */
  estadoTitulo: string;
  /** Dato de la derecha de la tarjeta interior (p. ej. "0 recursos"). */
  estadoDato: string;
  /** Texto bajo la barra (p. ej. "Esperando recursos"). */
  estadoTexto: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: { href: string; label: string };
};

/**
 * Estado vacío con ilustración: tarjeta con una ficha de estado
 * (isotipo × barra × icono) y una caja abierta con el isotipo
 * grabado. Pensado para el carrito y otras vistas de "aún no hay
 * nada que entregar". Estilos en globals.css, sección rk-vacio.
 */
export default function VacioCaja({
  kicker,
  marca = "#0",
  estadoTitulo,
  estadoDato,
  estadoTexto,
  icon: Icon,
  title,
  description,
  action,
}: VacioCajaProps) {
  return (
    <section className="rk-fade-up rk-vacio" aria-labelledby="rk-vacio-titulo">
      <div className="rk-vacio-top">
        <span>{kicker}</span>
        <span className="rk-vacio-marca">{marca}</span>
      </div>

      <div className="rk-vacio-ficha" aria-hidden>
        <div className="rk-vacio-ficha-top">
          <span>{estadoTitulo}</span>
          <span className="rk-vacio-marca">{estadoDato}</span>
        </div>
        <div className="rk-vacio-fila">
          <span className="rk-vacio-pastilla">
            <Isotipo className="h-5 w-5" />
          </span>
          <span className="rk-vacio-x">×</span>
          <span className="rk-vacio-pista">
            <span className="rk-vacio-perilla" />
          </span>
          <span className="rk-vacio-x">×</span>
          <span className="rk-vacio-app">
            <Icon size={20} strokeWidth={1.6} />
          </span>
        </div>
        <p className="rk-vacio-espera">
          {estadoTexto}
          <span className="rk-vacio-puntos">
            <i>.</i>
            <i>.</i>
            <i>.</i>
          </span>
        </p>
      </div>

      <div className="rk-vacio-ilustra" aria-hidden>
      <svg
        className="rk-vacio-caja"
        viewBox="0 0 440 250"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id="rk-vacio-frente" x1="0" y1="0" x2="0" y2="1">
            <stop className="s1" offset="0" />
            <stop className="s2" offset="1" />
          </linearGradient>
          <linearGradient id="rk-vacio-brillo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="rk-vacio-tapa">
            <polygon points="92,92 348,92 384,160 56,160" />
          </clipPath>
        </defs>
        <polygon className="c-in" points="122,62 318,62 318,92 122,92" />
        <polygon className="c-in2" points="122,62 160,92 122,92" />
        <polygon className="c-in2" points="318,62 280,92 318,92" />
        <polygon className="c-sol c-sol-izq" points="0,0 52,0 122,62 92,92" />
        <polygon className="c-sol c-sol-der" points="440,0 388,0 318,62 348,92" />
        <polygon className="c-tapa" points="92,92 348,92 384,160 56,160" />
        <g clipPath="url(#rk-vacio-tapa)">
          <g transform="skewX(-24)">
            <rect className="c-brillo" x="-120" y="80" width="140" height="90" fill="url(#rk-vacio-brillo)" />
          </g>
        </g>
        <rect className="c-canto" x="56" y="158" width="328" height="4" rx="2" />
        <rect className="c-frente" x="92" y="162" width="256" height="88" fill="url(#rk-vacio-frente)" />
      </svg>
      <span className="rk-vacio-grabado">
        <Isotipo className="h-full w-full" />
      </span>
      </div>

      <h2 id="rk-vacio-titulo" className="rk-vacio-titulo">
        {title}
      </h2>
      <hr className="rk-vacio-linea" />
      <p className="rk-vacio-texto">{description}</p>

      <Link href={action.href} className="rk-btn rk-btn-primary">
        {action.label}
      </Link>
    </section>
  );
}
