"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/EmptyState";
import {
  haceCuanto,
  tonoDe,
  type NotificacionVista,
  type TonoNotificacion,
} from "@/lib/notificaciones-comun";

/**
 * Histórico completo de notificaciones.
 *
 * La campana del header enseña las últimas; aquí están todas,
 * paginadas. Mismo origen de datos y mismo estado leído: lo
 * que se marca en un sitio se ve marcado en el otro, porque
 * vive en la base y no en el navegador.
 */

/* Icono de cada tono; el color lo pone rk-notif-item[data-tone]. */
const ICONO_TONO: Record<TonoNotificacion, LucideIcon> = {
  neutral: Bell,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export default function NotificacionesPage() {
  const [items, setItems] = useState<NotificacionVista[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async (p: number) => {
    setCargando(true);

    try {
      const respuesta = await fetch(`/api/notificaciones?page=${p}`, {
        cache: "no-store",
      });

      if (respuesta.status === 401) {
        setSinSesion(true);
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar.");
      }

      setItems(datos.notificaciones ?? []);
      setNoLeidas(datos.noLeidas ?? 0);
      setTotal(datos.total ?? 0);
      setPagina(datos.pagina ?? 1);
      setTotalPaginas(datos.totalPaginas ?? 1);
      setError("");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron cargar las notificaciones."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(1);
  }, [cargar]);

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
    const antes = noLeidas;

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
      setNoLeidas(antes);
    }
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-10">

        {/* CABECERA */}
        <header className="rk-fade-up">
          <p className="rk-kicker">Tu actividad</p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <h1 className="rk-title text-[2rem] sm:text-4xl">
              Notificaciones
            </h1>

            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="rk-btn rk-btn-line"
              >
                <CheckCheck size={15} aria-hidden />
                Marcar todas como leídas
              </button>
            )}
          </div>

          {!cargando && !sinSesion && !error && (
            <p className="mt-3 text-[15px] text-ink/60 tabular-nums">
              {total} en total
              {noLeidas > 0 && ` · ${noLeidas} sin leer`}
            </p>
          )}
        </header>

        <div className="rk-divider mt-6" />

        {sinSesion ? (
          <div className="mt-7">
            <EmptyState
              icon={BellOff}
              title="Inicia sesión para ver tus notificaciones"
              description="Tus avisos se guardan en tu cuenta, así que los verás desde cualquier dispositivo."
              action={{
                href: "/login?redirect=/notificaciones",
                label: "Iniciar sesión",
              }}
            />
          </div>
        ) : error ? (
          <p
            role="alert"
            className="rk-upload-error mt-6"
          >
            {error}
          </p>
        ) : cargando ? (
          <div aria-busy="true" className="mt-6 grid gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rk-skeleton"
                style={{ height: 84, borderRadius: 20 }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              icon={BellOff}
              title="Todavía no tienes notificaciones"
              description="Aquí aparecerán tus compras, descargas y la actividad de tus recursos."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        ) : (
          <>
            <ul className="rk-notif-list rk-notif-page mt-6">
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
                      <span className="rk-notif-item-title">
                        {item.title}
                      </span>

                      {item.body && (
                        <span className="rk-notif-item-body">
                          {item.body}
                        </span>
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
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => marcar(item.id)}
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

            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de notificaciones"
                className="rk-reviews-pager mt-8"
              >
                <button
                  type="button"
                  onClick={() => cargar(pagina - 1)}
                  disabled={pagina <= 1}
                  aria-label="Página anterior"
                  className="rk-btn rk-btn-line rk-btn-icon"
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>

                <span>
                  {pagina} de {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() => cargar(pagina + 1)}
                  disabled={pagina >= totalPaginas}
                  aria-label="Página siguiente"
                  className="rk-btn rk-btn-line rk-btn-icon"
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
