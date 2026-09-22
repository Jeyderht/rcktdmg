"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo crear la cuenta.");
        return;
      }

      router.push(data.redirect);
      router.refresh();
    } catch {
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
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-sm bg-primary text-sm font-bold text-onprimary shadow-rk">
            R
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            RCKTDMG
          </h1>

          <p className="mt-1.5 text-sm text-ink/60">
            Recursos creativos para profesionales
          </p>
        </div>

        <div className="rk-glass rk-enter rk-enter-1 rounded-rk-lg p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Crear cuenta
          </h2>

          <p className="mt-1.5 text-sm text-ink/60">
            Únete y empieza a descargar recursos.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Nombre
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                required
                className="rk-input"
              />
            </div>

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
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
                className="rk-input"
              />

              <p className="mt-2 text-xs text-ink/60">
                Usa al menos 8 caracteres.
              </p>
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
              className="rk-btn rk-btn-primary w-full !py-3.5"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-7 border-t border-line/10 pt-6 text-center">
            <p className="text-sm text-ink/60">
              ¿Ya tienes una cuenta?
            </p>

            <Link
              href="/login"
              className="rk-btn rk-btn-glass mt-3 w-full !py-3"
            >
              Iniciar sesión
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
