import Link from "next/link";
import { Check, Download } from "lucide-react";

/**
 * «Ya adquirido».
 *
 * Ocupa el sitio del botón de compra cuando quien mira ya
 * pagó por lo que está viendo. No es un aviso ni un cartel
 * encima del botón: es su sustituto, porque volver a comprar
 * un archivo que ya se tiene no lleva a ninguna parte.
 *
 * La pieza NO desaparece del catálogo por esto. Sigue
 * publicada, sigue teniendo precio y cualquier otra persona
 * la ve a la venta: lo único que cambia es lo que se le
 * enseña a su dueño.
 */
export default function YaAdquirido({
  que = "recurso",
  href = "/mi-cuenta/descargas",
}: {
  /** Cómo llamarlo en el mensaje: "recurso", "colección", "pack". */
  que?: string;
  /** A dónde lleva el botón. Por defecto, a las descargas. */
  href?: string;
}) {
  const femenino = que.endsWith("a") || que.endsWith("ón");

  return (
    <div className="space-y-2">
      <div className="rk-row-card flex items-center gap-2.5">
        <span className="rk-check-dot">
          <Check size={15} aria-hidden />
        </span>

        <span className="text-sm font-medium">
          Ya {femenino ? "adquirida" : "adquirido"}
        </span>
      </div>

      <Link href={href} className="rk-btn rk-btn-primary w-full">
        <Download size={15} aria-hidden />
        Ir a mis descargas
      </Link>
    </div>
  );
}

