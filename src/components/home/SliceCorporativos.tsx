"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { useSwipe } from "@/components/useSwipe";
import { ASPECTO_CORPORATIVO, type TarjetaHome } from "@/lib/home";

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
/** Cada cuánto avanza solo el carrusel. */
const INTERVALO = 3800;

/** Cuánto dura el desplazamiento entre una pieza y la siguiente. */
const TRANSICION = 600;

export default function SliceCorporativos({
  recursos,
}: {
  recursos: TarjetaHome[];
}) {
  /*
    ÍNDICE VIRTUAL

    `centro` crece o decrece sin límite: 0, 1, 2, … y también
    -1, -2. Lo que se pinta sale de normalizarlo con el resto
    de la división, así que el carrusel no tiene principio ni
    final y nunca hay que "saltar" de la última a la primera.
    Ese salto es justo lo que se nota como un tirón.
  */
  const [centro, setCentro] = useState(0);

  const total = recursos.length;

  /** Posición real dentro del array, venga el índice que venga. */
  const normalizar = (i: number) =>
    total === 0 ? 0 : ((i % total) + total) % total;

  const actual = recursos[normalizar(centro)];

  const mover = (paso: number) => setCentro((i) => i + paso);

  /*
    En móvil el carrusel se pasa con el dedo. Se mueve una
    pieza por gesto, igual que con las flechas, y el
    temporizador se reinicia solo porque depende de `centro`.
  */
  const swipe = useSwipe({
    alIzquierda: () => mover(1),
    alDerecha: () => mover(-1),
  });

  /*
    AUTOPLAY

    Avanza cada INTERVALO. El temporizador depende de `centro`,
    así que cualquier movimiento manual lo reinicia solo: no
    puede ocurrir que pulses la flecha y medio segundo después
    salte otra vez por su cuenta.

    Se detiene mientras el puntero está encima, porque aquí sí
    tiene sentido: el carrusel vive dentro de la página y quien
    se para sobre él está mirando una pieza concreta.
  */
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (total < 2 || pausado) return;

    const t = window.setTimeout(() => setCentro((i) => i + 1), INTERVALO);

    return () => window.clearTimeout(t);
  }, [centro, pausado, total]);

  /*
    Sin piezas corporativas reales en 1080 × 1350 la sección no
    se pinta, igual que la de Eventos. Antes se rellenaba con
    recursos de otras categorías; el aviso era honesto, pero
    seguía enseñando Social Media bajo el título «Corporativos».
  */
  if (total === 0) return null;

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
            className="rk-press rk-link-seccion group gap-2 text-sm font-semibold"
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
          {...swipe}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          className="rk-fade-up rk-enter-1 relative mt-10 flex h-[20rem] items-center justify-center sm:h-[25rem] lg:h-[29rem]"
          style={{
            perspective: "1400px",
            /* Que el dedo hacia la derecha no dispare el "atrás". */
            overscrollBehaviorX: "contain",
          }}
        >
          {recursos.map((recurso, indice) => {
            /*
              Distancia MÁS CORTA alrededor del círculo. Con 5
              recursos, la 4 está a -1 de la 0, no a +4: así la
              que sale por un lado entra por el otro y el bucle
              se ve continuo.
            */
            const crudo = indice - normalizar(centro);

            const distancia =
              total === 0
                ? 0
                : crudo > total / 2
                  ? crudo - total
                  : crudo < -total / 2
                    ? crudo + total
                    : crudo;

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
                /*
                  4:5 EXACTO (1080 × 1350), el formato de
                  Corporativos. Las Stories son 9:16 y no se
                  mezclan: cada sección conserva la suya.
                */
                className="absolute w-[12.5rem] ease-rk sm:w-[15.5rem] lg:w-[18rem]"
                style={{
                  aspectRatio: ASPECTO_CORPORATIVO,
                  transitionProperty: "transform, opacity",
                  transitionDuration: `${TRANSICION}ms`,
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
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

          {/* NAVEGACIÓN · siempre, porque el carrusel no acaba */}
          {total > 1 && (
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Anterior"
              className="rk-press absolute left-0 top-1/2 z-20 -translate-y-1/2 rk-hero-round rk-flecha"
            >
              <ChevronLeft size={19} aria-hidden />
            </button>
          )}

          {total > 1 && (
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Siguiente"
              className="rk-press absolute right-0 top-1/2 z-20 -translate-y-1/2 rk-hero-round rk-flecha"
            >
              <ChevronRight size={19} aria-hidden />
            </button>
          )}
        </div>

        {/* ══════════ FICHA DEL SELECCIONADO ══════════ */}
        {actual && (
          <div className="rk-fade-up mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-3 text-center">
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink/60">
              <span className="rk-avatar-anillo relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
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
                className="rk-hero-round rk-flecha shrink-0"
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
      className="rk-hero-round rk-flecha shrink-0"
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
