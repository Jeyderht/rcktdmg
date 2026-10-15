"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";

/**
 * Seguir / dejar de seguir a un creador.
 *
 * El contador llega ya resuelto del servidor, así que el
 * número correcto se ve en el primer pintado y no salta al
 * hidratar. Solo `siguiendo` puede venir en null, que es el
 * caso "no hay sesión": entonces el botón no miente diciendo
 * "Seguir" como si fuera a funcionar —lo hace—, pero al
 * pulsarlo lleva al login y vuelve aquí.
 *
 * Disposición (como la referencia): una línea simple «N
 * seguidores» y debajo una fila centrada de botones de 48 px:
 * Seguir (píldora de tinta; «Siguiendo» en contorno) y lo que
 * llegue en `children` (el botón redondo de cuadrícula). En el
 * propio perfil no hay botón de seguir: queda el recuento y el
 * resto de la fila.
 */
export default function SeguirButton({
  creatorId,
  perfilUrl,
  seguidoresIniciales,
  siguiendoInicial,
  esUnoMismo = false,
  children,
}: {
  creatorId: string;
  /** A dónde volver tras iniciar sesión. */
  perfilUrl: string;
  seguidoresIniciales: number;
  siguiendoInicial: boolean | null;
  esUnoMismo?: boolean;
  /** Botones que acompañan a Seguir en la misma fila. */
  children?: ReactNode;
}) {
  const router = useRouter();

  const [siguiendo, setSiguiendo] = useState(
    siguiendoInicial === true
  );
  const [seguidores, setSeguidores] = useState(seguidoresIniciales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const haySesion = siguiendoInicial !== null;

  useEffect(() => {
    if (!error) return;

    const t = setTimeout(() => setError(""), 3000);

    return () => clearTimeout(t);
  }, [error]);

  async function alternar() {
    if (guardando) return;

    if (!haySesion) {
      router.push(
        `/login?redirect=${encodeURIComponent(perfilUrl)}`
      );
      return;
    }

    const queria = !siguiendo;

    // Optimista: el botón responde al instante y se corrige
    // solo si el servidor dice otra cosa.
    setSiguiendo(queria);
    setSeguidores((n) => Math.max(0, n + (queria ? 1 : -1)));
    setGuardando(true);

    try {
      const respuesta = await fetch("/api/seguidores", {
        method: queria ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });

      if (respuesta.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(perfilUrl)}`
        );
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo completar.");
      }

      // El servidor manda: su cuenta es la buena.
      setSiguiendo(datos.siguiendo);
      setSeguidores(datos.seguidores);
    } catch (fallo) {
      setSiguiendo(!queria);
      setSeguidores((n) => Math.max(0, n + (queria ? -1 : 1)));

      setError(
        fallo instanceof Error ? fallo.message : "No se pudo completar."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rk-seguir">
      <p className="rk-seguir-linea tabular-nums">
        <b>{seguidores}</b> {seguidores === 1 ? "seguidor" : "seguidores"}
      </p>

      <div className="rk-seguir-fila">
        {/* Nadie se sigue a sí mismo: en su perfil no hay botón. */}
        {!esUnoMismo && (
          <button
            type="button"
            onClick={alternar}
            disabled={guardando}
            aria-pressed={haySesion ? siguiendo : undefined}
            data-siguiendo={siguiendo || undefined}
            className="rk-seguir-boton"
          >
            {siguiendo ? (
              <>
                <Check size={16} aria-hidden />
                Siguiendo
              </>
            ) : (
              <>
                <UserPlus size={16} aria-hidden />
                Seguir
              </>
            )}
          </button>
        )}

        {children}
      </div>

      {error && (
        <p
          role="alert"
          className="rk-upload-error absolute left-0 right-0 top-full mt-1 text-center text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
