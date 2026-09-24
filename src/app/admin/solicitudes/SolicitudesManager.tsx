"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  FileDown,
  Inbox,
  Loader2,
  X,
} from "lucide-react";

import EmptyState from "@/components/EmptyState";
import {
  ETIQUETA_ESTADO_SOLICITUD,
  LARGO_MOTIVO_RECHAZO,
  type EstadoSolicitud,
  type SolicitudVista,
} from "@/lib/solicitudes-comun";

type Recuento = {
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
};

const FILTROS = [
  { valor: "PENDING", etiqueta: "Pendientes" },
  { valor: "APPROVED", etiqueta: "Aprobadas" },
  { valor: "REJECTED", etiqueta: "Rechazadas" },
  { valor: "", etiqueta: "Todas" },
] as const;

const TONO: Record<EstadoSolicitud, string> = {
  PENDING: "rk-badge-warning",
  APPROVED: "rk-badge-success",
  REJECTED: "rk-badge-danger",
};

/**
 * Cola de solicitudes de creador.
 *
 * Aprobar convierte al usuario en CREATOR; rechazar exige un
 * motivo. Las dos decisiones las toma el servidor: aquí solo
 * se envía la acción, nunca el estado resultante.
 */
export default function SolicitudesManager() {
  const [solicitudes, setSolicitudes] = useState<SolicitudVista[]>([]);
  const [recuento, setRecuento] = useState<Recuento | null>(null);
  const [filtro, setFiltro] = useState<string>("PENDING");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(
        `/api/admin/solicitudes${filtro ? `?estado=${filtro}` : ""}`,
        { cache: "no-store" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar.");
      }

      setSolicitudes(datos.solicitudes);
      setRecuento(datos.recuento);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudieron cargar."
      );
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function decidir(
    id: string,
    accion: "aprobar" | "rechazar",
    motivoTexto?: string
  ) {
    if (enCurso) return;

    setEnCurso(id);
    setError("");

    try {
      const respuesta = await fetch(`/api/admin/solicitudes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, motivo: motivoTexto }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo completar.");
      }

      setRechazando(null);
      setMotivo("");

      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo completar."
      );
    } finally {
      setEnCurso(null);
    }
  }

  return (
    <div>
      {/* ══════════ RECUENTO ══════════ */}
      {recuento && (
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ["Pendientes", recuento.pendientes],
              ["Aprobadas", recuento.aprobadas],
              ["Rechazadas", recuento.rechazadas],
            ] as const
          ).map(([etiqueta, valor]) => (
            <div key={etiqueta} className="rk-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                {etiqueta}
              </p>

              <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                {valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ FILTROS ══════════ */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rk-press-sm inline-flex min-h-[2.75rem] items-center rounded-full border px-4 text-sm transition-colors duration-fast ${
              filtro === f.valor
                ? "border-ink bg-ink text-surface"
                : "border-line/15 hover:border-ink/40"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {/* ══════════ LISTA ══════════ */}
      {cargando ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-ink/55">
          <Loader2 size={15} aria-hidden className="animate-spin" />
          Cargando solicitudes…
        </p>
      ) : solicitudes.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Inbox}
            title="No hay solicitudes"
            description="Cuando alguien pida ser creador, aparecerá aquí."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {solicitudes.map((s) => (
            <li key={s.id} className="rk-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rk-media relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {s.solicitante.avatarUrl ? (
                      <Image
                        src={s.solicitante.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-ink/55">
                        {s.publicName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">
                      {s.publicName}
                    </p>

                    <p className="truncate text-[13px] text-ink/55">
                      @{s.username} · {s.solicitante.email}
                    </p>

                    <p className="mt-1 truncate text-[13px] text-ink/60">
                      {s.specialty}
                    </p>
                  </div>
                </div>

                <span className={`rk-badge ${TONO[s.estado]}`}>
                  {ETIQUETA_ESTADO_SOLICITUD[s.estado]}
                </span>
              </div>

              <p className="mt-4 whitespace-pre-line text-[14px] leading-6 text-ink/70">
                {s.bio}
              </p>

              {s.categorias.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {s.categorias.map((c) => (
                    <li key={c.id} className="rk-badge rk-badge-neutral">
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}

              {/* ══════════ PORTAFOLIO ══════════ */}
              <div className="mt-4 flex flex-wrap gap-2">
                {s.portfolioUrl && (
                  <a
                    href={s.portfolioUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rk-chip"
                  >
                    <ExternalLink size={14} aria-hidden />
                    Ver portafolio
                  </a>
                )}

                {s.tieneArchivo && (
                  <a
                    href={`/api/admin/solicitudes/${s.id}/portafolio`}
                    className="rk-chip"
                  >
                    <FileDown size={14} aria-hidden />
                    Descargar archivo
                  </a>
                )}

                {[
                  ["Sitio", s.websiteUrl],
                  ["Instagram", s.instagramUrl],
                  ["Facebook", s.facebookUrl],
                  ["TikTok", s.tiktokUrl],
                ]
                  .filter(([, url]) => Boolean(url))
                  .map(([etiqueta, url]) => (
                    <a
                      key={etiqueta}
                      href={url as string}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rk-chip"
                    >
                      {etiqueta}
                    </a>
                  ))}
              </div>

              {s.rejectionReason && (
                <p className="mt-4 rounded-rk-sm border border-danger/25 bg-danger/[0.05] p-3 text-[13px] leading-6">
                  <strong>Motivo del rechazo:</strong>{" "}
                  {s.rejectionReason}
                </p>
              )}

              {/* ══════════ DECISIÓN ══════════ */}
              {s.estado === "PENDING" && (
                <div className="mt-5 border-t border-line/10 pt-4">
                  {rechazando === s.id ? (
                    <div>
                      <label
                        htmlFor={`motivo-${s.id}`}
                        className="text-sm font-medium"
                      >
                        Motivo del rechazo
                      </label>

                      <textarea
                        id={`motivo-${s.id}`}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        maxLength={LARGO_MOTIVO_RECHAZO}
                        rows={3}
                        placeholder="Qué tiene que corregir para volver a intentarlo."
                        className="rk-textarea mt-1.5 w-full"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={enCurso === s.id || motivo.trim().length < 10}
                          onClick={() => decidir(s.id, "rechazar", motivo)}
                          className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-60"
                        >
                          Confirmar rechazo
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRechazando(null);
                            setMotivo("");
                          }}
                          className="rk-btn rk-btn-line !px-5 !py-2.5 !text-[13px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={enCurso === s.id}
                        onClick={() => decidir(s.id, "aprobar")}
                        className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-60"
                      >
                        {enCurso === s.id ? (
                          <Loader2
                            size={15}
                            aria-hidden
                            className="animate-spin"
                          />
                        ) : (
                          <Check size={15} aria-hidden />
                        )}
                        Aprobar
                      </button>

                      <button
                        type="button"
                        disabled={enCurso === s.id}
                        onClick={() => setRechazando(s.id)}
                        className="rk-btn rk-btn-line !px-5 !py-2.5 !text-[13px] disabled:opacity-60"
                      >
                        <X size={15} aria-hidden />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
