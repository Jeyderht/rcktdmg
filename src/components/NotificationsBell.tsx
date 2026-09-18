"use client";

import Link from "next/link";
import { Bell, BellOff, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

/**
 * Centro de notificaciones.
 *
 * Los elementos vienen de /api/notificaciones y todos se
 * derivan de registros reales de la base de datos: nunca se
 * inventa actividad.
 *
 * Como el esquema todavía no tiene un modelo `Notification`,
 * el estado leído/no leído no puede vivir en el servidor y se
 * guarda por navegador. Al añadir el modelo, basta sustituir
 * estas dos funciones por llamadas a la API.
 */
const READ_STORAGE_KEY = "rcktdmg-notifications-read";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(READ_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    // Se acota para que el almacenamiento no crezca sin fin.
    localStorage.setItem(
      READ_STORAGE_KEY,
      JSON.stringify(ids.slice(-200))
    );
  } catch {
    // Almacenamiento bloqueado: el panel sigue funcionando.
  }
}

const TONE_DOT: Record<NotificationItem["tone"], string> = {
  neutral: "bg-ink/25",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // El panel se renderiza como hoja inferior en móvil y como
  // desplegable anclado a la campana en escritorio.
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");

    function sync() {
      setIsDesktop(query.matches);
    }

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notificaciones", {
        cache: "no-store",
      });

      if (!response.ok) {
        setItems([]);
        return;
      }

      const data = await response.json();

      setItems(data.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cierra con Escape, y al pulsar fuera en escritorio.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;

      const insideBell = containerRef.current?.contains(target);
      const insideSheet = sheetRef.current?.contains(target);

      if (!insideBell && !insideSheet) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // En móvil la hoja cubre la pantalla: se bloquea el scroll
  // del fondo. En escritorio el desplegable no lo bloquea.
  useEffect(() => {
    if (!open || isDesktop) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isDesktop]);

  const unread = items.filter(
    (item) => !dismissed.includes(item.id)
  );

  function markAsRead(id: string) {
    const next = [...new Set([...dismissed, id])];

    setDismissed(next);
    writeDismissed(next);
  }

  function markAllAsRead() {
    const next = [
      ...new Set([...dismissed, ...items.map((item) => item.id)]),
    ];

    setDismissed(next);
    writeDismissed(next);
  }

  /** Contenido compartido por la hoja móvil y el desplegable. */
  const panelBody = (
    <>
      {/* CABECERA */}
      <div className="flex items-center justify-between gap-2 border-b border-ink/[0.07] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">
            Notificaciones
          </h2>

          {unread.length > 0 && (
            <span className="rk-badge rk-badge-danger shrink-0">
              {unread.length}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {unread.length > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rk-press rounded-full px-2.5 py-2 text-[11px] font-medium text-ink/55 hover:bg-ink/[0.06] hover:text-ink"
            >
              Marcar todas
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar notificaciones"
            className="rk-press flex h-9 w-9 items-center justify-center rounded-full text-ink/45 hover:bg-ink/[0.06] hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink/45">
            Cargando...
          </p>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-ink/[0.05]">
              <BellOff size={20} className="text-ink/35" />
            </div>

            <p className="mt-3 text-sm text-ink/45">
              Sin notificaciones
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/[0.07]">
            {items.map((item) => {
              const isUnread = !dismissed.includes(item.id);

              return (
                <li
                  key={item.id}
                  className="group flex items-start gap-2 px-3 py-1 transition-colors hover:bg-ink/[0.04]"
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      markAsRead(item.id);
                      setOpen(false);
                    }}
                    className={`flex min-w-0 flex-1 gap-2.5 rounded-[0.9rem] px-1 py-2.5 ${
                      isUnread ? "" : "opacity-55"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        TONE_DOT[item.tone]
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-5">
                        {item.title}
                      </span>

                      <span className="mt-0.5 block break-words text-xs leading-5 text-ink/50">
                        {item.description}
                      </span>

                      <span className="mt-1 block text-[10px] text-ink/40">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </Link>

                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      aria-label={`Marcar "${item.title}" como leída`}
                      title="Marcar como leída"
                      className="rk-press mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/50 transition-opacity hover:bg-ink/10 hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
  const mobileSheet =
    mounted && open && !isDesktop
      ? createPortal(
          <div className="fixed inset-0 z-[80] sm:hidden">
            {/* FONDO */}
            <button
              type="button"
              aria-label="Cerrar notificaciones"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
            />

            {/* HOJA INFERIOR */}
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Centro de notificaciones"
              className="rk-glass-strong rk-float animate-fade-up absolute inset-x-3 bottom-[calc(var(--rk-dock-h)+env(safe-area-inset-bottom)+0.75rem)] flex max-h-[65vh] flex-col overflow-hidden rounded-[1.5rem]"
            >
              {/* Asa de arrastre */}
              <div
                aria-hidden
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15"
              />

              {panelBody}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);

          if (!open) load();
        }}
        aria-label={
          unread.length > 0
            ? `Notificaciones (${unread.length} sin leer)`
            : "Notificaciones"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
        className={`rk-press relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          open
            ? "bg-ink/[0.08] text-ink"
            : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
        }`}
      >
        <Bell size={18} />

        {unread.length > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-surface/80">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {/* ESCRITORIO: desplegable anclado a la campana */}
      {open && isDesktop && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          className="rk-glass-strong rk-float animate-fade-up absolute right-0 top-[calc(100%+0.6rem)] z-[80] flex max-h-[26rem] w-[22rem] flex-col overflow-hidden rounded-[1.5rem]"
        >
          {panelBody}
        </div>
      )}

      {mobileSheet}
    </div>
  );
}
