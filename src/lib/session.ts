import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth";

export type SessionData = {
  userId: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "CREATOR" | "CLIENT";
};

/**
 * Lee la cookie `rcktdmg_session`, valida el JWT y devuelve
 * la sesión normalizada. Devuelve null si no hay sesión válida.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload || typeof payload.userId !== "string") {
    return null;
  }

  const role = String(payload.role || "");

  if (role !== "ADMIN" && role !== "CREATOR" && role !== "CLIENT") {
    return null;
  }

  return {
    userId: payload.userId,
    name:
      typeof payload.name === "string" ? payload.name : null,
    email: String(payload.email || ""),
    role,
  };
}

/**
 * Igual que getSession, pero exige que la sesión tenga uno
 * de los roles indicados.
 */
export async function requireRole(
  roles: SessionData["role"][]
): Promise<SessionData | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  if (!roles.includes(session.role)) {
    return null;
  }

  return session;
}
