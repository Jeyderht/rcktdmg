"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "CREATOR" | "CLIENT";
  username: string | null;
  avatarUrl: string | null;
  publicName: string | null;
  creatorStatus:
    | "PENDING"
    | "APPROVED"
    | "SUSPENDED"
    | "REJECTED"
    | null;
  isVerified: boolean;
};

/**
 * Lee la sesión actual desde /api/auth/me.
 *
 * Se usa en componentes cliente (Navbar, navegación móvil)
 * para adaptar la interfaz al rol del usuario.
 */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
