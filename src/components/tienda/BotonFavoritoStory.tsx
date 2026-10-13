"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

import {
  alternarFavorito,
  useEsFavorito,
} from "@/components/hooks/favoritos-store";

/**
 * Corazón de los visores de stories (inicio y ficha del recurso).
 * Era el mismo componente copiado en los dos visores.
 */
export function BotonFavoritoStory({ productId }: { productId: string }) {
  /*
    El mismo almacén que los corazones de las tarjetas: el
    estado se comparte y el cambio se pinta ANTES de preguntar
    al servidor, no después de que conteste.
  */
  const { esFavorito } = useEsFavorito(productId);

  const [enCurso, setEnCurso] = useState(false);

  async function alternar() {
    if (enCurso) return;

    setEnCurso(true);

    const resultado = await alternarFavorito(productId, esFavorito);

    if (!resultado.ok && resultado.mensaje.includes("Inicia sesión")) {
      window.location.href = "/login";
    }

    setEnCurso(false);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={esFavorito}
      aria-label={esFavorito ? "Quitar de guardados" : "Guardar"}
      className="rk-story-btn rk-press h-12 w-12 shrink-0"
    >
      <Heart
        size={18}
        aria-hidden
        className={esFavorito ? "fill-current" : ""}
      />
    </button>
  );
}
