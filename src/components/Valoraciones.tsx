"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import {
  LARGO_COMENTARIO,
  NOTA_MAXIMA,
  formatearMedia,
  type ResenaVista,
  type ResumenValoracion,
} from "@/lib/resenas-comun";
import { IconoBasura } from "@/components/iconos";

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
      className="rk-star-picker"
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
            className={nota <= mostrado ? "is-on" : undefined}
          >
            <Star strokeWidth={1.75} aria-hidden />
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
      className="rk-stars"
      role="img"
      aria-label={`${valor.toFixed(1).replace(".", ",")} de ${NOTA_MAXIMA}`}
    >
      {Array.from({ length: NOTA_MAXIMA }).map((_, i) => {
        const relleno = Math.max(0, Math.min(1, valor - i));

        return (
          <span
            key={i}
            aria-hidden
            className="rk-star"
            style={{ width: tamano, height: tamano }}
          >
            <Star size={tamano} strokeWidth={1.75} />

            {relleno > 0 && (
              <span
                className="rk-star-fill"
                style={{ width: `${relleno * 100}%` }}
              >
                <Star size={tamano} strokeWidth={1.75} />
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
      <div aria-busy="true" className="mt-6 grid gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rk-skeleton"
            style={{ height: 80, borderRadius: 20 }}
          />
        ))}
      </div>
    );
  }

  if (!datos) {
    return (
      <p role="alert" className="rk-upload-error mt-6">
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
        <div className="rk-rating">
          <div className="rk-rating-score">
            <p className="rk-rating-value rk-text-iris">{media}</p>

            <EstrellasFijas valor={resumen.media ?? 0} tamano={16} />

            <p className="rk-rating-total">
              {resumen.total}{" "}
              {resumen.total === 1 ? "valoración" : "valoraciones"}
            </p>
          </div>

          {/* Reparto por nota: un dato real, no una estimación. */}
          <ul className="rk-rating-bars">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const cuantas = resumen.reparto[n];

              const porcentaje =
                resumen.total > 0 ? (cuantas / resumen.total) * 100 : 0;

              return (
                <li key={n} className="rk-rating-bar">
                  <span className="rk-rating-bar-label">
                    {n}
                    <Star aria-hidden />
                  </span>

                  <span aria-hidden className="rk-rating-track">
                    <span
                      className="rk-rating-fill"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </span>

                  <span>
                    {cuantas}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="rk-review-note">
          Este recurso todavía no tiene valoraciones.
        </p>
      )}

      {/* ══════ FORMULARIO ══════ */}
      {mostrarFormulario ? (
        <form
          onSubmit={enviar}
          className="rk-review-form mt-6"
        >
          <p className="rk-review-form-title">
            {datos.mia ? "Editar tu valoración" : "Escribe tu valoración"}
          </p>

          <div>
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
            className="rk-textarea w-full"
          />

          <div className="rk-review-form-foot">
            <p className="rk-review-count">
              {comentario.length} / {LARGO_COMENTARIO}
            </p>

            <div className="rk-review-form-actions">
              {editando && (
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="rk-btn rk-btn-line"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={!nota || guardando}
                className="rk-btn rk-btn-primary"
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
        <div className="rk-review-form rk-review-mine mt-6">
          <div className="rk-review-mine-head">
            <div className="flex items-center gap-2.5">
              <EstrellasFijas valor={datos.mia.rating} tamano={15} />

              <span className="rk-review-count">Tu valoración</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rk-btn rk-btn-line"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={borrar}
                disabled={guardando}
                aria-label="Eliminar mi valoración"
                className="rk-icon-button-danger"
              >
                <IconoBasura aria-hidden />
              </button>
            </div>
          </div>

          {datos.mia.comment && (
            <p className="rk-review-text" style={{ marginTop: 0 }}>
              {datos.mia.comment}
            </p>
          )}
        </div>
      ) : (
        /* No puede valorar: se explica por qué, sin rodeos. */
        <p className="rk-review-note mt-6">
          {datos.haySesion ? (
            datos.motivo
          ) : (
            <>
              <Link
                href={`/login?redirect=${encodeURIComponent(
                  `/tienda/${productSlug}`
                )}`}
              >
                Inicia sesión
              </Link>{" "}
              para valorar este recurso.
            </>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="rk-upload-error">
          {error}
        </p>
      )}

      {/* ══════ LISTA ══════ */}
      {datos.resenas.length > 0 && (
        <>
          <ul className="rk-reviews mt-6">
            {datos.resenas.map((resena) => (
              <li
                key={resena.id}
                className="rk-review"
              >
                <div className="rk-review-head">
                  <span className="rk-review-avatar">
                    {resena.autor.avatarUrl ? (
                      <Image
                        src={resena.autor.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      resena.autor.nombre.charAt(0).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="rk-review-name">
                      {resena.autor.username ? (
                        <Link href={`/creadores/${resena.autor.username}`}>
                          {resena.autor.nombre}
                        </Link>
                      ) : (
                        resena.autor.nombre
                      )}

                      {resena.esMia && (
                        <span className="rk-review-you">
                          tú
                        </span>
                      )}
                    </p>

                    <p className="rk-review-meta">
                      <EstrellasFijas valor={resena.rating} tamano={12} />
                      {fecha(resena.createdAt)}
                    </p>
                  </div>
                </div>

                {resena.comment && (
                  <p className="rk-review-text">
                    {resena.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {datos.totalPaginas > 1 && (
            <nav
              aria-label="Paginación de valoraciones"
              className="rk-reviews-pager"
            >
              <button
                type="button"
                onClick={() => cargar(datos.pagina - 1)}
                disabled={datos.pagina <= 1}
                aria-label="Página anterior"
                className="rk-btn rk-btn-line rk-btn-icon"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>

              <span>
                {datos.pagina} de {datos.totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => cargar(datos.pagina + 1)}
                disabled={datos.pagina >= datos.totalPaginas}
                aria-label="Página siguiente"
                className="rk-btn rk-btn-line rk-btn-icon"
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
