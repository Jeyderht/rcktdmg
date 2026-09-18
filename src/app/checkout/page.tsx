"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, ShoppingBag } from "lucide-react";

import Navbar from "@/components/Navbar";
import { CART_STORAGE_KEY } from "@/components/useCartCount";

type CartItem = {
  id: string;
  name: string;
  price: number;
  slug: string;
  coverUrl: string | null;
  quantity: number;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch {
      setCart([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function createOrder() {
    setError("");

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
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

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
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-ink/[0.05]">
              <ShoppingBag size={24} className="text-ink/35" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              No hay nada que pagar
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/45">
              Agrega un recurso antes de continuar con el pago.
            </p>

            <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
              Ir a la tienda
            </Link>
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
          className="rk-press mb-5 inline-flex items-center gap-1.5 text-sm text-ink/50 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          Volver al carrito
        </Link>

        <div className="rk-enter">
          <p className="rk-eyebrow">Paso final</p>

          <h1 className="mt-2 text-[2rem] font-semibold leading-tight sm:text-4xl">
            Confirmar pedido
          </h1>

          <p className="mt-2 max-w-xl text-sm text-ink/50">
            Revisa tu pedido antes de continuar con el pago.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">

          {/* RESUMEN DE ARTÍCULOS */}
          <div className="rk-enter rk-enter-1 rk-card divide-y divide-ink/[0.07] p-5 sm:p-6">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[0.9rem] bg-gradient-to-br from-ink/[0.04] to-ink/[0.08]">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-ink/25">
                        RK
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] font-medium leading-snug">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-ink/45">
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
            <div className="rk-glass rounded-[1.75rem] p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Total a pagar</h2>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                S/ {total.toFixed(2)}
              </p>

              {error && (
                <div
                  role="alert"
                  className="animate-scale-in mt-5 rounded-[1rem] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
                >
                  {error}
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

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink/40">
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
