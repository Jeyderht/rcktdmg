import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import {
  POR_PAGINA_NOTIFICACIONES,
  marcarComoLeida,
  marcarTodasComoLeidas,
  obtenerNotificaciones,
} from "@/lib/notificaciones";

export const dynamic = "force-dynamic";

/**
 * Centro de notificaciones.
 *
 * Las notificaciones viven en la tabla `Notification` y se
 * escriben cuando ocurre el hecho. El estado leído es una
 * columna, no algo guardado en el navegador: sobrevive al
 * cambio de dispositivo y al borrado de la caché.
 *
 * SEGURIDAD: el usuario sale SIEMPRE de la sesión firmada.
 * Ninguna de las dos operaciones acepta un `userId` del
 * cliente, ni para leer ni para marcar.
 */

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const pagina = Number(searchParams.get("page") ?? "1");

    const porPagina = Number(
      searchParams.get("pageSize") ?? POR_PAGINA_NOTIFICACIONES
    );

    const listado = await obtenerNotificaciones(session.userId, {
      pagina: Number.isFinite(pagina) ? pagina : 1,
      porPagina: Number.isFinite(porPagina)
        ? porPagina
        : POR_PAGINA_NOTIFICACIONES,
    });

    return NextResponse.json(listado);
  } catch (error) {
    console.error("GET /api/notificaciones:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las notificaciones." },
      { status: 500 }
    );
  }
}

/**
 * Marca como leída una notificación o todas.
 *
 * Una sola ruta para los dos casos, en lugar de duplicar el
 * control de sesión en dos archivos:
 *
 *   { "id": "..." }     → esa notificación
 *   { "todas": true }   → todas las del usuario
 */
export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body?.todas === true) {
      const marcadas = await marcarTodasComoLeidas(session.userId);

      return NextResponse.json({
        success: true,
        marcadas,
        noLeidas: 0,
      });
    }

    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Indica una notificación o usa todas: true." },
        { status: 400 }
      );
    }

    const hecho = await marcarComoLeida(session.userId, id);

    /*
      404 y no 403 a propósito: si respondiéramos 403 cuando
      la notificación existe pero es de otra persona, ese 403
      confirmaría que ese id existe. Desde fuera, "no es tuya"
      y "no existe" deben ser indistinguibles.
    */
    if (!hecho) {
      return NextResponse.json(
        { error: "Notificación no encontrada." },
        { status: 404 }
      );
    }

    const { noLeidas } = await obtenerNotificaciones(session.userId, {
      porPagina: 1,
    });

    return NextResponse.json({ success: true, noLeidas });
  } catch (error) {
    console.error("PATCH /api/notificaciones:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la notificación." },
      { status: 500 }
    );
  }
}
