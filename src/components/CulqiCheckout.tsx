"use client";

import Script from "next/script";
import { useState } from "react";

type Props = {
    orderId: string;
    amount: number;
};

/**
 * Superficie mínima del SDK de Culqi que utilizamos.
 * Se tipa solo lo que se usa, en lugar de `any`.
 */
type CulqiSdk = {
    publicKey: string;
    settings: (options: Record<string, unknown>) => void;
    options: (options: Record<string, unknown>) => void;
    open: () => void;
    close: () => void;
    /** Callback que Culqi invoca al cerrar el formulario. */
    culqi?: () => void;
    token?: { id: string };
    order?: { id: string };
    error?: { user_message?: string; merchant_message?: string };
};

declare global {
    interface Window {
        Culqi?: CulqiSdk;
        culqi?: () => void;
    }
}

export default function CulqiCheckout({
    orderId,
    amount,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [culqiLoaded, setCulqiLoaded] = useState(false);

    function handleCulqi() {
        if (!window.Culqi) {
            setError("Culqi no está disponible.");
            return;
        }

        if (window.Culqi.token) {
            console.log("Token Culqi:", window.Culqi.token);

            window.Culqi.close();

            /*
             * En el siguiente paso enviaremos
             * este token a nuestro backend
             * para realizar el cobro.
             */
            return;
        }

        if (window.Culqi.order) {
            console.log("Orden Culqi:", window.Culqi.order);

            /*
             * Los pagos con Yape y otros medios
             * basados en Order se confirmarán
             * mediante webhook.
             */
            return;
        }

        if (window.Culqi.error) {
            console.error("Error Culqi:", window.Culqi.error);

            setError(
                window.Culqi.error.user_message ||
                    window.Culqi.error.merchant_message ||
                    "Culqi no pudo procesar el pago."
            );
        }
    }

    async function openCheckout() {
        setError("");
        setLoading(true);

        try {
            /*
             * Primero preparamos la orden
             * en nuestro servidor.
             */
            const response = await fetch(
                "/api/payments/culqi",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        orderId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "No se pudo preparar el pago."
                );
            }

            if (!window.Culqi) {
                throw new Error(
                    "Culqi todavía está cargando. Intenta nuevamente."
                );
            }

            const publicKey =
                process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

            if (!publicKey) {
                throw new Error(
                    "Falta NEXT_PUBLIC_CULQI_PUBLIC_KEY en .env."
                );
            }

            /*
             * Configuramos la llave pública.
             */
            window.Culqi.publicKey = publicKey;

            /*
             * Registramos el callback de Culqi.
             */
            window.culqi = handleCulqi;

            window.Culqi.culqi = handleCulqi;

            /*
             * El servidor devuelve el monto real
             * calculado desde nuestra base de datos.
             *
             * Culqi trabaja con céntimos:
             * S/ 25.00 = 2500
             */
            const checkoutAmount =
                Number(data.amount) ||
                Math.round(amount * 100);

            /*
             * Configuramos los datos del Checkout.
             */
            window.Culqi.settings({
                title: "RCKTDMG",
                currency: "PEN",
                amount: checkoutAmount,
                order: data.culqiOrderId,
            });

            /*
             * Activamos los métodos de pago
             * que utilizaremos.
             */
            window.Culqi.options({
                lang: "auto",
                installments: false,
                paymentMethods: {
                    tarjeta: true,
                    yape: true,
                    bancaMovil: false,
                    agente: false,
                    billetera: false,
                    cuotealo: false,
                },
            });

            console.log("Culqi configurado:", {
                orderId,
                culqiOrderId: data.culqiOrderId,
                amount: checkoutAmount,
            });

            /*
             * Abrimos el Checkout.
             */
            window.Culqi.open();
        } catch (err) {
            console.error("Error iniciando Culqi:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo iniciar el pago."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Script
                src="https://checkout.culqi.com/js/v4"
                strategy="afterInteractive"
                onLoad={() => {
                    setCulqiLoaded(true);

                    if (window.Culqi) {
                        window.culqi = handleCulqi;
                        window.Culqi.culqi = handleCulqi;
                    }
                }}
                onError={() => {
                    setError(
                        "No se pudo cargar el sistema de pagos de Culqi."
                    );
                }}
            />

            {error && (
                <div className="rk-upload-error mb-4">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={openCheckout}
                disabled={loading || !culqiLoaded}
                className="rk-btn rk-btn-primary w-full"
            >
                {loading
                    ? "Preparando pago..."
                    : !culqiLoaded
                    ? "Cargando Culqi..."
                    : "Pagar con Culqi / Yape"}
            </button>
        </>
    );
}