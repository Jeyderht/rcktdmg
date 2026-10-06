"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { alternarFavorito, useEsFavorito } from "./favoritos-store";

type FavoriteButtonProps = {
  productId: string;
  size?: "xs" | "sm" | "md";
  /**
   * true cuando el botón flota SOBRE una imagen: usa el
   * vidrio reforzado para seguir siendo legible encima de
   * cualquier fotografía. La imagen nunca se desenfoca.
   */
  onImage?: boolean;
};

export default function FavoriteButton({
  productId,
  size = "md",
  onImage = false,
}: FavoriteButtonProps) {
  /*
    El estado lo lleva el almacén compartido: la lista de
    favoritos se pide UNA vez por página y la usan todos los
    corazones. Antes cada tarjeta pedía la lista entera para
    sí: 21 peticiones idénticas en Home, medidas en el
    navegador.
  */
  const { esFavorito: isFavorite, cargando: loading } =
    useEsFavorito(productId);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // El aviso se oculta solo, sin bloquear la interfaz.
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(""), 2600);

    return () => clearTimeout(timer);
  }, [message]);

  async function toggleFavorite(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    setSaving(true);

    /*
      El corazón cambia YA, en el mismo fotograma del clic. Si
      el servidor lo rechaza, el almacén lo devuelve a su sitio
      y se dice por qué.
    */
    const resultado = await alternarFavorito(productId, isFavorite);

    if (!resultado.ok) setMessage(resultado.mensaje);

    setSaving(false);
  }

  // El cuadro visible se mantiene compacto, pero el área que
  // responde al dedo se amplía con un pseudo-elemento: en móvil
  // 28 px era un objetivo demasiado pequeño.
  const box =
    size === "xs" ? "h-8 w-8" : size === "sm" ? "h-9 w-9" : "h-10 w-10";

  const hitArea =
    "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

  const icon = size === "xs" ? 13 : size === "sm" ? 15 : 17;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggleFavorite}
        /*
          NO se deshabilita mientras guarda: el estado ya
          cambió a la vista y bloquear el botón solo impide
          rectificar. `saving` evita el envío repetido dentro
          del manejador.
        */
        disabled={loading}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
        }
        title={
          isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
        }
        className={`rk-press ${
          onImage ? "rk-glass-on-image" : "rk-glass-strong shadow-rk-sm"
        } ${hitArea} relative flex ${box} items-center justify-center rounded-full disabled:cursor-wait disabled:opacity-60`}
      >
        <Heart
          size={icon}
          strokeWidth={2}
          className={`transition-all duration-normal ease-rk ${
            isFavorite
              ? "scale-110 fill-danger text-danger"
              : "text-ink/60"
          }`}
        />
      </button>

      {message && (
        <span className="animate-scale-in absolute right-0 top-full z-20 mt-2 whitespace-nowrap rk-toast-mini">
          {message}
        </span>
      )}
    </span>
  );
}
