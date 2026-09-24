import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Seguir creadores.
 *
 * Un "creador" aquí es un usuario con perfil público: rol
 * CREATOR o ADMIN, aprobado y con username. Es el mismo
 * criterio que usa /creadores/[username] para existir, de
 * modo que nunca se pueda seguir a alguien cuyo perfil no se
 * puede abrir.
 */

/** Filtro de quién puede ser seguido. Un solo sitio. */
export const CREADOR_PUBLICO = {
  role: { in: ["CREATOR", "ADMIN"] },
  creatorStatus: "APPROVED",
  username: { not: null },
} satisfies Prisma.UserWhereInput;

export type EstadoSeguimiento = {
  /** Seguidores del creador. Siempre un número real. */
  seguidores: number;
  /**
   * true si la sesión actual lo sigue. null cuando no hay
   * sesión: no es "no lo sigue", es "todavía no se sabe", y
   * la interfaz lo trata distinto.
   */
  siguiendo: boolean | null;
  /** true si el usuario es el propio creador. */
  esUnoMismo: boolean;
};

/**
 * Estado de seguimiento de un creador para un visitante.
 *
 * Las dos consultas van juntas para no encadenar dos viajes
 * a la base de datos en el render del perfil.
 */
export async function estadoSeguimiento(
  creatorId: string,
  userId: string | null
): Promise<EstadoSeguimiento> {
  if (!userId) {
    return {
      seguidores: await contarSeguidores(creatorId),
      siguiendo: null,
      esUnoMismo: false,
    };
  }

  if (userId === creatorId) {
    return {
      seguidores: await contarSeguidores(creatorId),
      siguiendo: false,
      esUnoMismo: true,
    };
  }

  const [seguidores, relacion] = await Promise.all([
    contarSeguidores(creatorId),

    prisma.follow.findUnique({
      where: {
        followerId_creatorId: { followerId: userId, creatorId },
      },
      select: { createdAt: true },
    }),
  ]);

  return {
    seguidores,
    siguiendo: relacion !== null,
    esUnoMismo: false,
  };
}

export function contarSeguidores(creatorId: string): Promise<number> {
  return prisma.follow.count({ where: { creatorId } });
}

/**
 * Comprueba que el destinatario puede ser seguido.
 *
 * Devuelve su id, o null si no existe, no tiene perfil público
 * o es el propio usuario. Seguirse a uno mismo no es un error
 * del usuario, pero tampoco significa nada.
 */
export async function creadorSeguible(
  creatorId: string,
  userId: string
): Promise<string | null> {
  if (!creatorId || creatorId === userId) return null;

  const creador = await prisma.user.findFirst({
    where: { id: creatorId, ...CREADOR_PUBLICO },
    select: { id: true },
  });

  return creador?.id ?? null;
}
