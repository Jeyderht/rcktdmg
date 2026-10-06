"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Check, CheckCircle2, Clock } from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

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

          <p className="rk-done-kicker">RCKTDMG</p>

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

          {/*
            Sin pasarela conectada se dice lo que de verdad ocurre:
            el pedido queda pendiente.
          */}
          {!paid && orderId && !EN_DESARROLLO && (
            <div className="rk-done-note">
              <p className="rk-done-note-title">
                <Clock aria-hidden />
                Pendiente de pago
              </p>

              <p>
                Tu pedido está guardado con este número. Todavía no hay
                una pasarela de pago conectada, así que el cobro se
                gestiona aparte; en cuanto se registre, tus descargas se
                habilitan solas.
              </p>

              <Link href="/mi-cuenta/compras" className="rk-btn rk-btn-line">
                Ver mis pedidos
              </Link>
            </div>
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