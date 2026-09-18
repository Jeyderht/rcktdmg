"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import Navbar from "@/components/Navbar";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  async function simulatePayment() {
    if (!orderId) {
      setError("No se encontró el número de pedido.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo procesar el pago de prueba."
        );
      }

      setPaid(true);

      // Limpiamos el carrito después del pago.
      localStorage.removeItem("rcktdmg_cart");

      window.dispatchEvent(new Event("rcktdmg-cart-updated"));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar el pago."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 sm:px-5 py-12 sm:py-20">
        <div className="rounded-[2rem] border bg-surface p-10 text-center shadow-sm">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
              paid
                ? "bg-success text-white"
                : "bg-primary text-onprimary"
            }`}
          >
            {paid ? "✓" : "!"}
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-ink/40">
            RCKTDMG
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            {paid
              ? "Pago realizado correctamente"
              : "Pedido creado correctamente"}
          </h1>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-ink/50">
            {paid
              ? "Tu pedido ha sido pagado y tus productos digitales ya están disponibles para descargar."
              : "Tu pedido ha sido registrado correctamente. Continúa con el pago para acceder a tus productos."}
          </p>

          {orderId ? (
            <div className="mx-auto mt-8 max-w-md rounded-2xl bg-ink/[0.05] p-5">
              <p className="text-xs uppercase tracking-wider text-ink/40">
                Número de pedido
              </p>

              <p className="mt-2 break-all font-mono text-sm">
                {orderId}
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-danger/10 p-5 text-sm text-danger">
              No se encontró el número de pedido.
            </div>
          )}

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          {!paid && orderId && (
            <div className="mx-auto mt-8 max-w-md">
              <button
                type="button"
                onClick={simulatePayment}
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-4 text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Procesando pago..."
                  : "Simular pago de prueba"}
              </button>

              <p className="mt-3 text-xs text-ink/40">
                Modo desarrollo · No se realizará ningún cobro real.
              </p>
            </div>
          )}

          {paid && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-success/25 bg-success/12 p-5">
              <p className="text-sm font-medium text-success">
                ✓ Pago aprobado
              </p>

              <p className="mt-2 text-sm text-success/70">
                Tus descargas han sido habilitadas.
              </p>

              <Link
              href="/mi-cuenta"
                className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-onprimary transition hover:opacity-80"
              >
                Ver mis descargas
              </Link>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/tienda"
              className="rounded-full bg-primary px-6 py-3 text-onprimary transition hover:opacity-80"
            >
              Volver a la tienda
            </Link>

            <Link
              href="/"
              className="rounded-full border px-6 py-3 transition hover:bg-ink/[0.05]"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />

          <main className="mx-auto max-w-3xl px-4 sm:px-5 py-12 sm:py-20">
            <p className="text-ink/50">Cargando...</p>
          </main>
        </>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}