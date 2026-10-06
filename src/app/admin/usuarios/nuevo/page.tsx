"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";

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
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">
      <div className="mx-auto w-full max-w-2xl">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up">
          <Link
            href="/admin/usuarios"
            className="rk-auth-back"
          >
            <ChevronLeft size={15} />
            Usuarios
          </Link>

          <p className="rk-eyebrow mt-4">Admin Center</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Crear creador
          </h1>

          <p className="mt-3 text-[15px] leading-7 text-ink/60">
            Registra manualmente una cuenta de creador.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">

          {/* ========== INFORMACIÓN PERSONAL ========== */}
          <section className="rk-fade-up rk-enter-1 rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Paso 1</p>

            <h2 className="rk-title mt-2 text-xl">
              Información personal
            </h2>

            <div className="rk-divider mt-4" />

            <div className="mt-5">
              <label
                htmlFor="nombre"
                className="rk-label mb-2 block"
              >
                Nombre completo
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
                disabled={loading}
                className="rk-input w-full"
              />
            </div>
          </section>

          {/* ========== CUENTA ========== */}
          <section className="rk-fade-up rk-enter-2 rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Paso 2</p>

            <h2 className="rk-title mt-2 text-xl">Cuenta</h2>

            <div className="rk-divider mt-4" />

            <div className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="rk-label mb-2 block"
                >
                  Correo electrónico
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creador@rcktdmg.com"
                  required
                  disabled={loading}
                  className="rk-input w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="rk-label mb-2 block"
                >
                  Contraseña temporal
                </label>

                {/* Mismo campo y mismo tratamiento que antes:
                    se envía tal cual y nunca se muestra. */}
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="rk-input w-full"
                />

                <p className="mt-2 text-xs text-ink/60">
                  El creador podrá cambiarla más adelante.
                </p>
              </div>
            </div>
          </section>

          {/* ========== ROL Y ACCESO ========== */}
          <section className="rk-fade-up rk-enter-3 rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Paso 3</p>

            <h2 className="rk-title mt-2 text-xl">
              Rol y acceso
            </h2>

            <div className="rk-divider mt-4" />

            <div className="mt-5 flex items-start gap-3.5 rounded-rk-md bg-ink/[0.03] p-4">
              <span
                aria-hidden
                className="rk-icon-tile h-10 w-10"
              >
                <ShieldCheck size={18} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Rol</p>

                  <span className="rk-badge rk-badge-accent">
                    CREATOR
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-6 text-ink/60">
                  Podrá entrar al Creator Studio y administrar
                  sus propios recursos.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rk-upload-error rk-fade mt-5"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Link
                href="/admin/usuarios"
                className="rk-btn rk-btn-line"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="rk-btn rk-btn-primary"
              >
                {loading ? "Creando..." : "Crear creador"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
