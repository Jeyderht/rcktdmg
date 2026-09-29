"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronLeft,
  Check,
  ChevronRight,
  Heart,
  ShoppingBag,
  X,
} from "lucide-react";

import { formatPrice } from "@/lib/pricing";
import PreviewProtegido from "@/components/PreviewProtegido";
import { ASPECTO_STORY, type TarjetaHome } from "@/lib/home";
import { anadirAlCarrito } from "@/components/useCartCount";
import { useSwipe } from "@/components/useSwipe";
import {
  alternarFavorito,
  useEsFavorito,
} from "@/components/favoritos-store";

/**
 * Stories de eventos.
 *
 * Se lee como una story: pantalla completa, el flyer manda, y
 * encima la información mínima para decidir. Pero no hay
 * ningún sistema de publicaciones detrás: cada story ES un
 * recurso del catálogo, con su creador, su precio y su ficha.
 *
 * Dos capas: una tira horizontal siempre visible, y el modo
 * story a pantalla completa al pulsar una.
 *
 * Reutiliza el carrito de siempre (`rcktdmg_cart`) y la API de
 * favoritos existente. No se crea un segundo de ninguno.
 */
/** Cuánto dura cada story antes de pasar sola. */
const DURACION_STORY = 4500;

export default function StoriesEventos({
  flyers,
}: {
  flyers: TarjetaHome[];
}) {
  const [abierta, setAbierta] = useState<number | null>(null);

  /*
    Sin flyers de Eventos publicados, la sección entera no se
    pinta.

    Antes se rellenaba con recursos de otras categorías bajo un
    rótulo de demostración. El rótulo era honesto, pero la
    sección seguía enseñando recursos que no encajaban en el
    rótulo, y eso da una idea falsa del catálogo. Una portada
    que crece con lo que hay publicado se entiende sola: sin
    recursos verticales, no hay tira de stories.
  */
  if (flyers.length === 0) return null;

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rk-kicker">Formato vertical</p>

            <h2 className="rk-title mt-3 text-[2rem] sm:text-4xl">
              Stories
            </h2>

            <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink/60">
              Piezas verticales 1080 × 1920, listas para publicar.
              Pulsa una para verla a pantalla completa.
            </p>
          </div>

          <Link
            href="/tienda"
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

        {/* ══════════ TIRA ══════════ */}
        <ul className="rk-fade-up rk-enter-1 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {flyers.map((flyer, indice) => (
            <li key={flyer.id} className="snap-start">
              <button
                type="button"
                onClick={() => setAbierta(indice)}
                aria-label={`Ver ${flyer.name} a pantalla completa`}
                className="rk-press group block w-[8.5rem] text-left sm:w-[10rem]"
              >
                {/*
                  9:16, el formato de una story (1080 × 1920).
                  Antes era 4:5, que es el de Corporativos, y
                  las dos secciones se veían con la misma forma
                  pese a ser formatos distintos.
                */}
                <span
                  className="rk-frame relative block w-full overflow-hidden rounded-rk-md"
                  style={{ aspectRatio: ASPECTO_STORY }}
                >
                  {flyer.imagen && (
                    <PreviewProtegido
                      src={flyer.imagen}
                      alt={flyer.name}
                      sizes="(max-width: 640px) 40vw, 11rem"
                      className="transition-transform duration-normal ease-rk group-hover:scale-[1.03]"
                      esquina="arriba-derecha"
                    />
                  )}

                  <span className="rk-glass-on-image absolute bottom-2 left-2 right-2 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                    {formatPrice(flyer.price)}
                  </span>
                </span>

                <span className="mt-2 block truncate px-0.5 text-[13px] font-medium">
                  {flyer.name}
                </span>

                <span className="block truncate px-0.5 text-[12px] text-ink/55">
                  {flyer.creador.nombre}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {abierta !== null && (
        <VisorStories
          flyers={flyers}
          indiceInicial={abierta}
          alCerrar={() => setAbierta(null)}
        />
      )}
    </section>
  );
}

/* ══════════════ MODO STORY ══════════════ */

