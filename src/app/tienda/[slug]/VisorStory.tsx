"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  X,
} from "lucide-react";

import PreviewProtegido from "@/components/PreviewProtegido";
import { formatPrice } from "@/lib/pricing";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";

/** Cuánto dura cada imagen antes de pasar sola. */
const DURACION = 4500;

export type ImagenStory = {
  key: string;
  url: string;
  ancho: number | null;
  alto: number | null;
  label: string;
};

/**
 * Ficha del recurso a pantalla completa, en modo story.
 *
 * Es la misma pieza que ya se ve en la galería, sin el resto
 * de la página: sin cabecera, sin barra lateral y sin la tira
 * de miniaturas. Solo la imagen, quién la hizo y las dos
 * acciones que importan.
 *
 * Ocupa 100dvh × 100vw —dvh y no vh, para que la barra del
 * navegador móvil no recorte la parte de abajo— y respeta las
 * áreas seguras del dispositivo.
 *
 * Cada imagen conserva su proporción: se enseña entera, sin
 * estirarla ni recortarla a una forma fija.
 */
export default function VisorStory({
  abierto,
  alCerrar,
  imagenes,
  producto,
}: {
  abierto: boolean;
  alCerrar: () => void;
  imagenes: ImagenStory[];
  producto: {
    id: string;
    name: string;
    slug: string;
    price: number;
    creador: {
      nombre: string;
      username: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
    };
  };
}) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  // El portal necesita el DOM: en el servidor no hay <body>.
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const cerrarRef = useRef<HTMLButtonElement>(null);

  const total = imagenes.length;

  const anterior = useCallback(() => {
    setIndice((i) => (i - 1 + total) % total);
  }, [total]);

  const siguiente = useCallback(() => {
    setIndice((i) => (i + 1) % total);
  }, [total]);

  /* Teclado y bloqueo del desplazamiento de fondo. */
  useEffect(() => {
    if (!abierto) return;

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
      if (evento.key === "ArrowLeft") anterior();
      if (evento.key === "ArrowRight") siguiente();
    }

    window.addEventListener("keydown", alTeclear);

    const overflowPrevio = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    cerrarRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, alCerrar, anterior, siguiente]);

  /* Avance automático, salvo mientras se mantiene pulsado. */
  useEffect(() => {
    if (!abierto || pausado || total < 2) return;

    const t = window.setTimeout(siguiente, DURACION);

    return () => window.clearTimeout(t);
  }, [abierto, pausado, total, indice, siguiente]);

  /* Al cerrar se vuelve a la primera. */
  useEffect(() => {
    if (!abierto) setIndice(0);
  }, [abierto]);

  if (!abierto || total === 0 || !montado) return null;

  const imagen = imagenes[indice];

  /*
    PORTAL

    El diálogo se monta directamente en <body>.

    Montado donde vive el componente quedaba atrapado: sus
    ancestros llevan animaciones con `transform`, y un
    elemento transformado crea un contexto de apilamiento
    propio. Dentro de él, `position: fixed` sigue midiendo
    contra la ventana, pero el z-index pasa a competir solo
    con sus hermanos, así que la cabecera y la barra inferior
    quedaban ENCIMA de una pantalla completa.

    Con el portal el diálogo es hijo de <body> y su z-index
    compite en el contexto raíz, que es donde debe.
  */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${producto.name}, imagen ${indice + 1} de ${total}`}
      onPointerDown={() => setPausado(true)}
      onPointerUp={() => setPausado(false)}
      onPointerCancel={() => setPausado(false)}
      className="fixed inset-0 z-[80] flex flex-col bg-ink/96 backdrop-blur-sm"
      style={{ height: "100dvh", width: "100vw" }}
    >
      {/* ══════════ PROGRESO ══════════ */}
      <div
        aria-hidden
        className="flex shrink-0 gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {imagenes.map((img, i) => (
          <span
            key={img.key}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-surface/25"
          >
            <span
              className="block h-full rounded-full bg-surface"
              style={{
                width: i <= indice ? "100%" : "0%",
                transition:
                  i === indice && !pausado
                    ? `width ${DURACION}ms linear`
                    : "none",
              }}
            />
          </span>
        ))}
      </div>

      {/* ══════════ CREADOR ══════════ */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface/15">
          {producto.creador.avatarUrl ? (
            <Image
              src={producto.creador.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span className="text-xs font-semibold text-surface">
              {producto.creador.nombre.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          {producto.creador.username ? (
            <Link
              href={`/creadores/${producto.creador.username}`}
              className="flex min-h-[2.75rem] min-w-0 items-center gap-1 text-sm font-semibold text-surface underline-offset-4 hover:underline"
            >
              <span className="truncate">{producto.creador.nombre}</span>

              {producto.creador.isVerified && (
                <BadgeCheck
                  size={13}
                  aria-label="Creador verificado"
                  className="shrink-0"
                />
              )}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-surface">
              {producto.creador.nombre}
            </p>
          )}

          {producto.creador.username && (
            <p className="truncate text-[12px] text-surface/60">
              @{producto.creador.username}
            </p>
          )}
        </div>

        {total > 1 && (
          <span className="shrink-0 text-[12px] tabular-nums text-surface/60">
            {indice + 1} / {total}
          </span>
        )}

        <button
          ref={cerrarRef}
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="rk-press rk-touch grid h-11 w-11 shrink-0 place-items-center rounded-full text-surface transition-colors hover:bg-surface/10"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {/* ══════════ IMAGEN ══════════ */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        <span className="relative flex max-h-full max-w-full items-center justify-center">
          <PreviewProtegido
            key={imagen.key}
            src={imagen.url}
            alt={`${imagen.label} de ${producto.name}`}
            ancho={imagen.ancho}
            alto={imagen.alto}
            contener
            priority
            sizes="(max-width: 768px) 100vw, 40rem"
            className="max-h-[68dvh] w-auto rounded-rk-md"
          />
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Imagen anterior"
              className="rk-press absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-surface backdrop-blur transition-colors hover:bg-ink/70"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>

            <button
              type="button"
              onClick={siguiente}
              aria-label="Imagen siguiente"
              className="rk-press absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-surface backdrop-blur transition-colors hover:bg-ink/70"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* ══════════ ACCIONES ══════════ */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[15px] font-semibold text-surface">
              {producto.name}
            </p>

            <p className="shrink-0 text-lg font-semibold tabular-nums text-surface">
              {formatPrice(producto.price)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <BotonFavorito productId={producto.id} slug={producto.slug} />

            <BotonCarrito
              producto={producto}
              imagen={imagenes[0]?.url ?? null}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════ ACCIONES ══════════════ */

function BotonFavorito({
  productId,
  slug,
}: {
  productId: string;
  slug: string;
}) {
  const [guardado, setGuardado] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  async function alternar() {
    if (enCurso) return;

    setEnCurso(true);

    try {
      const respuesta = await fetch("/api/favoritos", {
        method: guardado ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (respuesta.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(
          `/tienda/${slug}`
        )}`;
        return;
      }

      if (respuesta.ok) setGuardado((antes) => !antes);
    } catch {
      // Un fallo de red no cambia el estado pintado.
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={guardado}
      aria-label={guardado ? "Quitar de guardados" : "Guardar"}
      className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-surface/25 text-surface transition-colors hover:bg-surface/10"
    >
      <Heart size={18} aria-hidden className={guardado ? "fill-current" : ""} />
    </button>
  );
}

