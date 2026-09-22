"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkFavorite() {
      try {
        const response = await fetch("/api/favoritos", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setIsFavorite(false);
          return;
        }

        const data = await response.json();

        const exists = (data.favorites || []).some(
          (favorite: { productId: string }) =>
            favorite.productId === productId
        );

        if (!cancelled) setIsFavorite(exists);
      } catch {
        if (!cancelled) setIsFavorite(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkFavorite();

    return () => {
      cancelled = true;
    };
  }, [productId]);

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

    try {
      setSaving(true);

      const response = await fetch("/api/favoritos", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      if (response.status === 401) {
        setMessage("Inicia sesión para guardar");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el favorito."
        );
      }

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar"
      );
    } finally {
      setSaving(false);
    }
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
        disabled={loading || saving}
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
          className={`transition-all duration-300 ease-rk ${
            isFavorite
              ? "scale-110 fill-danger text-danger"
              : "text-ink/60"
          }`}
        />
      </button>

      {message && (
        <span className="animate-scale-in absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-onprimary shadow-rk">
          {message}
        </span>
      )}
    </span>
  );
}
