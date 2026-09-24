"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
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

const PUNTO_TONO: Record<TonoNotificacion, string> = {
  neutral: "bg-ink/25",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
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
                className="rk-btn rk-btn-line !px-4 !py-2.5 !text-[13px]"
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
            className="mt-6 rounded-rk-sm border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        ) : cargando ? (
          <div aria-busy="true" className="mt-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-rk-sm bg-ink/[0.05]"
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
            <ul className="mt-6 space-y-2">
              {items.map((item) => {
                const sinLeer = item.readAt === null;

                const interior = (
                  <>
                    <span
                      aria-hidden
                      className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                        PUNTO_TONO[tonoDe(item.type)]
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[15px] leading-6 ${
                          sinLeer ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {item.title}
                      </span>

                      {item.body && (
                        <span className="mt-1 block break-words text-sm leading-6 text-ink/60">
                          {item.body}
                        </span>
                      )}

                      <span className="mt-1.5 block text-xs text-ink/45">
                        {haceCuanto(item.createdAt)}
                        {!sinLeer && " · leída"}
                      </span>
                    </span>
                  </>
                );

                const clases = `flex min-w-0 flex-1 items-start gap-3 rounded-rk-sm px-4 py-3.5 text-left transition-colors ${
                  sinLeer
                    ? "bg-ink/[0.03] hover:bg-ink/[0.06]"
                    : "hover:bg-ink/[0.03]"
                }`;

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-rk-sm border border-line/12"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => marcar(item.id)}
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
                        className="rk-press mr-2 mt-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-ink/[0.07] hover:text-ink"
                      >
                        <Check size={16} aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de notificaciones"
                className="mt-8 flex items-center justify-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => cargar(pagina - 1)}
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
                  onClick={() => cargar(pagina + 1)}
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
      </main>

      <Footer />
    </>
  );
}
