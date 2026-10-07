"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Isotipo from "@/components/Isotipo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

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
    <main className="rk-auth">
      <div className="rk-auth-inner">
        <Link href="/" className="rk-auth-back">
          <ArrowLeft aria-hidden />
          Volver al inicio
        </Link>

        <div className="rk-auth-brand rk-enter">
          <span className="rk-auth-logo">
            <Isotipo className="h-[38px] w-[38px]" />
          </span>

          {/* h1 para lectores de pantalla: el nombre no se ve. */}
          <h1 className="sr-only">RCKTDMG</h1>

          <p className="rk-auth-tagline">
            Recursos creativos para profesionales
          </p>
        </div>

        <div className="rk-auth-card rk-enter rk-enter-1">
          <nav className="rk-tabs rk-tabs-track" aria-label="Acceso">
            <Link href="/login" className="rk-tab" aria-current="page">
              Iniciar sesión
            </Link>

            <Link href="/registro" className="rk-tab">
              Crear cuenta
            </Link>
          </nav>

          <div>
            <h2 className="rk-auth-title">Bienvenido de nuevo</h2>
            <p className="rk-auth-sub">Accede a tu cuenta de RCKTDMG.</p>
          </div>

          <form onSubmit={handleSubmit} className="rk-auth-form">
            <div className="rk-field">
              <label htmlFor="email" className="rk-label">
                Correo electrónico
              </label>

              <div className="rk-input-group">
                <Mail aria-hidden className="rk-input-icon" />
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
            </div>

            <div className="rk-field">
              <label htmlFor="password" className="rk-label">
                Contraseña
              </label>

              <div className="rk-input-group">
                <Lock aria-hidden className="rk-input-icon" />
                <input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  required
                  className="rk-input"
                />

                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={verPassword}
                  className="rk-input-suffix"
                >
                  {verPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rk-upload-error animate-scale-in" style={{ margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rk-btn rk-btn-primary rk-btn-large"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="rk-auth-foot">© RCKTDMG</p>
      </div>
    </main>
  );
}
