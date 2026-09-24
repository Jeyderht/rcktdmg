"use client";

import Link from "next/link";
import { Bell, BellOff, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  haceCuanto,
  tonoDe,
  type NotificacionVista,
  type TonoNotificacion,
} from "@/lib/notificaciones-comun";

/**
 * Centro de notificaciones.
 *
 * Todo viene de /api/notificaciones, que lee la tabla
 * `Notification`. El estado leído es una columna del servidor:
 * marcar una aquí se ve igual en otro navegador y sobrevive a
 * borrar la caché. Antes vivía en localStorage y no.
 *
 * La campana muestra las más recientes; el histórico completo
 * está en /notificaciones.
 */

const PUNTO_TONO: Record<TonoNotificacion, string> = {
  neutral: "bg-ink/25",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const EN_LA_CAMPANA = 10;

export default function NotificationsBell() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<NotificacionVista[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);

  // El panel es hoja inferior en móvil y desplegable anclado
  // a la campana en escritorio.
  const [esEscritorio, setEsEscritorio] = useState(false);
  const [montado, setMontado] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 640px)");

    function sincronizar() {
      setEsEscritorio(consulta.matches);
    }

    sincronizar();
    consulta.addEventListener("change", sincronizar);

    return () => consulta.removeEventListener("change", sincronizar);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch(
        `/api/notificaciones?pageSize=${EN_LA_CAMPANA}`,
        { cache: "no-store" }
      );

      // 401 = sin sesión. La campana simplemente queda vacía.
      if (!respuesta.ok) {
        setItems([]);
        setNoLeidas(0);
        return;
      }

      const datos = await respuesta.json();

      setItems(datos.notificaciones ?? []);
      setNoLeidas(datos.noLeidas ?? 0);
    } catch {
      setItems([]);
      setNoLeidas(0);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cierra con Escape, y al pulsar fuera en escritorio.
  useEffect(() => {
    if (!abierto) return;

    function alPulsar(evento: MouseEvent) {
      const destino = evento.target as Node;

      const dentroCampana = contenedorRef.current?.contains(destino);
      const dentroHoja = hojaRef.current?.contains(destino);

      if (!dentroCampana && !dentroHoja) setAbierto(false);
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alPulsar);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("mousedown", alPulsar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  // En móvil la hoja cubre la pantalla: se bloquea el scroll
  // del fondo. En escritorio el desplegable no lo bloquea.
  useEffect(() => {
    if (!abierto || esEscritorio) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto, esEscritorio]);

  /**
   * Marca una como leída.
   *
   * Se pinta como leída al instante y se revierte si el
   * servidor falla: pulsar y esperar a la red antes de ver
   * cualquier cambio se siente roto.
   */
  async function marcar(id: string) {
    const item = items.find((n) => n.id === id);

    if (!item || item.readAt) return;

    const ahora = new Date().toISOString();

    setItems((previos) =>
      previos.map((n) => (n.id === id ? { ...n, readAt: ahora } : n))
    );
    setNoLeidas((n) => Math.max(0, n - 1));

    try {
      const respuesta = await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!respuesta.ok) throw new Error();

      const datos = await respuesta.json();

      // El servidor manda: su cuenta es la buena.
      setNoLeidas(datos.noLeidas ?? 0);
    } catch {
      setItems((previos) =>
        previos.map((n) => (n.id === id ? { ...n, readAt: null } : n))
      );
      setNoLeidas((n) => n + 1);
    }
  }

  async function marcarTodas() {
    const previos = items;
    const previasNoLeidas = noLeidas;

    const ahora = new Date().toISOString();

    setItems((lista) =>
      lista.map((n) => (n.readAt ? n : { ...n, readAt: ahora }))
    );
    setNoLeidas(0);

    try {
      const respuesta = await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todas: true }),
      });

      if (!respuesta.ok) throw new Error();
    } catch {
      setItems(previos);
      setNoLeidas(previasNoLeidas);
    }
  }

  /** Contenido compartido por la hoja móvil y el desplegable. */
  const cuerpo = (
    <>
      {/* CABECERA */}
      <div className="flex items-center justify-between gap-2 border-b border-line/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">
            Notificaciones
          </h2>

          {noLeidas > 0 && (
            <span className="rk-badge rk-badge-danger shrink-0 tabular-nums">
              {noLeidas}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="rk-btn rk-btn-ghost !px-2.5 !text-[11px]"
            >
              Marcar todas
            </button>
          )}

          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar notificaciones"
            className="rk-press rk-touch flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {cargando ? (
          <p className="px-4 py-10 text-center text-sm text-ink/60">
            Cargando...
          </p>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div
              aria-hidden
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-md bg-ink/[0.05]"
            >
              <BellOff size={20} className="text-ink/60" />
            </div>

            <p className="mt-3 text-sm text-ink/60">
              Sin notificaciones
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/10">
            {items.map((item) => {
              const sinLeer = item.readAt === null;

              const interior = (
                <>
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      PUNTO_TONO[tonoDe(item.type)]
                    }`}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-5">
                      {item.title}
                    </span>

                    {item.body && (
                      <span className="mt-0.5 block break-words text-xs leading-5 text-ink/60">
                        {item.body}
                      </span>
                    )}

                    <span className="mt-1 block text-[10px] text-ink/60">
                      {haceCuanto(item.createdAt)}
                      {!sinLeer && " · leída"}
                    </span>
                  </span>
                </>
              );

              const clases = `flex min-w-0 flex-1 gap-2.5 rounded-rk-sm px-1 py-2.5 text-left ${
                sinLeer ? "" : "opacity-55"
              }`;

              return (
                <li
                  key={item.id}
                  className="group flex items-start gap-2 px-3 py-1 transition-colors hover:bg-ink/[0.04]"
                >
                  {/*
                    Con destino es un enlace; sin destino, un
                    botón que solo marca. Antes siempre era un
                    enlace, y las que no llevan a ningún sitio
                    navegaban a "".
                  */}
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => {
                        marcar(item.id);
                        setAbierto(false);
                      }}
                      className={clases}
                    >
                      {interior}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => marcar(item.id)}
                      className={clases}
                    >
                      {interior}
                    </button>
                  )}

                  {sinLeer && (
                    <button
                      type="button"
                      onClick={() => marcar(item.id)}
                      aria-label={`Marcar "${item.title}" como leída`}
                      title="Marcar como leída"
                      className="rk-press mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 transition-opacity hover:bg-ink/10 hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Check size={13} aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* PIE */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-line/10 px-4 py-2.5 text-center">
          <Link
            href="/notificaciones"
            onClick={() => setAbierto(false)}
            className="rk-press-sm inline-flex min-h-[2.75rem] items-center px-3 text-[13px] font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Ver todas
          </Link>
        </div>
      )}
    </>
  );

  /*
   * La hoja móvil se monta con un portal en <body>.
   *
   * Es imprescindible: la campana vive dentro del header, que
   * tiene `backdrop-filter`, y un ancestro con backdrop-filter
   * crea un bloque contenedor para los elementos `fixed`. Sin
   * el portal, `fixed` se ancla al header y la tarjeta aparece
   * cortada y fuera de sitio en el móvil.
   */
  const hojaMovil =
    montado && abierto && !esEscritorio
      ? createPortal(
          <div className="fixed inset-0 z-[80] sm:hidden">
            <button
              type="button"
              aria-label="Cerrar notificaciones"
              onClick={() => setAbierto(false)}
              className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
            />

            <div
              ref={hojaRef}
              role="dialog"
              aria-modal="true"
              aria-label="Centro de notificaciones"
              className="rk-glass-strong rk-float animate-fade-up absolute inset-x-3 bottom-[calc(var(--rk-dock-h)+env(safe-area-inset-bottom)+0.75rem)] flex max-h-[65vh] flex-col overflow-hidden rounded-rk-lg"
            >
              <div
                aria-hidden
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15"
              />

              {cuerpo}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setAbierto((valor) => !valor);

          if (!abierto) cargar();
        }}
        aria-label={
          noLeidas > 0
            ? `Notificaciones (${noLeidas} sin leer)`
            : "Notificaciones"
        }
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Notificaciones"
        className={`rk-press relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          abierto
            ? "bg-ink/[0.08] text-ink"
            : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
        }`}
      >
        <Bell size={18} aria-hidden />

        {noLeidas > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-danger-contrast ring-2 ring-surface/80">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* ESCRITORIO: desplegable anclado a la campana */}
      {abierto && esEscritorio && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          className="rk-glass-strong rk-float animate-fade-up absolute right-0 top-[calc(100%+0.6rem)] z-[80] flex max-h-[26rem] w-[22rem] flex-col overflow-hidden rounded-rk-lg"
        >
          {cuerpo}
        </div>
      )}

      {hojaMovil}
    </div>
  );
}