function BotonCarrito({
  producto,
  imagen,
}: {
  producto: { id: string; name: string; price: number; slug: string };
  imagen: string | null;
}) {
  const [anadido, setAnadido] = useState(false);

  function anadir() {
    try {
      const guardado = localStorage.getItem(CART_STORAGE_KEY);

      const lista = guardado ? JSON.parse(guardado) : [];

      const carrito = Array.isArray(lista) ? lista : [];

      const yaEsta = carrito.some(
        (item: { id: string; kind?: string }) =>
          item.id === producto.id &&
          item.kind !== "PACK" &&
          item.kind !== "COLLECTION"
      );

      if (!yaEsta) {
        carrito.push({
          id: producto.id,
          kind: "PRODUCT",
          name: producto.name,
          price: producto.price,
          slug: producto.slug,
          coverUrl: imagen,
          quantity: 1,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carrito));

        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
      }

      setAnadido(true);

      setTimeout(() => setAnadido(false), 2400);
    } catch {
      // Si el navegador bloquea localStorage no se rompe nada.
    }
  }

  return (
    <button
      type="button"
      onClick={anadir}
      className="rk-press inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
    >
      <ShoppingBag size={16} aria-hidden />
      {anadido ? "Añadido al carrito" : "Añadir al carrito"}
    </button>
  );
}