function VisorStories({
  flyers,
  indiceInicial,
  alCerrar,
}: {
  flyers: TarjetaHome[];
  indiceInicial: number;
  alCerrar: () => void;
}) {
  const [indice, setIndice] = useState(indiceInicial);

  /*
    AUTOPLAY

    Avanza solo cada DURACION_STORY y da la vuelta al llegar al
    final, para que no acabe en una pantalla muerta.

    Se pausa en cuanto alguien interactúa —pulsar, pasar el
    ratón, o mantener pulsado, como en cualquier story— y se
    reanuda al soltar. Quien está mirando manda sobre el reloj.
  */
  const [pausado, setPausado] = useState(false);

  // El portal necesita el DOM: en el servidor no hay <body>.
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const cerrarRef = useRef<HTMLButtonElement>(null);

  const flyer = flyers[indice];

  const anterior = useCallback(() => {
    setIndice((i) => (i > 0 ? i - 1 : i));
  }, []);

  const siguiente = useCallback(() => {
    setIndice((i) => (i < flyers.length - 1 ? i + 1 : i));
  }, [flyers.length]);

  /*
    Dedo a la izquierda → siguiente story; a la derecha →
    anterior. El gesto que cualquiera espera de unas stories.
  */
  const swipe = useSwipe({
    alIzquierda: siguiente,
    alDerecha: anterior,
  });

  /*
    Teclado: flechas para moverse y Escape para salir. Una
    story que solo responde al dedo deja fuera a quien navega
    con teclado.
  */
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
      if (evento.key === "ArrowLeft") anterior();
      if (evento.key === "ArrowRight") siguiente();
    }

    window.addEventListener("keydown", alTeclear);

    // Mientras la story está abierta la página no se desplaza.
    const overflowPrevio = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    cerrarRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [alCerrar, anterior, siguiente]);

  /* El temporizador se reinicia con cada cambio de story. */
  useEffect(() => {
    if (pausado || flyers.length < 2) return;

    const t = window.setTimeout(() => {
      setIndice((i) => (i + 1) % flyers.length);
    }, DURACION_STORY);

    return () => window.clearTimeout(t);
  }, [indice, pausado, flyers.length]);

  if (!flyer || !montado) return null;

  /*
    PORTAL

    El diálogo se monta directamente en <body>. Montado donde
    vive el componente quedaba atrapado: sus ancestros llevan
    animaciones con `transform`, y un elemento transformado
    crea un contexto de apilamiento propio, de modo que su
    z-index solo competía con sus hermanos y la cabecera
    quedaba por encima de una pantalla completa.
  */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${flyer.name}, ${indice + 1} de ${flyers.length}`}
      {...swipe}
      /*
        Mantener pulsado pausa, soltar reanuda: el gesto de
        cualquier story. NO se usa `onMouseEnter`, porque en
        escritorio el puntero está siempre sobre el diálogo y
        eso dejaría el avance detenido para siempre.
      */
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
      style={{
        height: "100dvh",
        width: "100vw",
        /*
          Corta el gesto de "atrás" del navegador: sin esto, el
          dedo hacia la derecha abandonaba la página entera en
          lugar de retroceder una story. Comprobado en Chrome.
        */
        overscrollBehaviorX: "contain",
      }}
    >
      {/* ══════════ BARRA DE PROGRESO ══════════ */}
      <div
        aria-hidden
        className="flex shrink-0 gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {flyers.map((f, i) => (
          <span
            key={f.id}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            {/*
              La barra de la story actual se llena durante su
              turno, así que se ve cuánto queda. Las ya vistas
              quedan llenas; las siguientes, vacías.
            */}
            <span
              className="block h-full rounded-full bg-white"
              style={{
                width: i < indice ? "100%" : i === indice ? "100%" : "0%",
                transition:
                  i === indice && !pausado
                    ? `width ${DURACION_STORY}ms linear`
                    : "none",
                ...(i === indice ? { animation: "none" } : {}),
              }}
            />
          </span>
        ))}
      </div>

      {/* ══════════ CABECERA ══════════ */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
          {flyer.creador.avatarUrl ? (
            <Image
              src={flyer.creador.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span className="text-xs font-semibold text-white">
              {flyer.creador.nombre.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          {flyer.creador.username ? (
            <Link
              href={`/creadores/${flyer.creador.username}`}
              className="flex min-h-[2.75rem] min-w-0 items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              <span className="truncate">{flyer.creador.nombre}</span>

              {flyer.creador.isVerified && (
                <BadgeCheck
                  size={13}
                  aria-label="Creador verificado"
                  className="shrink-0"
                />
              )}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-white">
              {flyer.creador.nombre}
            </p>
          )}

          {flyer.creador.username && (
            <p className="truncate text-[12px] text-white/60">
              @{flyer.creador.username}
            </p>
          )}
        </div>

        {/*
          Contador 1 / N. La barra de progreso ya dice por
          dónde va, pero con muchas stories las franjas se
          vuelven finas y el número es lo único que se lee de
          un vistazo.
        */}
        {flyers.length > 1 && (
          <span className="shrink-0 text-[12px] tabular-nums text-white/60">
            {indice + 1} / {flyers.length}
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

      {/* ══════════ FLYER ══════════ */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        {/*
          La imagen se enseña ENTERA y con su proporción real.
          Nada de convertir todo a 1080 × 1350: un flyer
          cuadrado se ve cuadrado y uno panorámico, panorámico.
          El marco se adapta a la imagen, no al revés.
        */}
        {/*
          El contenedor tiene altura propia (h-full dentro de un
          padre flex-1). Sin ella, una imagen con `fill` se
          queda en 0 × 0: cargada pero invisible.
        */}
        {flyer.imagen && (
          <span
            className="relative mx-auto block h-full w-auto"
            style={{ aspectRatio: ASPECTO_STORY }}
          >
            <PreviewProtegido
              src={flyer.imagen}
              alt={flyer.name}
              contener
              priority
              sizes="(max-width: 768px) 100vw, 40rem"
              className="rounded-rk-md"
            />
          </span>
        )}

        {/* Navegación. En móvil basta con deslizar la tira, pero
            los botones dan una alternativa accesible. */}
        {indice > 0 && (
          <button
            type="button"
            onClick={anterior}
            aria-label="Anterior"
            className="rk-press absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
        )}

        {indice < flyers.length - 1 && (
          <button
            type="button"
            onClick={siguiente}
            aria-label="Siguiente"
            className="rk-press absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        )}
      </div>

      {/*
        ══════════ ACCIONES ══════════

        Guardar, comprar y abrir la ficha. Sin título ni
        precio: una story es la pieza a pantalla completa, no
        una ficha de producto encogida.
      */}
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
          <BotonFavorito productId={flyer.id} />

          {/*
            La `key` es la del flyer que se está viendo: al
            pasar de story el botón se reinicia y vuelve a su
            estado normal, en vez de arrastrar el "Agregado"
            del anterior.
          */}
          <BotonCarrito key={flyer.id} flyer={flyer} />

          <Link
            href={`/tienda/${flyer.slug}`}
            className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="Ver el recurso"
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
 * reglas de duplicados. Aquí no hay lógica de carrito propia.
 *
 * Añade SIEMPRE el flyer que se está viendo, porque recibe el
 * de `flyers[indice]` y no una referencia fija. La story no se
 * cierra: quien está mirando sigue mirando.
 */
function BotonCarrito({ flyer }: { flyer: TarjetaHome }) {
  const [anadido, setAnadido] = useState(false);

  useEffect(() => {
    if (!anadido) return;

    const t = window.setTimeout(() => setAnadido(false), 2400);

    return () => window.clearTimeout(t);
  }, [anadido]);

  function anadir() {
    anadirAlCarrito({
      id: flyer.id,
      kind: "PRODUCT",
      name: flyer.name,
      price: flyer.price,
      slug: flyer.slug,
      coverUrl: flyer.imagen,
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

/**
 * Favorito.
 *
 * Llama a la API de favoritos que ya existe. Sin sesión, la
 * respuesta es 401 y se manda al login: no se guarda nada en
 * el navegador que después no exista en la cuenta.
 */
function BotonFavorito({ productId }: { productId: string }) {
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
      className="rk-press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    >
      <Heart
        size={18}
        aria-hidden
        className={esFavorito ? "fill-current" : ""}
      />
    </button>
  );
}

