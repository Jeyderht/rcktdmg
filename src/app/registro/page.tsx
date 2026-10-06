"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

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
    <main className="rk-auth">
      <div className="rk-auth-inner">
        <Link href="/" className="rk-auth-back">
          <ArrowLeft aria-hidden />
          Volver al inicio
        </Link>

        <div className="rk-auth-brand rk-enter">
          <span className="rk-auth-logo">
            <Image
              src="/Isotipo.svg"
              alt=""
              width={240}
              height={240}
              /* Sin pasar por el optimizador: Next rechaza los SVG
                 salvo con dangerouslyAllowSVG. */
              unoptimized
            />
          </span>

          {/* h1 para lectores de pantalla: el nombre no se ve. */}
          <h1 className="sr-only">RCKTDMG</h1>

          <p className="rk-auth-tagline">
            Recursos creativos para profesionales
          </p>
        </div>

        <div className="rk-auth-card rk-enter rk-enter-1">
          <nav className="rk-tabs rk-tabs-track" aria-label="Acceso">
            <Link href="/login" className="rk-tab">
              Iniciar sesión
            </Link>

            <Link href="/registro" className="rk-tab" aria-current="page">
              Crear cuenta
            </Link>
          </nav>

          <div>
            <h2 className="rk-auth-title">Crear cuenta</h2>
            <p className="rk-auth-sub">Únete y empieza a descargar recursos.</p>
          </div>

          <form onSubmit={handleSubmit} className="rk-auth-form">
            <div className="rk-field">
              <label htmlFor="name" className="rk-label">
                Nombre
              </label>

              <div className="rk-input-group">
                <UserRound aria-hidden className="rk-input-icon" />
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
            </div>

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
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={8}
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

              <p className="rk-hint">Usa al menos 8 caracteres.</p>
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
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="rk-auth-foot">© RCKTDMG</p>
      </div>
    </main>
  );
}
