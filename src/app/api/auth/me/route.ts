import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Devuelve la sesión actual para que la interfaz (Navbar,
 * navegación móvil, etc.) pueda adaptarse al usuario.
 *
 * Nunca expone passwordHash ni datos sensibles.
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        username: true,
        avatarUrl: true,
        publicName: true,
        creatorStatus: true,
        isVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me:", error);

    return NextResponse.json({ user: null });
  }
}
