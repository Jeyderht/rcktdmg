"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/**
 * Botón redondo para compartir el perfil.
 *
 * Usa el menú nativo del teléfono si existe; si no, copia el
 * enlace y lo confirma con un ✓ durante un momento.
 */
export default function CompartirPerfil({
  url,
  titulo,
  className = "rk-hero-round",
}: {
  url: string;
  titulo: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const enlace = new URL(url, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url: enlace });
        return;
      }

      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // El usuario cerró el menú: no hay nada que hacer.
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      aria-label={copiado ? "Enlace copiado" : "Compartir perfil"}
      title={copiado ? "Enlace copiado" : "Compartir perfil"}
      className={className}
    >
      {copiado ? <Check aria-hidden /> : <Share2 aria-hidden />}
    </button>
  );
}
