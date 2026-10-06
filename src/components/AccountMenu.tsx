"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Settings,
  ShoppingBag,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/components/ThemeProvider";
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
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === "dark";

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

  /* Interruptor de tema: lo comparten las dos variantes del menú. */
  const themeRow = (
    <div className="rk-menu-group">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={() => setPreference(isDark ? "light" : "dark")}
        className="rk-menu-item"
      >
        <Moon aria-hidden />
        Modo oscuro
        <span aria-hidden className="rk-menu-switch" />
      </button>
    </div>
  );

  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN";

  const menuBody = user ? (
    <>
      {/* IDENTIDAD */}
      <div className="rk-menu-head">
        <span className="rk-avatar-btn-img">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={displayName || "Avatar"}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            initials
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="rk-menu-name">{displayName || "Mi cuenta"}</span>
          <span className="rk-menu-email">{user.email}</span>
        </span>
      </div>

      {/*
        Banner destacado. Solo a quien AÚN no puede publicar:
        a un creador o a un administrador no le dice nada.
      */}
      {!isCreator && (
        <Link
          href="/creadores/unete"
          onClick={() => setOpen(false)}
          className="rk-menu-promo"
        >
          <Crown aria-hidden />
          Hazte creador
          <span className="rk-menu-promo-pill">Únete</span>
        </Link>
      )}

      <nav className="rk-menu-list" aria-label="Opciones de cuenta">
        <div className="rk-menu-group">
          <Link
            href="/mi-cuenta"
            onClick={() => setOpen(false)}
            className="rk-menu-item"
          >
            <UserRound aria-hidden />
            Ver perfil
          </Link>

          <Link
            href="/mi-cuenta/compras"
            onClick={() => setOpen(false)}
            className="rk-menu-item"
          >
            <ShoppingBag aria-hidden />
            Mis compras
          </Link>

          {isCreator && (
            <Link
              href="/creadores/panel"
              onClick={() => setOpen(false)}
              className="rk-menu-item"
            >
              <LayoutDashboard aria-hidden />
              Panel de creador
            </Link>
          )}

          <Link
            href="/mi-cuenta"
            onClick={() => setOpen(false)}
            className="rk-menu-item"
          >
            <Settings aria-hidden />
            Ajustes
          </Link>
        </div>

        {themeRow}

        <hr className="rk-menu-sep" />

        <button
          type="button"
          onClick={handleLogout}
          className="rk-menu-item rk-menu-item-danger"
        >
          <LogOut aria-hidden />
          Cerrar sesión
        </button>
      </nav>
    </>
  ) : (
    <>
      <div className="rk-menu-head" style={{ display: "block" }}>
        <p className="rk-menu-name">Mi cuenta</p>
        <p className="rk-menu-text">
          Accede para comprar y descargar recursos.
        </p>
      </div>

      <nav className="rk-menu-list" aria-label="Opciones de cuenta">
        <div className="rk-menu-group">
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="rk-menu-item"
          >
            <LogIn aria-hidden />
            Iniciar sesión
          </Link>

          <Link
            href="/registro"
            onClick={() => setOpen(false)}
            className="rk-menu-item"
          >
            <UserPlus aria-hidden />
            Crear cuenta
          </Link>
        </div>

        {themeRow}
      </nav>
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
              className="rk-menu rk-menu-sheet animate-fade-up absolute inset-x-3 bottom-[calc(var(--rk-dock-h)+env(safe-area-inset-bottom)+0.75rem)] max-h-[70vh] overflow-y-auto overscroll-contain"
            >
              <span aria-hidden className="rk-menu-grabber" />

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
        className="rk-skeleton rk-skeleton-circle"
        style={{ width: 44, height: 44 }}
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
        className="rk-avatar-btn"
      >
        {user?.avatarUrl ? (
          <span className="rk-avatar-btn-img">
            <Image
              src={user.avatarUrl}
              alt={displayName || "Mi cuenta"}
              fill
              className="object-cover"
              sizes="32px"
            />
          </span>
        ) : (
          <UserRound aria-hidden />
        )}
      </button>

      {/* ESCRITORIO: desplegable anclado */}
      {open && isDesktop && (
        <div
          role="dialog"
          aria-label="Menú de cuenta"
          className="rk-menu animate-fade-up absolute right-0 top-[calc(100%+0.75rem)] z-[80]"
        >
          {menuBody}
        </div>
      )}

      {mobileSheet}
    </div>
  );
}
