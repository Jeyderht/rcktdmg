"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
} from "lucide-react";

import { formatPrice } from "@/lib/pricing";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";
import type { TarjetaHome } from "@/lib/home";

/**
 * Carrusel en perspectiva para los recursos corporativos.
 *
 * El del centro está de frente y a tamaño completo; los de los
 * lados se alejan, se giran y pierden nitidez, de modo que la
 * profundidad indica cuál está seleccionado sin necesidad de
 * marcarlo con color.
 *
 * La profundidad se calcula por DISTANCIA al centro, no por
 * posición fija, así que funciona igual con tres recursos que
 * con nueve. En móvil el giro se reduce casi a cero: a 375 px
 * una tarjeta girada es una tarjeta ilegible.
 *
 * Todo lo que se ve es real: imagen, nombre, creador y precio
 * salen del catálogo.
 */
export default function SliceCorporativos({
  recursos,
}: {
  recursos: TarjetaHome[];
}) {
  const [centro, setCentro] = useState(0);

  if (recursos.length === 0) return null;

  const actual = recursos[centro];

  const mover = (paso: number) => {
    setCentro((i) => {
      const siguiente = i + paso;

      if (siguiente < 0) return 0;

      if (siguiente > recursos.length - 1) return recursos.length - 1;

      return siguiente;
    });
  };

  return (
    <section className="overflow-hidden border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rk-kicker">Empresa</p>

            <h2 className="rk-title mt-3 text-[2rem] sm:text-4xl">
              Corporativos
            </h2>

            <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink/60">
              Piezas para comunicar con una marca detrás: anuncios,
              presentaciones y campañas.
            </p>
          </div>

          <Link
            href="/tienda?categoria=corporativos"
            className="rk-press group inline-flex items-center gap-2 text-sm font-semibold"
          >
            Ver todos
            <ArrowUpRight
              size={15}
              aria-hidden
              className="transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* ══════════ ESCENARIO ══════════ */}
        <div
          className="rk-fade-up rk-enter-1 relative mt-10 flex h-[19rem] items-center justify-center sm:h-[23rem] lg:h-[26rem]"
          style={{ perspective: "1400px" }}
        >
          {recursos.map((recurso, indice) => {
            const distancia = indice - centro;

            const lejania = Math.abs(distancia);

            // Más allá del tercer puesto ya no aporta nada.
            if (lejania > 3) return null;

            const seleccionado = distancia === 0;

            return (
              <button
                key={recurso.id}
                type="button"
                onClick={() => setCentro(indice)}
                aria-label={
                  seleccionado
                    ? `${recurso.name}, seleccionado`
                    : `Ver ${recurso.name}`
                }
                aria-current={seleccionado}
                tabIndex={lejania > 1 ? -1 : 0}
                className="absolute h-[16rem] w-[12.5rem] transition-all duration-normal ease-rk sm:h-[20rem] sm:w-[15.5rem] lg:h-[23rem] lg:w-[18rem]"
                style={{
                  transform: [
                    `translateX(${distancia * 42}%)`,
                    `translateZ(${-lejania * 130}px)`,
                    `rotateY(${distancia * -16}deg)`,
                    `scale(${1 - lejania * 0.06})`,
                  ].join(" "),
                  zIndex: 10 - lejania,
                  opacity: seleccionado ? 1 : 0.55 - lejania * 0.1,
                  pointerEvents: lejania > 2 ? "none" : "auto",
                }}
              >
                <span className="rk-frame relative block h-full w-full overflow-hidden rounded-rk-lg shadow-2xl">
                  {recurso.imagen && (
                    <Image
                      src={recurso.imagen}
                      alt={recurso.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 60vw, 18rem"
                      priority={lejania <= 1}
                    />
                  )}
                </span>
              </button>
            );
          })}

          {/* NAVEGACIÓN */}
          {centro > 0 && (
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Anterior"
              className="rk-press absolute left-0 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line/15 bg-surface/80 backdrop-blur transition-colors hover:bg-surface"
            >
              <ChevronLeft size={19} aria-hidden />
            </button>
          )}

          {centro < recursos.length - 1 && (
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Siguiente"
              className="rk-press absolute right-0 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line/15 bg-surface/80 backdrop-blur transition-colors hover:bg-surface"
            >
              <ChevronRight size={19} aria-hidden />
            </button>
          )}
        </div>

        {/* ══════════ FICHA DEL SELECCIONADO ══════════ */}
        {actual && (
          <div className="rk-fade-up mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-3 text-center">
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink/60">
              <span className="rk-media relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {actual.creador.avatarUrl ? (
                  <Image
                    src={actual.creador.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                ) : (
                  <span className="text-[10px] font-semibold">
                    {actual.creador.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              {actual.creador.username ? (
                <Link
                  href={`/creadores/${actual.creador.username}`}
                  className="flex min-w-0 items-center gap-1 underline-offset-4 hover:underline"
                >
                  <span className="truncate">{actual.creador.nombre}</span>

                  {actual.creador.isVerified && (
                    <BadgeCheck
                      size={12}
                      aria-label="Creador verificado"
                      className="shrink-0"
                    />
                  )}
                </Link>
              ) : (
                <span className="truncate">{actual.creador.nombre}</span>
              )}
            </div>

            <h3 className="rk-title text-xl sm:text-2xl">{actual.name}</h3>

            <p className="text-lg font-semibold tabular-nums">
              {formatPrice(actual.price)}
            </p>

            <div className="mt-1 flex w-full items-center justify-center gap-2">
              <FavoritoCorporativo productId={actual.id} />

              <CarritoCorporativo recurso={actual} />

              <Link
                href={`/tienda/${actual.slug}`}
                aria-label={`Ver la ficha de ${actual.name}`}
                className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line/15 transition-colors hover:bg-ink/[0.04]"
              >
                <ArrowUpRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════ ACCIONES ══════════════ */

function FavoritoCorporativo({ productId }: { productId: string }) {
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
        window.location.href = "/login?redirect=%2F";
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
      className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line/15 transition-colors hover:bg-ink/[0.04]"
    >
      <Heart
        size={18}
        aria-hidden
        className={guardado ? "fill-current" : ""}
      />
    </button>
  );
}

function CarritoCorporativo({ recurso }: { recurso: TarjetaHome }) {
  const [anadido, setAnadido] = useState(false);

  function anadir() {
    try {
      const guardado = localStorage.getItem(CART_STORAGE_KEY);

      const lista = guardado ? JSON.parse(guardado) : [];

      const carrito = Array.isArray(lista) ? lista : [];

      const yaEsta = carrito.some(
        (item: { id: string; kind?: string }) =>
          item.id === recurso.id &&
          item.kind !== "PACK" &&
          item.kind !== "COLLECTION"
      );

      if (!yaEsta) {
        carrito.push({
          id: recurso.id,
          kind: "PRODUCT",
          name: recurso.name,
          price: recurso.price,
          slug: recurso.slug,
          coverUrl: recurso.imagen,
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
      className="rk-btn rk-btn-primary h-12 min-w-0 flex-1 !rounded-full"
    >
      <ShoppingBag size={16} aria-hidden />
      {anadido ? "Añadido" : "Añadir al carrito"}
    </button>
  );
}
