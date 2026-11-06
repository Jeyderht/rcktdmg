import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { olvidarObjeto } from "@/lib/storage";
import { rutaDeAvatar } from "@/lib/avatares";

export const runtime = "nodejs";

/**
 * Elegir uno de los 12 avatares de la casa como foto de perfil.
 *
 * Solo el cliente, y solo sobre su propio usuario (el de la sesión).
 * Se guarda la ruta pública (/avatars/avatar-03.svg): el id que llega
 * tiene que ser uno de los 12, nunca una ruta libre. Si antes tenía
 * una foto subida al almacén, se olvida; los avatares no se tocan.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (session.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Los avatares son para las cuentas de cliente." },
        { status: 403 }
      );
    }

    const cuerpo = await request.json().catch(() => null);
    const avatarUrl = rutaDeAvatar(cuerpo?.avatar);

    if (!avatarUrl) {
      return NextResponse.json({ error: "Ese avatar no existe." }, { status: 400 });
    }

    const usuario = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // La foto anterior se olvida después de guardar la nueva.
    const anterior = usuario.avatarUrl;

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
    });

    if (anterior && anterior !== avatarUrl) {
      await olvidarObjeto(anterior, "publico");
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("PATCH /api/cuenta/avatar:", error);

    return NextResponse.json({ error: "No se pudo guardar el avatar." }, { status: 500 });
  }
}
