"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
 */
export default function SeguirButton({
  creatorId,
  perfilUrl,
  seguidoresIniciales,
  siguiendoInicial,
  esUnoMismo = false,
}: {
  creatorId: string;
  /** A dónde volver tras iniciar sesión. */
  perfilUrl: string;
  seguidoresIniciales: number;
  siguiendoInicial: boolean | null;
  esUnoMismo?: boolean;
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

  /*
    Nadie se sigue a sí mismo: en su propio perfil no hay
    botón, pero el recuento sí se queda. Es justo el dato que
    un creador quiere ver al abrir su perfil.
  */
  if (esUnoMismo) {
    return (
      <span className="rk-card px-4 py-2 text-sm font-medium tabular-nums">
        {seguidores}{" "}
        <span className="text-ink/60">
          {seguidores === 1 ? "seguidor" : "seguidores"}
        </span>
      </span>
    );
  }

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

  /*
    DISPOSICIÓN

    Móvil: el botón ocupa el ancho y el recuento se apila
    debajo, centrado con el resto de la cabecera.

    Escritorio: los dos en la misma línea —[Seguir] 123
    seguidores—, que es como se lee de un vistazo.

    El recuento va SIEMPRE fuera del botón: dentro cambiaría
    de ancho al pulsarlo y el botón daría un salto.
  */
  return (
    <div className="relative flex w-full flex-col items-center gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={alternar}
        disabled={guardando}
        aria-pressed={haySesion ? siguiendo : undefined}
        className={`rk-btn w-full sm:w-auto ${
          siguiendo ? "rk-btn-line" : "rk-btn-ink"
        } disabled:opacity-60`}
      >
        {siguiendo ? (
          <>
            <Check size={15} aria-hidden />
            Siguiendo
          </>
        ) : (
          <>
            <UserPlus size={15} aria-hidden />
            Seguir
          </>
        )}
      </button>

      <p className="text-[13px] tabular-nums text-ink/55">
        <span className="font-semibold text-ink/80">{seguidores}</span>{" "}
        {seguidores === 1 ? "seguidor" : "seguidores"}
      </p>

      {error && (
        <p
          role="alert"
          className="absolute left-0 right-0 top-full mt-1 text-center text-xs text-danger sm:text-left"
        >
          {error}
        </p>
      )}
    </div>
  );
}
