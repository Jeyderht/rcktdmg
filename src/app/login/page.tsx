"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        return;
      }

      // Si el usuario llegó desde una página protegida,
      // lo devolvemos a esa página.
      const redirectTo = new URLSearchParams(
        window.location.search
      ).get("redirect");

      // Solo rutas internas: evita redirecciones abiertas
      // del tipo //dominio-externo.com
      if (
        redirectTo &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//")
      ) {
        window.location.href = redirectTo;
        return;
      }

      const role = data?.user?.role;

      window.location.href =
        role === "ADMIN"
          ? "/admin"
          : role === "CREATOR"
          ? "/creadores/panel"
          : "/mi-cuenta";
    } catch (error) {
      console.error("ERROR LOGIN:", error);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-5">
      <div className="w-full max-w-md">

        <Link
          href="/"
          className="rk-press mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <div className="rk-enter mb-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center">
            <Image
              src="/Isotipo.svg"
              alt=""
              width={240}
              height={240}
              /* Sin deformar, y sin pasar por el optimizador:
                 Next rechaza los SVG salvo con dangerouslyAllowSVG. */
              className="h-full w-full object-contain"
              unoptimized
            />
          </span>

          {/*
            El nombre ya no se ve, pero el encabezado se queda:
            es el `h1` de la página y sin él quedaría sin título
            para quien la recorre con un lector de pantalla.
          */}
          <h1 className="sr-only">RCKTDMG</h1>

          <p className="mt-4 text-sm text-ink/60">
            Recursos creativos para profesionales
          </p>
        </div>

        <div className="rk-glass rk-enter rk-enter-1 rounded-rk-lg p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h2>

          <p className="mt-1.5 text-sm text-ink/60">
            Accede a tu cuenta de RCKTDMG.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
                className="rk-input"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                required
                className="rk-input"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="animate-scale-in rounded-rk-sm border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rk-btn rk-btn-primary rk-btn-cta w-full !py-3.5"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-7 border-t border-line/10 pt-6 text-center">
            <p className="text-sm text-ink/60">
              ¿No tienes una cuenta?
            </p>

            <Link
              href="/registro"
              className="rk-btn rk-btn-glass mt-3 w-full !py-3"
            >
              Crear cuenta
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink/60">
          © RCKTDMG
        </p>
      </div>
    </main>
  );
}
