"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BellOff,
  Check,
  CheckCircle2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  haceCuanto,
  tonoDe,
  type NotificacionVista,
  type TonoNotificacion,
} from "@/lib/notificaciones-comun";
import { IconoCampana } from "@/components/iconos";

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

/* Icono de cada tono; el color lo pone rk-notif-item[data-tone]. */
const ICONO_TONO: Record<TonoNotificacion, React.ComponentType<{ size?: number | string; className?: string }>> = {
  neutral: IconoCampana,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
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
      <div className="rk-notif-head">
        <h2 className="rk-notif-title">
          Notificaciones
          {noLeidas > 0 && (
            <span className="rk-badge rk-badge-danger tabular-nums">
              {noLeidas}
            </span>
          )}
        </h2>

        <div className="flex shrink-0 items-center gap-1">
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="rk-notif-link"
            >
              Marcar leídas
            </button>
          )}

          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar notificaciones"
            className="rk-notif-check"
            style={{ margin: 0 }}
          >
            <X aria-hidden />
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="rk-notif-body">
        {cargando ? (
          <div aria-busy="true" className="grid gap-1.5 p-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rk-skeleton"
                style={{ height: 64, borderRadius: 16 }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rk-notif-empty">
            <BellOff aria-hidden />
            Sin notificaciones
          </div>
        ) : (
          <ul className="rk-notif-list">
            {items.map((item) => {
              const sinLeer = item.readAt === null;
              const tono = tonoDe(item.type);
              const Icono = ICONO_TONO[tono];

              const interior = (
                <>
                  <span aria-hidden className="rk-notif-icon">
                    <Icono />
                  </span>

                  <span className="rk-notif-text">
                    <span className="rk-notif-item-title">{item.title}</span>

                    {item.body && (
                      <span className="rk-notif-item-body">{item.body}</span>
                    )}

                    <span className="rk-notif-time">
                      {haceCuanto(item.createdAt)}
                      {!sinLeer && " · leída"}
                    </span>
                  </span>
                </>
              );

              return (
                <li
                  key={item.id}
                  data-tone={tono}
                  className={`rk-notif-item${sinLeer ? " is-unread" : ""}`}
                >
                  {/*
                    Con destino es un enlace; sin destino, un
                    botón que solo marca.
                  */}
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => {
                        marcar(item.id);
                        setAbierto(false);
                      }}
                      className="rk-notif-main"
                    >
                      {interior}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => marcar(item.id)}
                      className="rk-notif-main"
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
                      className="rk-notif-check"
                    >
                      <Check aria-hidden />
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
        <div className="rk-notif-foot">
          <Link href="/notificaciones" onClick={() => setAbierto(false)}>
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
              className="rk-menu rk-menu-sheet rk-notif animate-fade-up absolute inset-x-3 bottom-[calc(var(--rk-dock-h)+env(safe-area-inset-bottom)+0.75rem)]"
            >
              <span aria-hidden className="rk-menu-grabber" />

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
        className="rk-topbar-btn"
      >
        <IconoCampana aria-hidden />

        {noLeidas > 0 && (
          <span className="rk-notif-count">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* ESCRITORIO: desplegable anclado a la campana */}
      {abierto && esEscritorio && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          className="rk-menu rk-notif animate-fade-up absolute right-0 top-[calc(100%+0.75rem)] z-[80]"
        >
          {cuerpo}
        </div>
      )}

      {hojaMovil}
    </div>
  );
}
