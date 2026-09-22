"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Settings,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { SessionUser } from "@/components/useSessionUser";

/**
 * Menú de cuenta.
 *
 * En móvil abre una hoja inferior; en escritorio, un
 * desplegable anclado al avatar.
 *
 * Igual que el centro de notificaciones, la hoja móvil se
 * monta con un portal en <body>: el header tiene
 * `backdrop-filter` y eso crea un bloque contenedor para los
 * elementos `fixed`, así que sin portal la tarjeta se
 * anclaría al header en lugar de a la pantalla.
 */
export default function AccountMenu({
  user,
  loading,
}: {
  user: SessionUser | null;
  loading: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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

  // Cierra con Escape o al pulsar fuera.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !containerRef.current?.contains(target) &&
        !sheetRef.current?.contains(target)
      ) {
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

  // En móvil la hoja cubre la pantalla: se bloquea el fondo.
  useEffect(() => {
    if (!open || isDesktop) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isDesktop]);

  /** Cierra la sesión con el endpoint real. */
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });

      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  const displayName = user?.publicName || user?.name || "";
  const initials = (displayName || user?.email || "R")
    .charAt(0)
    .toUpperCase();

  const menuBody = user ? (
    <>
      {/* IDENTIDAD */}
      <div className="flex items-center gap-3 rk-divider-b px-4 py-4">
        <span className="rk-media relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-rk-sm text-sm font-semibold text-ink/70">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={displayName || "Avatar"}
              fill
              className="object-cover"
              sizes="44px"
            />
          ) : (
            initials
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">
            {displayName || "Mi cuenta"}
          </span>

          <span className="block truncate text-[11px] text-ink/60">
            {user.email}
          </span>
        </span>
      </div>

      {/* OPCIONES */}
      <div className="p-2">
        <Link
          href="/mi-cuenta"
          onClick={() => setOpen(false)}
          className="rk-press flex items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-ink/[0.05]"
        >
          <UserRound size={15} className="shrink-0 text-ink/60" />
          Ver perfil
        </Link>

        <Link
          href="/mi-cuenta"
          onClick={() => setOpen(false)}
          className="rk-press flex items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-ink/[0.05]"
        >
          <Settings size={15} className="shrink-0 text-ink/60" />
          Ajustes
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="rk-press flex w-full items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut size={15} className="shrink-0" />
          Salir
        </button>
      </div>
    </>
  ) : (
    <>
      <div className="rk-divider-b px-4 py-4">
        <p className="text-[13px] font-semibold">Mi cuenta</p>

        <p className="mt-0.5 text-[11px] text-ink/60">
          Accede para comprar y descargar recursos.
        </p>
      </div>

      <div className="p-2">
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          className="rk-press flex items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-ink/[0.05]"
        >
          <LogIn size={15} className="shrink-0 text-ink/60" />
          Iniciar sesión
        </Link>

        <Link
          href="/registro"
          onClick={() => setOpen(false)}
          className="rk-press flex items-center gap-2.5 rounded-rk-sm px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-ink/[0.05]"
        >
          <UserPlus size={15} className="shrink-0 text-ink/60" />
          Crear cuenta
        </Link>
      </div>
    </>
  );

  const mobileSheet =
    mounted && open && !isDesktop
      ? createPortal(
          <div className="fixed inset-0 z-[80] sm:hidden">
            <button
              type="button"
              aria-label="Cerrar menú de cuenta"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
            />

            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de cuenta"
              className="rk-glass-strong rk-float animate-fade-up absolute inset-x-3 bottom-[calc(var(--rk-dock-h)+env(safe-area-inset-bottom)+0.75rem)] max-h-[70vh] overflow-y-auto overscroll-contain rounded-rk-lg"
            >
              <div
                aria-hidden
                className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/15"
              />

              {menuBody}
            </div>
          </div>,
          document.body
        )
      : null;

  if (loading) {
    return (
      <div
        aria-hidden
        className="h-10 w-10 animate-pulse rounded-full bg-ink/[0.06]"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mi cuenta"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Mi cuenta"
        className={`rk-press relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-colors ${
          open
            ? "bg-ink/[0.08] text-ink"
            : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
        }`}
      >
        {user?.avatarUrl ? (
          <span className="rk-media relative block h-8 w-8 overflow-hidden rounded-full">
            <Image
              src={user.avatarUrl}
              alt={displayName || "Mi cuenta"}
              fill
              className="object-cover"
              sizes="32px"
            />
          </span>
        ) : (
          <UserRound size={18} />
        )}
      </button>

      {/* ESCRITORIO: desplegable anclado */}
      {open && isDesktop && (
        <div
          role="dialog"
          aria-label="Menú de cuenta"
          className="rk-glass-strong rk-float animate-fade-up absolute right-0 top-[calc(100%+0.6rem)] z-[80] w-64 overflow-hidden rounded-rk-md"
        >
          {menuBody}
        </div>
      )}

      {mobileSheet}
    </div>
  );
}
