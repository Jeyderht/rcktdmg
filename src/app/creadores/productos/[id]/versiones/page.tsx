"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import Footer from "@/components/Footer";
import VersionesManager from "./VersionesManager";

/**
 * Versiones de un recurso, en el Creator Studio.
 *
 * El acceso a /creadores/productos lo resuelve el middleware;
 * que el recurso sea SUYO lo comprueba la API en cada
 * operación, no esta pantalla.
 */
export default function VersionesPage() {
  const params = useParams();

  const id = String(params.id || "");

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch(
          `/api/creadores/productos/${id}`,
          { cache: "no-store" }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudo cargar el recurso.");
        }

        if (!cancelado) setNombre(datos.product?.name ?? "");
      } catch (fallo) {
        if (!cancelado) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el recurso."
          );
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <Link
          href={`/creadores/productos/${id}`}
          className="rk-press-sm inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink"
        >
          <ChevronLeft size={16} aria-hidden />
          Volver al recurso
        </Link>

        <header className="rk-fade-up mt-2">
          <p className="rk-eyebrow">Creator Studio</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Versiones
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">
            Publica mejoras sin crear otro recurso. Quien ya compró
            descarga siempre la versión vigente, sin pagar de nuevo.
          </p>
        </header>

        <div className="rk-divider mt-7" />

        {error ? (
          <p
            role="alert"
            className="rk-upload-error mt-6"
          >
            {error}
          </p>
        ) : (
          <div className="mt-6">
            <VersionesManager productId={id} productName={nombre} />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
