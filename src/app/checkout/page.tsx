"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, ShoppingBag } from "lucide-react";

import Navbar from "@/components/Navbar";
import { claseProporcion } from "@/lib/tipos-publicacion";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
} from "@/components/useCartCount";

type CartItem = {
  id: string;
  name: string;
  price: number;
  slug: string;
  coverUrl: string | null;
  /**
   * Pieza del recurso, cuando el carrito la guardó. Decide el
   * marco de la miniatura. Ausente en los carritos anteriores,
   * que caen al marco del catálogo.
   */
  pieceType?: string | null;
  /**
   * Categoría del recurso, cuando el carrito la guardó. Con la
   * pieza, decide el marco de la miniatura. Ausente en los
   * carritos anteriores.
   */
  categorySlug?: string | null;
  kind?: "PRODUCT" | "PACK" | "COLLECTION";
  quantity: number;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
    Cuando el pedido se rechaza porque algo del carrito YA es
    suyo, el mensaje no basta: hay que dejarle salir. Se marca
    para ofrecerle sus descargas, que es donde está lo que
    venía a comprar.
  */
  const [yaEraSuyo, setYaEraSuyo] = useState(false);

  useEffect(() => {
    let guardado: CartItem[] = [];

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) guardado = parsed;
      }
    } catch {
      guardado = [];
    }

    setCart(guardado);
    setLoaded(true);

    if (guardado.length === 0) return;

    /*
      AL ABRIR, no al pulsar comprar.

      El carrito vive en el navegador y puede llevar horas ahí
      mientras la compra ocurría en otra pestaña o en otro
      dispositivo. Se pregunta al servidor qué sigue siendo
      comprable y se retira lo que ya no lo es, antes de que
      nadie rellene nada.

      Si la consulta falla no pasa nada: el pedido lo vuelve a
      comprobar igualmente antes de crearse.
    */
    void (async () => {
      try {
        const respuesta = await fetch("/api/carrito/revisar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productIds: guardado
              .filter((i) => i.kind !== "PACK" && i.kind !== "COLLECTION")
              .map((i) => i.id),
            packIds: guardado
              .filter((i) => i.kind === "PACK")
              .map((i) => i.id),
            collectionIds: guardado
              .filter((i) => i.kind === "COLLECTION")
              .map((i) => i.id),
          }),
        });

        const datos = await respuesta.json();

        const suyos = datos.yaAdquiridos as {
          productos: string[];
          packs: string[];
          colecciones: string[];
        };

        if (
          !suyos ||
          (!suyos.productos.length &&
            !suyos.packs.length &&
            !suyos.colecciones.length)
        ) {
          return;
        }

        const limpio = guardado.filter((item) =>
          item.kind === "PACK"
            ? !suyos.packs.includes(item.id)
            : item.kind === "COLLECTION"
              ? !suyos.colecciones.includes(item.id)
              : !suyos.productos.includes(item.id)
        );

        setCart(limpio);
        setYaEraSuyo(true);
        setError(
          suyos.colecciones.length && !suyos.productos.length
            ? "Ya adquiriste esta colección, así que la hemos quitado del carrito."
            : "Ya habías comprado algo del carrito. Lo hemos quitado."
        );

        try {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limpio));
          window.dispatchEvent(new Event(CART_UPDATED_EVENT));
        } catch {
          /* Sin almacenamiento el carrito vive solo en memoria. */
        }
      } catch {
        /* El pedido lo comprobará de todos modos. */
      }
    })();
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function createOrder() {
    setError("");
    setYaEraSuyo(false);

    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          /*
            Cada elemento viaja con SU identificador y nada
            más: ni precio ni total. Un pack va como packId y
            una colección como collectionId; el servidor los
            expande en una línea por recurso y cobra el precio
            del conjunto. Los elementos sin `kind` son
            recursos sueltos, como siempre.
          */
          items: cart.map((item) => {
            if (item.kind === "PACK") {
              return { packId: item.id, quantity: item.quantity };
            }

            if (item.kind === "COLLECTION") {
              return { collectionId: item.id, quantity: item.quantity };
            }

            return { productId: item.id, quantity: item.quantity };
          }),
        }),
      });

      const data = await response.json();

      /*
        409: el carrito lleva algo ya comprado.

        Se retiran esas líneas del carrito en vez de dejarlas
        bloqueando el pedido para siempre. Lo demás se
        conserva: nadie pierde el resto de su compra por
        haberse repetido en una pieza.
      */
      if (response.status === 409 && data.yaAdquiridos) {
        const suyos = data.yaAdquiridos as {
          productos: string[];
          packs: string[];
          colecciones: string[];
        };

        const limpio = cart.filter((item) => {
          if (item.kind === "PACK") return !suyos.packs.includes(item.id);

          if (item.kind === "COLLECTION") {
            return !suyos.colecciones.includes(item.id);
          }

          return !suyos.productos.includes(item.id);
        });

        setCart(limpio);

        try {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limpio));
          window.dispatchEvent(new Event(CART_UPDATED_EVENT));
        } catch {
          /* Sin almacenamiento el carrito vive solo en memoria. */
        }

        setYaEraSuyo(true);
        setError(data.error || "Ya adquiriste uno de estos recursos.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo crear el pedido."
        );
      }

      if (!data.order?.id) {
        throw new Error(
          "El servidor no devolvió el ID del pedido."
        );
      }

      /*
       * El ID viene directamente de nuestra base de datos.
       */
      window.location.href = `/checkout/confirmacion?order=${encodeURIComponent(
        data.order.id
      )}`;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el pedido."
      );

      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <>
        <Navbar />

        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-5">
          <div className="rk-card h-32 animate-pulse" />
        </main>
      </>
    );
  }

  if (cart.length === 0) {
    return (
      <>
        <Navbar />

        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-5 lg:pt-12">
          <div className="rk-card px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-rk-md bg-ink/[0.05]">
              <ShoppingBag size={24} className="text-ink/60" />
            </div>

            {/*
              Si el carrito se vació porque lo que llevaba YA
              era suyo, hay que decirlo aquí. Antes el aviso se
              pintaba junto al resumen del pedido, que en este
              estado no existe: la persona veía "no hay nada
              que pagar" sin entender por qué había
              desaparecido su compra.
            */}
            <h1 className="mt-5 text-xl font-semibold">
              {yaEraSuyo ? "Ya lo tienes" : "No hay nada que pagar"}
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/60">
              {yaEraSuyo
                ? error ||
                  "Lo que llevabas en el carrito ya lo habías comprado."
                : "Agrega un recurso antes de continuar con el pago."}
            </p>

            {yaEraSuyo ? (
              <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/mi-cuenta/descargas"
                  className="rk-btn rk-btn-primary"
                >
                  Ir a mis descargas
                </Link>

                <Link href="/tienda" className="rk-btn rk-btn-glass">
                  Ir a la tienda
                </Link>
              </div>
            ) : (
              <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
                Ir a la tienda
              </Link>
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

        <Link
          href="/carrito"
          className="rk-press mb-5 inline-flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          Volver al carrito
        </Link>

        <div className="rk-enter">
          <p className="rk-eyebrow">Paso final</p>

          <h1 className="mt-2 text-[2rem] font-semibold leading-tight sm:text-4xl">
            Confirmar pedido
          </h1>

          <p className="mt-2 max-w-xl text-sm text-ink/60">
            Revisa tu pedido antes de continuar con el pago.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">

          {/* RESUMEN DE ARTÍCULOS */}
          <div className="rk-enter rk-enter-1 rk-card divide-y divide-line/10 p-5 sm:p-6">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                {/* Contenido visual 9:16, siempre nítido. */}
                <div
                  className={`rk-media ${claseProporcion(
                    {
                    categoriaSlug: item.categorySlug,
                    pieceType: item.pieceType as never,
                  }
                  )} relative w-14 shrink-0 overflow-hidden rounded-rk-sm`}
                >
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                      RK
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] font-medium leading-snug">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-ink/60">
                    {item.quantity} × S/ {item.price.toFixed(2)}
                  </p>
                </div>

                <p className="shrink-0 font-semibold">
                  S/ {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* PAGO */}
          <div className="rk-enter rk-enter-2 lg:sticky lg:top-24 lg:self-start">
            <div className="rk-glass rounded-rk-lg p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Total a pagar</h2>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                S/ {total.toFixed(2)}
              </p>

              {error && (
                <div
                  role="alert"
                  className="animate-scale-in mt-5 rounded-rk-sm border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
                >
                  {error}

                  {/*
                    Si el rechazo fue por tenerlo ya, el camino
                    natural no es reintentar: es ir a buscarlo
                    donde está.
                  */}
                  {yaEraSuyo && (
                    <Link
                      href="/mi-cuenta/descargas"
                      className="mt-2.5 inline-flex items-center gap-1.5 font-medium underline underline-offset-4"
                    >
                      Ir a mis descargas
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={createOrder}
                disabled={loading}
                className="rk-btn rk-btn-primary mt-6 w-full !py-3.5"
              >
                {loading ? "Creando pedido..." : "Continuar al pago"}
              </button>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink/60">
                <Lock size={12} />
                Pago protegido
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
