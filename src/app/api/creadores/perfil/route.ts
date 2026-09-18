import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session?.userId || typeof session.userId !== "string") {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      creatorStatus: true,
      username: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      publicName: true,
      websiteUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      tiktokUrl: true,
      isVerified: true,
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    if (user.role !== "CREATOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los creadores pueden acceder a este perfil." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error("GET /api/creadores/perfil:", error);

    return NextResponse.json(
      { error: "Error al obtener el perfil." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    if (user.role !== "CREATOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los creadores pueden modificar su perfil." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : user.name;

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase().replace(/^@/, "")
        : user.username;

    const publicName =
      typeof body.publicName === "string"
        ? body.publicName.trim()
        : user.publicName;

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : user.bio;

    const websiteUrl =
      typeof body.websiteUrl === "string"
        ? body.websiteUrl.trim()
        : user.websiteUrl;

    const instagramUrl =
      typeof body.instagramUrl === "string"
        ? body.instagramUrl.trim()
        : user.instagramUrl;

    const facebookUrl =
      typeof body.facebookUrl === "string"
        ? body.facebookUrl.trim()
        : user.facebookUrl;

    const tiktokUrl =
      typeof body.tiktokUrl === "string"
        ? body.tiktokUrl.trim()
        : user.tiktokUrl;

    if (username) {
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        return NextResponse.json(
          {
            error:
              "El nombre de usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, puntos, guiones y guiones bajos.",
          },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error: "Ese nombre de usuario ya está en uso.",
          },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: name || null,
        username: username || null,
        publicName: publicName || null,
        bio: bio || null,
        websiteUrl: websiteUrl || null,
        instagramUrl: instagramUrl || null,
        facebookUrl: facebookUrl || null,
        tiktokUrl: tiktokUrl || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        creatorStatus: true,
        username: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        publicName: true,
        websiteUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        tiktokUrl: true,
        isVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente.",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/creadores/perfil:", error);

    return NextResponse.json(
      { error: "Error al actualizar el perfil." },
      { status: 500 }
    );
  }
}