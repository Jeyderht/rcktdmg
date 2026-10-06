"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Lock, ShoppingBag } from "lucide-react";

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
          <div className="rk-skeleton" style={{ height: 128, borderRadius: 24 }} />
        </main>
      </>
    );
  }

  if (cart.length === 0) {
    return (
      <>
        <Navbar />

        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-5 lg:pt-12">
          <div className="rk-empty">
            <span aria-hidden className="rk-empty-icon">
              <ShoppingBag />
            </span>

            {/*
              Si el carrito se vació porque lo que llevaba YA
              era suyo, hay que decirlo aquí. Antes el aviso se
              pintaba junto al resumen del pedido, que en este
              estado no existe: la persona veía "no hay nada
              que pagar" sin entender por qué había
              desaparecido su compra.
            */}
            <h1 className="rk-empty-title">
              {yaEraSuyo ? "Ya lo tienes" : "No hay nada que pagar"}
            </h1>

            <p className="rk-empty-text">
              {yaEraSuyo
                ? error ||
                  "Lo que llevabas en el carrito ya lo habías comprado."
                : "Agrega un recurso antes de continuar con el pago."}
            </p>

            {yaEraSuyo ? (
              <div className="rk-empty-actions">
                <Link
                  href="/mi-cuenta/descargas"
                  className="rk-btn rk-btn-primary"
                >
                  Ir a mis descargas
                </Link>

                <Link href="/tienda" className="rk-btn rk-btn-line">
                  Ir a la tienda
                </Link>
              </div>
            ) : (
              <div className="rk-empty-actions">
                <Link href="/tienda" className="rk-btn rk-btn-primary">
                  Ir a la tienda
                </Link>
              </div>
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

        <Link href="/carrito" className="rk-auth-back">
          <ArrowLeft aria-hidden />
          Volver al carrito
        </Link>

        {/* AVANCE: carrito hecho, confirmación en curso, pago pendiente */}
        <ol className="rk-steps-line mb-7" aria-label="Pasos de la compra">
          <li className="is-done">
            <span className="rk-steps-dot">
              <Check aria-hidden />
            </span>
            Carrito
          </li>

          <li className="is-current" aria-current="step">
            <span className="rk-steps-dot">2</span>
            Confirmar
          </li>

          <li>
            <span className="rk-steps-dot">3</span>
            Pago
          </li>
        </ol>

        <div className="rk-enter">
          <p className="rk-eyebrow">Paso final</p>

          <h1 className="mt-2 text-[2rem] font-semibold leading-tight sm:text-4xl">
            Confirmar pedido
          </h1>

          <p className="mt-2 max-w-xl text-sm text-ink/60">
            Revisa tu pedido antes de continuar con el pago.
          </p>
        </div>

        {/* RESUMEN · pase de abordar (el mismo del carrito) */}
        <div className="rk-enter rk-enter-1 mx-auto mt-6 grid max-w-lg gap-3">
          <article className="rk-receipt">
            <header className="rk-receipt-head">
              <div>
                <span className="rk-receipt-label">Confirma tu</span>
                <h2 className="rk-receipt-title">pedido</h2>
              </div>
            </header>

            <ul className="rk-receipt-items">
              {cart.map((item) => (
                <li key={item.id} className="rk-receipt-item">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="rk-receipt-thumb"
                    />
                  ) : (
                    <span className="rk-receipt-thumb" />
                  )}

                  <span className="rk-receipt-name">
                    {item.name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>

                  <span className="rk-receipt-price">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="rk-receipt-strip">
              <div>
                <dt>Artículos</dt>
                <dd>{cart.reduce((n, item) => n + item.quantity, 0)}</dd>
              </div>
              <div>
                <dt>Entrega</dt>
                <dd>Digital</dd>
              </div>
              <div>
                <dt>Acceso</dt>
                <dd>Inmediato</dd>
              </div>
            </dl>

            {/* Solo importes reales: sin descuentos ni impuestos inventados. */}
            <div className="rk-receipt-rows">
              <div className="rk-receipt-row">
                <span>Subtotal</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <hr className="rk-receipt-cut" />

            <footer className="rk-receipt-foot">
              <div className="rk-receipt-total">
                <span className="rk-receipt-label">Total a pagar</span>
                <strong>
                  <span className="rk-card-currency">S/</span>
                  {total.toFixed(2)}
                </strong>
              </div>

              <button
                type="button"
                onClick={createOrder}
                disabled={loading}
                className="rk-btn rk-btn-buy rk-btn-block"
              >
                {loading ? "Creando pedido..." : "Continuar al pago"}
              </button>
            </footer>
          </article>

          {/*
            El aviso va FUERA del pase: dentro movería la línea
            punteada y las muescas quedarían desalineadas.
          */}
          {error && (
            <div
              role="alert"
              className="rk-upload-error animate-scale-in"
              style={{ margin: 0 }}
            >
              {error}

              {/* Si ya era suyo, el camino es ir a buscarlo. */}
              {yaEraSuyo && (
                <Link
                  href="/mi-cuenta/descargas"
                  className="mt-2 block font-semibold underline underline-offset-4"
                >
                  Ir a mis descargas
                </Link>
              )}
            </div>
          )}

          <span className="rk-pay-safe">
            <Lock aria-hidden />
            Pago protegido
          </span>
        </div>
      </main>
    </>
  );
}
