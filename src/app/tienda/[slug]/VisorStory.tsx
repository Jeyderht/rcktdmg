"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  X,
} from "lucide-react";

import PreviewProtegido from "@/components/PreviewProtegido";
import { ASPECTO_STORY } from "@/lib/home";
import { anadirAlCarrito } from "@/components/useCartCount";

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
      /*
        FONDO DEL VISOR

        Negro explícito, no el token `ink`. Dos motivos, los
        dos comprobados en el navegador:

        1. `bg-ink/96` no generaba NADA. La escala de opacidad
           de Tailwind no incluye 96, así que la regla no se
           creaba y el diálogo quedaba transparente: se veía la
           ficha del producto por debajo.

        2. `ink` se invierte con el tema. En oscuro vale
           243 245 248, casi blanco, de modo que el fondo de la
           story habría sido claro justo donde debe ser negro.

        Una story es negra en los dos temas. Por eso el color va
        fijo y no depende de ningún token.
      */
      className="fixed inset-0 z-[80] flex flex-col bg-[#0a0a0c]"
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
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <span
              className="block h-full rounded-full bg-white"
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
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
          {producto.creador.avatarUrl ? (
            <Image
              src={producto.creador.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span className="text-xs font-semibold text-white">
              {producto.creador.nombre.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          {producto.creador.username ? (
            <Link
              href={`/creadores/${producto.creador.username}`}
              className="flex min-h-[2.75rem] min-w-0 items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline"
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
            <p className="truncate text-sm font-semibold text-white">
              {producto.creador.nombre}
            </p>
          )}

          {producto.creador.username && (
            <p className="truncate text-[12px] text-white/60">
              @{producto.creador.username}
            </p>
          )}
        </div>

        {total > 1 && (
          <span className="shrink-0 text-[12px] tabular-nums text-white/60">
            {indice + 1} / {total}
          </span>
        )}

        <button
          ref={cerrarRef}
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="rk-press rk-touch grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {/* ══════════ IMAGEN ══════════ */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        {/*
          El contenedor tiene altura propia (h-full dentro de un
          padre flex-1). Sin ella, una imagen con `fill` se
          queda en 0 × 0 y no se ve nada.
        */}
        {/*
          El marco tiene la proporción de una story y se centra.

          Antes ocupaba todo el ancho disponible: con
          object-contain el flyer salía bien, pero la marca de
          agua —anclada a la esquina del MARCO— acababa pegada
          al borde de la pantalla, a medio metro de la imagen.
          Ahora el marco abraza al flyer y la marca va donde
          tiene que ir.
        */}
        <span
          className="relative mx-auto block h-full w-auto"
          style={{ aspectRatio: ASPECTO_STORY }}
        >
          <PreviewProtegido
            key={imagen.key}
            src={imagen.url}
            alt={`${imagen.label} de ${producto.name}`}
            contener
            priority
            sizes="(max-width: 768px) 100vw, 40rem"
            className="rounded-rk-md"
          />
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Imagen anterior"
              className="rk-press absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>

            <button
              type="button"
              onClick={siguiente}
              aria-label="Imagen siguiente"
              className="rk-press absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/*
        ══════════ ACCIONES ══════════

        Guardar, comprar y abrir la ficha. Sin título ni precio:
        una story es la pieza a pantalla completa, no una ficha
        de producto encogida.
      */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
          <BotonFavorito productId={producto.id} slug={producto.slug} />

          <BotonCarrito
            producto={producto}
            imagen={imagenes[0] ? imagenes[0].url : null}
          />

          <Link
            href={`/tienda/${producto.slug}`}
            aria-label="Ver el recurso"
            className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
          >
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════ ACCIONES ══════════════ */

/**
 * Añadir al carrito desde la story.
 *
 * Usa `anadirAlCarrito`, la misma función que el resto del
 * sitio: el mismo `rcktdmg_cart`, el mismo evento y las mismas
 * reglas de duplicados. Aquí no hay ninguna lógica de carrito
 * propia.
 *
 * La story NO se cierra al añadir: quien está mirando sigue
 * mirando, y el botón se limita a confirmar lo que hizo.
 */
function BotonCarrito({
  producto,
  imagen,
}: {
  producto: { id: string; name: string; slug: string; price: number };
  imagen: string | null;
}) {
  const [anadido, setAnadido] = useState(false);

  useEffect(() => {
    if (!anadido) return;

    const t = window.setTimeout(() => setAnadido(false), 2400);

    return () => window.clearTimeout(t);
  }, [anadido]);

  function anadir() {
    anadirAlCarrito({
      id: producto.id,
      kind: "PRODUCT",
      name: producto.name,
      price: producto.price,
      slug: producto.slug,
      coverUrl: imagen,
    });

    setAnadido(true);
  }

  return (
    <button
      type="button"
      onClick={anadir}
      aria-label={anadido ? "Agregado al carrito" : "Añadir al carrito"}
      className={`rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors ${
        anadido
          ? "border-white bg-white text-[#0a0a0c]"
          : "border-white/25 text-white hover:bg-white/10"
      }`}
    >
      {anadido ? (
        <Check size={18} aria-hidden />
      ) : (
        <ShoppingBag size={18} aria-hidden />
      )}
    </button>
  );
}

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
      className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    >
      <Heart size={18} aria-hidden className={guardado ? "fill-current" : ""} />
    </button>
  );
}

