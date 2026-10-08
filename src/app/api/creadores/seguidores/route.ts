import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

const POR_PAGINA = 24;

/**
 * Seguidores del creador que ha iniciado sesión.
 *
 * Cada creador ve SOLO los suyos: el id sale de la sesión y
 * nunca de la petición, así que no hay forma de pedir la
 * lista de otro cambiando un parámetro.
 *
 * Del seguidor se expone lo mínimo para reconocerlo —nombre,
 * avatar, y el usuario si tiene perfil público—. El correo no
 * se envía: el creador no necesita el contacto de quien le
 * sigue, y sería un dato personal de terceros.
 */
export async function GET(request: Request) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const pedida = Number(searchParams.get("page") ?? "1");
    const pagina =
      Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1;

    const where = { creatorId: session.userId };

    const total = await prisma.follow.count({ where });

    const totalPaginas = Math.max(
      1,
      Math.ceil(total / POR_PAGINA)
    );

    const actual = Math.min(pagina, totalPaginas);

    const filas = await prisma.follow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (actual - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        createdAt: true,
        follower: {
          select: {
            id: true,
            name: true,
            publicName: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            creatorStatus: true,
          },
        },
      },
    });

    return NextResponse.json({
      total,
      pagina: actual,
      totalPaginas,
      seguidores: filas.map((fila) => ({
        id: fila.follower.id,
        nombre:
          fila.follower.publicName ||
          fila.follower.name ||
          "Usuario de RcktX",
        avatarUrl: fila.follower.avatarUrl,
        // Solo enlaza si ese seguidor tiene perfil público.
        username:
          fila.follower.creatorStatus === "APPROVED"
            ? fila.follower.username
            : null,
        isVerified: fila.follower.isVerified,
        desde: fila.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/creadores/seguidores:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los seguidores." },
      { status: 500 }
    );
  }
}
