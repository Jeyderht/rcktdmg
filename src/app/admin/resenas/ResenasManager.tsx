"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Star,
  Trash2,
} from "lucide-react";

type ResenaAdmin = {
  id: string;
  rating: number;
  comment: string | null;
  status: "PUBLISHED" | "HIDDEN";
  moderationNote: string | null;
  createdAt: string;
  autor: string;
  producto: string;
  productoSlug: string;
};

const FILTROS = [
  { valor: "", etiqueta: "Todas" },
  { valor: "PUBLISHED", etiqueta: "Publicadas" },
  { valor: "HIDDEN", etiqueta: "Ocultas" },
] as const;

/**
 * Moderación de valoraciones.
 *
 * Ocultar retira la reseña de la ficha y de la media en el
 * mismo acto, y avisa a quien la escribió. Eliminar es
 * definitivo y se reserva para lo que no debería existir;
 * para el resto, ocultar es reversible.
 */
export default function ResenasManager() {
  const [resenas, setResenas] = useState<ResenaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [ocultas, setOcultas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtro, setFiltro] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(
    async (p: number, estado: string) => {
      setCargando(true);

      try {
        const respuesta = await fetch(
          `/api/admin/resenas?page=${p}&estado=${estado}`,
          { cache: "no-store" }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudieron cargar.");
        }

        setResenas(datos.resenas ?? []);
        setTotal(datos.total ?? 0);
        setOcultas(datos.ocultas ?? 0);
        setPagina(datos.pagina ?? 1);
        setTotalPaginas(datos.totalPaginas ?? 1);
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
    []
  );

  useEffect(() => {
    cargar(1, filtro);
  }, [cargar, filtro]);

  async function moderar(
    resena: ResenaAdmin,
    estado: "PUBLISHED" | "HIDDEN"
  ) {
    let nota: string | null = null;

    if (estado === "HIDDEN") {
      nota = window.prompt(
        `¿Por qué se oculta esta valoración de ${resena.autor}?\n\nEl motivo queda registrado y NO se muestra en público.`,
        ""
      );

      // Cancelar el diálogo cancela la acción entera.
      if (nota === null) return;
    }

    try {
      const respuesta = await fetch("/api/admin/resenas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resena.id, estado, nota }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error || "No se pudo moderar.");
      }

      await cargar(pagina, filtro);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo moderar."
      );
    }
  }

  async function eliminar(resena: ResenaAdmin) {
    const confirmado = window.confirm(
      `¿Eliminar definitivamente la valoración de ${resena.autor} sobre “${resena.producto}”?\n\nNo se puede deshacer. Si solo quieres retirarla de la ficha, usa "Ocultar".`
    );

    if (!confirmado) return;

    try {
      const respuesta = await fetch("/api/admin/resenas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resena.id }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error || "No se pudo eliminar.");
      }

      await cargar(pagina, filtro);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo eliminar."
      );
    }
  }

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { dateStyle: "medium" });

  return (
    <div>
      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor || "todas"}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rk-chip ${
              filtro === f.valor ? "rk-chip-active" : ""
            }`}
          >
            {f.etiqueta}

            {f.valor === "HIDDEN" && ocultas > 0 && (
              <span className="text-[10px] tabular-nums opacity-70">
                {ocultas}
              </span>
            )}
          </button>
        ))}

        {!cargando && (
          <span className="ml-auto text-sm tabular-nums text-ink/55">
            {total} {total === 1 ? "valoración" : "valoraciones"}
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-rk-sm border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="rk-divider mt-5" />

      {cargando ? (
        <div aria-busy="true" className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-rk-sm bg-ink/[0.05]"
            />
          ))}
        </div>
      ) : resenas.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/60">
          {filtro === "HIDDEN"
            ? "No hay valoraciones ocultas."
            : "Todavía no hay valoraciones."}
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-2">
            {resenas.map((resena) => {
              const oculta = resena.status === "HIDDEN";

              return (
                <li
                  key={resena.id}
                  className={`rounded-rk-sm border px-4 py-3.5 ${
                    oculta
                      ? "border-warning/30 bg-warning/[0.04]"
                      : "border-line/12"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                          <Star
                            size={13}
                            aria-hidden
                            className="fill-ink text-ink"
                          />
                          {resena.rating}
                        </span>

                        <span className="text-ink/45">·</span>

                        <span className="truncate font-medium">
                          {resena.autor}
                        </span>

                        <span className="text-ink/45">en</span>

                        <Link
                          href={`/tienda/${resena.productoSlug}`}
                          className="truncate underline underline-offset-4 hover:opacity-70"
                        >
                          {resena.producto}
                        </Link>

                        {oculta && (
                          <span className="rk-badge rk-badge-warning shrink-0">
                            Oculta
                          </span>
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-ink/45">
                        {fecha(resena.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          moderar(
                            resena,
                            oculta ? "PUBLISHED" : "HIDDEN"
                          )
                        }
                        aria-label={
                          oculta
                            ? "Volver a publicar"
                            : "Ocultar valoración"
                        }
                        title={
                          oculta
                            ? "Volver a publicar"
                            : "Ocultar valoración"
                        }
                        className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                      >
                        {oculta ? (
                          <Eye size={16} aria-hidden />
                        ) : (
                          <EyeOff size={16} aria-hidden />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminar(resena)}
                        aria-label="Eliminar valoración"
                        title="Eliminar definitivamente"
                        className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {resena.comment && (
                    <p className="mt-2.5 whitespace-pre-line break-words text-sm leading-6 text-ink/70">
                      {resena.comment}
                    </p>
                  )}

                  {/* Motivo interno: nunca sale de este panel. */}
                  {oculta && resena.moderationNote && (
                    <p className="mt-2.5 border-t border-line/10 pt-2.5 text-xs leading-5 text-ink/50">
                      <span className="font-medium">Motivo interno:</span>{" "}
                      {resena.moderationNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {totalPaginas > 1 && (
            <nav
              aria-label="Paginación de valoraciones"
              className="mt-8 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => cargar(pagina - 1, filtro)}
                disabled={pagina <= 1}
                aria-label="Página anterior"
                className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>

              <span className="px-2 text-sm tabular-nums text-ink/60">
                {pagina} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => cargar(pagina + 1, filtro)}
                disabled={pagina >= totalPaginas}
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
