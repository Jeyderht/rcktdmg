import { getSession, type SessionData } from "@/lib/session";
import { VISOR_ANONIMO, type Visor } from "@/lib/vista-recurso";

/**
 * El visor de esta petición, leído de la sesión en el servidor.
 * Va aparte de vista-recurso.ts para que aquel no dependa de las
 * cookies y se pueda importar desde cualquier sitio.
 */
export async function visorActual(): Promise<Visor> {
  return visorDe(await getSession());
}

/** El visor de una sesión ya leída (o del visitante, sin ella). */
export function visorDe(session: SessionData | null): Visor {
  if (!session) return VISOR_ANONIMO;

  return {
    haySesion: true,
    userId: session.userId,
    esAdmin: session.role === "ADMIN",
  };
}
