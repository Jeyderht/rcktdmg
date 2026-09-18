"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoCreadorPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/usuarios/creador", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nombre,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo crear el creador.");
        return;
      }

      router.push("/admin/usuarios");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <Link
            href="/admin/usuarios"
            className="text-sm text-ink/50 hover:text-ink"
          >
            ← Volver a usuarios
          </Link>

          <p className="mt-8 text-sm font-medium uppercase tracking-wider text-ink/40">
            Admin Center
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Crear creador
          </h1>

          <p className="mt-2 text-ink/50">
            Registra un nuevo creador para RCKTDMG.
          </p>
        </div>

        <div className="rk-card p-7 sm:p-8">

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Nombre completo
              </label>

              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
                disabled={loading}
                className="w-full rk-card px-4 py-3 outline-none transition focus:border-accent/45 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Correo electrónico
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creador@rcktdmg.com"
                required
                disabled={loading}
                className="w-full rk-card px-4 py-3 outline-none transition focus:border-accent/45 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Contraseña temporal
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
                disabled={loading}
                className="w-full rk-card px-4 py-3 outline-none transition focus:border-accent/45 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-ink/40">
                El creador podrá cambiar su contraseña posteriormente.
              </p>
            </div>

            <div className="rounded-2xl bg-ink/[0.05] p-4">
              <p className="text-sm font-medium">
                Rol: CREATOR
              </p>

              <p className="mt-1 text-sm text-ink/50">
                Podrá publicar y administrar sus recursos.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

              <Link
                href="/admin/usuarios"
                className="rounded-full border border-ink/10 px-6 py-3 text-center text-sm font-medium transition hover:bg-ink/[0.06]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear creador"}
              </button>

            </div>

          </form>

        </div>
      </div>
    </main>
  );
}