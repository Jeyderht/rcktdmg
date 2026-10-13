import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth";

/*
  Lectura de la sesión para los handlers de la API que la
  repetían, idéntica, en cada archivo. A diferencia de
  getSession() (lib/session), no exige que el rol sea uno de los
  conocidos: se conserva tal cual para no cambiar a quién
  responde cada ruta.
*/

/** Id del usuario con sesión, o null si no hay sesión válida. */
export async function usuarioIdDeSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session || typeof session.userId !== "string") {
    return null;
  }

  return session.userId;
}

/** La sesión si es de un administrador, o null. */
export async function adminDeSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session || session.role !== "ADMIN") {
    return null;
  }

  return session;
}
