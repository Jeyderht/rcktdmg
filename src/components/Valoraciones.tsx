"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
} from "lucide-react";

import {
  LARGO_COMENTARIO,
  NOTA_MAXIMA,
  formatearMedia,
  type ResenaVista,
  type ResumenValoracion,
} from "@/lib/resenas-comun";

/**
 * Valoraciones de un recurso.
 *
 * Todo lo que se ve sale de la base: si no hay reseñas, se
 * dice que no las hay. Nunca se inventa una media ni un
 * número de opiniones.
 *
 * El formulario solo aparece si el servidor confirma que este
 * visitante puede valorar; y aunque alguien lo forzara, la
 * comprobación real vuelve a hacerse al guardar.
 */

type Datos = {
  resenas: ResenaVista[];
  resumen: ResumenValoracion;
  pagina: number;
  totalPaginas: number;
  mia: ResenaVista | null;
  puedoValorar: boolean;
  motivo: string | null;
  haySesion: boolean;
};

/** Estrellas pulsables para elegir la nota. */
function SelectorEstrellas({
  valor,
  onChange,
  disabled,
}: {
  valor: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [encima, setEncima] = useState(0);

  const mostrado = encima || valor;

  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setEncima(0)}
    >
      {Array.from({ length: NOTA_MAXIMA }).map((_, i) => {
        const nota = i + 1;

        return (
          <button
            key={nota}
            type="button"
            disabled={disabled}
            onClick={() => onChange(nota)}
            onMouseEnter={() => setEncima(nota)}
            aria-label={`${nota} ${nota === 1 ? "estrella" : "estrellas"}`}
            aria-pressed={valor === nota}
            className="rk-press flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-50"
          >
            <Star
              size={22}
              strokeWidth={1.75}
              className={
                nota <= mostrado
                  ? "fill-ink text-ink"
                  : "text-ink/25"
              }
            />
          </button>
        );
      })}
    </div>
  );
}

