"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Check, CheckCircle2, Clock } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  /*
    Lo resuelve el compilador: en producción es `false` y el
    bloque de prueba desaparece del paquete.
  */
  const EN_DESARROLLO = process.env.NODE_ENV === "development";

  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [demoMethod, setDemoMethod] = useState<"CARD" | "YAPE" | "PAGOEFECTIVO">("CARD");
  const [demoComplete, setDemoComplete] = useState(false);

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

      <main className="mx-auto max-w-xl px-4 py-10 sm:px-5 sm:py-16">
        {/* AVANCE: el pago queda hecho o en curso */}
        <ol className="rk-steps-line mb-7" aria-label="Pasos de la compra">
          <li className="is-done">
            <span className="rk-steps-dot">
              <Check aria-hidden />
            </span>
            Carrito
          </li>

          <li className="is-done">
            <span className="rk-steps-dot">
              <Check aria-hidden />
            </span>
            Confirmar
          </li>

          <li
            className={paid ? "is-done" : "is-current"}
            aria-current={paid ? undefined : "step"}
          >
            <span className="rk-steps-dot">
              {paid ? <Check aria-hidden /> : "3"}
            </span>
            Pago
          </li>
        </ol>

        <div className="rk-done" data-tone={paid ? "success" : "warning"}>
          <span aria-hidden className="rk-done-icon">
            {paid ? <CheckCircle2 /> : <Clock />}
          </span>

          <p className="rk-done-kicker">RcktX</p>

          <h1 className="rk-done-title">
            {paid
              ? "Pago realizado correctamente"
              : "Pedido creado correctamente"}
          </h1>

          <p className="rk-done-text">
            {paid
              ? "Tu pedido ha sido pagado y tus productos digitales ya están disponibles para descargar."
              : "Tu pedido ha sido registrado correctamente. Continúa con el pago para acceder a tus productos."}
          </p>

          {orderId ? (
            <dl className="rk-done-order">
              <dt>Número de pedido</dt>
              <dd>{orderId}</dd>
            </dl>
          ) : (
            <p role="alert" className="rk-upload-error">
              No se encontró el número de pedido.
            </p>
          )}

          {error && (
            <p role="alert" className="rk-upload-error">
              {error}
            </p>
          )}

          {/*
            EL BOTÓN DE PRUEBA SOLO EXISTE EN DESARROLLO.
            `NODE_ENV` lo resuelve el compilador, así que en el
            paquete de producción este bloque ni siquiera viaja.
          */}
          {!paid && orderId && EN_DESARROLLO && (
            <div className="rk-done-actions" style={{ gridTemplateColumns: "1fr" }}>
              <button
                type="button"
                onClick={simulatePayment}
                disabled={loading}
                className="rk-btn rk-btn-buy"
              >
                {loading ? "Procesando pago..." : "Simular pago de prueba"}
              </button>

              <p className="rk-done-dev">
                Solo en desarrollo · No se realizará ningún cobro real.
              </p>
            </div>
          )}

          {/* Vista previa de medios de pago. Nunca cambia el estado del pedido. */}
          {!paid && orderId && !EN_DESARROLLO && (
            <section className="rk-done-note" aria-label="Simulador de métodos de pago">
              <p className="rk-done-note-title">
                <Clock aria-hidden />
                Checkout de demostración
              </p>
              <p className="mb-4">
                Elige cómo pagarías en RcktX. Esta vista no procesa dinero,
                no aprueba pedidos y no habilita descargas.
              </p>
              <div className="grid gap-2" role="group" aria-label="Método de pago simulado">
                {([
                  ["CARD", "Tarjeta de crédito o débito"],
                  ["YAPE", "Yape"],
                  ["PAGOEFECTIVO", "PagoEfectivo"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={demoMethod === value}
                    onClick={() => {
                      setDemoMethod(value);
                      setDemoComplete(false);
                    }}
                    className={`rk-btn ${demoMethod === value ? "rk-btn-primary" : "rk-btn-line"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="rk-btn rk-btn-buy mt-4 w-full"
                onClick={() => setDemoComplete(true)}
              >
                Simular experiencia de pago
              </button>
              {demoComplete && (
                <p role="status" className="mt-3 text-sm">
                  Simulación completada. Tu pedido sigue pendiente; no se
                  realizó ningún cobro. Al conectar Mercado Pago, este paso
                  utilizará su confirmación oficial.
                </p>
              )}
              <Link href="/mi-cuenta/compras" className="rk-btn rk-btn-line mt-3">
                Ver mis pedidos pendientes
              </Link>
            </section>
          )}

          {paid && (
            <div className="rk-done-note">
              <p className="rk-done-note-title">
                <Check aria-hidden />
                Pago aprobado
              </p>

              <p>Tus descargas han sido habilitadas.</p>

              <Link href="/mi-cuenta/descargas" className="rk-btn rk-btn-buy">
                Ver mis descargas
              </Link>
            </div>
          )}

          <div className="rk-done-actions">
            <Link href="/tienda" className="rk-btn rk-btn-primary">
              Volver a la tienda
            </Link>

            <Link href="/" className="rk-btn rk-btn-line">
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

          <main className="mx-auto max-w-xl px-4 py-10 sm:px-5 sm:py-16">
            <div className="rk-skeleton" style={{ height: 420, borderRadius: 30 }} />
          </main>
        </>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}