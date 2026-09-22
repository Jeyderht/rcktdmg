"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import Footer from "@/components/Footer";
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
        <div className="rk-card p-6 text-center sm:p-10">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-rk-md ${
              paid
                ? "bg-success/12 text-success"
                : "bg-warning/12 text-warning"
            }`}
          >
            {paid ? <CheckCircle2 size={26} /> : <AlertCircle size={26} />}
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-ink/60">
            RCKTDMG
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            {paid
              ? "Pago realizado correctamente"
              : "Pedido creado correctamente"}
          </h1>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-ink/60">
            {paid
              ? "Tu pedido ha sido pagado y tus productos digitales ya están disponibles para descargar."
              : "Tu pedido ha sido registrado correctamente. Continúa con el pago para acceder a tus productos."}
          </p>

          {orderId ? (
            <div className="mx-auto mt-8 max-w-md rounded-rk-md bg-ink/[0.05] p-5">
              <p className="text-xs uppercase tracking-wider text-ink/60">
                Número de pedido
              </p>

              <p className="mt-2 break-all font-mono text-sm">
                {orderId}
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-rk-md bg-danger/10 p-5 text-sm text-danger">
              No se encontró el número de pedido.
            </div>
          )}

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-rk-md bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          {!paid && orderId && (
            <div className="mx-auto mt-8 max-w-md">
              <button
                type="button"
                onClick={simulatePayment}
                disabled={loading}
                className="rk-btn rk-btn-primary w-full"
              >
                {loading
                  ? "Procesando pago..."
                  : "Simular pago de prueba"}
              </button>

              <p className="mt-3 text-xs text-ink/60">
                Modo desarrollo · No se realizará ningún cobro real.
              </p>
            </div>
          )}

          {paid && (
            <div className="mx-auto mt-8 max-w-md rounded-rk-md border border-success/25 bg-success/12 p-5">
              <p className="text-sm font-medium text-success">
                ✓ Pago aprobado
              </p>

              <p className="mt-2 text-sm text-success/70">
                Tus descargas han sido habilitadas.
              </p>

              <Link
              href="/mi-cuenta"
                className="rk-btn rk-btn-primary mt-5"
              >
                Ver mis descargas
              </Link>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/tienda"
              className="rk-btn rk-btn-primary"
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

      <Footer />
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
            <p className="text-ink/60">Cargando...</p>
          </main>
        </>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}