/** Estrellas de solo lectura, versión cliente. */
function EstrellasFijas({
  valor,
  tamano = 14,
}: {
  valor: number;
  tamano?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${valor.toFixed(1).replace(".", ",")} de ${NOTA_MAXIMA}`}
    >
      {Array.from({ length: NOTA_MAXIMA }).map((_, i) => {
        const relleno = Math.max(0, Math.min(1, valor - i));

        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-flex shrink-0"
            style={{ width: tamano, height: tamano }}
          >
            <Star
              size={tamano}
              strokeWidth={1.75}
              className="absolute inset-0 text-ink/20"
            />

            {relleno > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${relleno * 100}%` }}
              >
                <Star
                  size={tamano}
                  strokeWidth={1.75}
                  className="fill-ink text-ink"
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export default function Valoraciones({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(
    async (pagina: number) => {
      try {
        const respuesta = await fetch(
          `/api/resenas?productId=${encodeURIComponent(
            productId
          )}&page=${pagina}`,
          { cache: "no-store" }
        );

        const json = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(json.error || "No se pudieron cargar.");
        }

        setDatos(json);
        setError("");
      } catch (fallo) {
        setError(
          fallo instanceof Error
            ? fallo.message
            : "No se pudieron cargar las valoraciones."
        );
      } finally {
        setCargando(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    cargar(1);
  }, [cargar]);

  // Al abrir el formulario se precarga la reseña propia.
  useEffect(() => {
    if (datos?.mia) {
      setNota(datos.mia.rating);
      setComentario(datos.mia.comment ?? "");
    }
  }, [datos?.mia]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    if (!nota || guardando) return;

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: nota, comment: comentario }),
      });

      const json = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(json.error || "No se pudo guardar.");
      }

      setDatos((previo) => (previo ? { ...previo, ...json } : previo));
      setEditando(false);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo guardar."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (
      !window.confirm(
        "¿Eliminar tu valoración? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch("/api/resenas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const json = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(json.error || "No se pudo eliminar.");
      }

      setDatos((previo) => (previo ? { ...previo, ...json } : previo));
      setNota(0);
      setComentario("");
      setEditando(false);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo eliminar."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div aria-busy="true" className="mt-6 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-rk-sm bg-ink/[0.05]"
          />
        ))}
      </div>
    );
  }

  if (!datos) {
    return (
      <p role="alert" className="mt-6 text-sm text-danger">
        {error || "No se pudieron cargar las valoraciones."}
      </p>
    );
  }

  const { resumen } = datos;

  const media = formatearMedia(resumen.media);

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { dateStyle: "medium" });

  const mostrarFormulario =
    datos.puedoValorar && (editando || !datos.mia);

  return (
    <div className="mt-6">
      {/* ══════ RESUMEN ══════ */}
      {resumen.total > 0 ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="shrink-0">
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {media}
            </p>

            <div className="mt-1.5">
              <EstrellasFijas valor={resumen.media ?? 0} tamano={15} />
            </div>

            <p className="mt-1.5 text-sm text-ink/60 tabular-nums">
              {resumen.total}{" "}
              {resumen.total === 1 ? "valoración" : "valoraciones"}
            </p>
          </div>

          {/* Reparto por nota: un dato real, no una estimación. */}
          <ul className="min-w-0 flex-1 space-y-1">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const cuantas = resumen.reparto[n];

              const porcentaje =
                resumen.total > 0 ? (cuantas / resumen.total) * 100 : 0;

              return (
                <li key={n} className="flex items-center gap-2.5">
                  <span className="w-3 shrink-0 text-xs tabular-nums text-ink/60">
                    {n}
                  </span>

                  <span
                    aria-hidden
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.08]"
                  >
                    <span
                      className="block h-full rounded-full bg-ink/70"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </span>

                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink/50">
                    {cuantas}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-[15px] leading-7 text-ink/60">
          Este recurso todavía no tiene valoraciones.
        </p>
      )}

      {/* ══════ FORMULARIO ══════ */}
      {mostrarFormulario ? (
        <form
          onSubmit={enviar}
          className="rk-tile mt-7 p-5 sm:p-6"
        >
          <p className="rk-kicker">
            {datos.mia ? "Editar tu valoración" : "Escribe tu valoración"}
          </p>

          <div className="mt-3">
            <SelectorEstrellas
              valor={nota}
              onChange={setNota}
              disabled={guardando}
            />
          </div>

          <label htmlFor="comentario" className="sr-only">
            Comentario
          </label>

          <textarea
            id="comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={LARGO_COMENTARIO}
            rows={4}
            disabled={guardando}
            placeholder="¿Qué te ha parecido? (opcional)"
            className="rk-textarea mt-4 w-full"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs tabular-nums text-ink/45">
              {comentario.length} / {LARGO_COMENTARIO}
            </p>

            <div className="flex flex-wrap gap-2">
              {editando && (
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="rk-btn rk-btn-line !px-4 !py-2.5 !text-[13px]"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={!nota || guardando}
                className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-50"
              >
                {guardando
                  ? "Guardando…"
                  : datos.mia
                    ? "Guardar cambios"
                    : "Publicar valoración"}
              </button>
            </div>
          </div>
        </form>
      ) : datos.mia ? (
        /* Ya valoró: se le ofrece editar o eliminar. */
        <div className="rk-tile mt-7 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <EstrellasFijas valor={datos.mia.rating} tamano={15} />

              <span className="text-sm text-ink/60">Tu valoración</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rk-btn rk-btn-line !px-4 !py-2.5 !text-[13px]"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={borrar}
                disabled={guardando}
                aria-label="Eliminar mi valoración"
                className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 !py-2.5 disabled:opacity-50"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          </div>

          {datos.mia.comment && (
            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-ink/70">
              {datos.mia.comment}
            </p>
          )}
        </div>
      ) : (
        /* No puede valorar: se explica por qué, sin rodeos. */
        <p className="mt-7 rounded-rk-sm border border-line/12 px-4 py-3.5 text-sm leading-6 text-ink/60">
          {datos.haySesion ? (
            datos.motivo
          ) : (
            <>
              <Link
                href={`/login?redirect=${encodeURIComponent(
                  `/tienda/${productSlug}`
                )}`}
                className="font-medium text-ink underline underline-offset-4"
              >
                Inicia sesión
              </Link>{" "}
              para valorar este recurso.
            </>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/* ══════ LISTA ══════ */}
      {datos.resenas.length > 0 && (
        <>
          <ul className="mt-8 space-y-5">
            {datos.resenas.map((resena) => (
              <li
                key={resena.id}
                className="border-t border-line/10 pt-5 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center gap-3">
                  <span className="rk-media relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {resena.autor.avatarUrl ? (
                      <Image
                        src={resena.autor.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-ink/55">
                        {resena.autor.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {resena.autor.username ? (
                        <Link
                          href={`/creadores/${resena.autor.username}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {resena.autor.nombre}
                        </Link>
                      ) : (
                        resena.autor.nombre
                      )}

                      {resena.esMia && (
                        <span className="ml-2 text-xs font-normal text-ink/45">
                          tú
                        </span>
                      )}
                    </p>

                    <p className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">
                      <EstrellasFijas valor={resena.rating} tamano={12} />
                      {fecha(resena.createdAt)}
                    </p>
                  </div>
                </div>

                {resena.comment && (
                  <p className="mt-2.5 whitespace-pre-line text-[15px] leading-7 text-ink/70">
                    {resena.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {datos.totalPaginas > 1 && (
            <nav
              aria-label="Paginación de valoraciones"
              className="mt-7 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => cargar(datos.pagina - 1)}
                disabled={datos.pagina <= 1}
                aria-label="Página anterior"
                className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>

              <span className="px-2 text-sm tabular-nums text-ink/60">
                {datos.pagina} de {datos.totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => cargar(datos.pagina + 1)}
                disabled={datos.pagina >= datos.totalPaginas}
                aria-label="Página siguiente"
                className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 disabled:opacity-40"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
