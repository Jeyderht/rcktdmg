"use client";

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
          className="rk-press mb-6 inline-flex items-center gap-1.5 text-sm text-ink/50 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <div className="rk-enter mb-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary text-sm font-bold text-onprimary shadow-rk">
            R
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            RCKTDMG
          </h1>

          <p className="mt-1.5 text-sm text-ink/45">
            Recursos creativos para profesionales
          </p>
        </div>

        <div className="rk-glass rk-enter rk-enter-1 rounded-[1.75rem] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h2>

          <p className="mt-1.5 text-sm text-ink/50">
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
                className="animate-scale-in rounded-[1rem] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rk-btn rk-btn-primary w-full !py-3.5"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-7 border-t border-ink/[0.07] pt-6 text-center">
            <p className="text-sm text-ink/45">
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

        <p className="mt-6 text-center text-xs text-ink/35">
          © RCKTDMG
        </p>
      </div>
    </main>
  );
}
