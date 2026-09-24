import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { crearNotificacion } from "@/lib/notificaciones";
import {
  contarSeguidores,
  creadorSeguible,
  estadoSeguimiento,
} from "@/lib/seguidores";

export const dynamic = "force-dynamic";

/**
 * Seguir y dejar de seguir creadores.
 *
 * GET sin sesión NO devuelve 401: el contador de seguidores
 * es público y la ficha del creador tiene que poder pintarlo
 * a cualquier visitante. Lo que queda en null es si lo sigue
 * o no, que sin sesión no tiene respuesta.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const creatorId = (searchParams.get("creatorId") ?? "").trim();
    const session = await getSession();

    // Sin creador concreto: a quién sigue el usuario.
    if (!creatorId) {
      if (!session) {
        return NextResponse.json(
          { error: "Debes iniciar sesión." },
          { status: 401 }
        );
      }

      const siguiendo = await prisma.follow.findMany({
        where: { followerId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          createdAt: true,
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
              publicName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });

      return NextResponse.json({
        siguiendo: siguiendo.map((fila) => ({
          desde: fila.createdAt.toISOString(),
          creador: fila.creator,
        })),
      });
    }

    return NextResponse.json(
      await estadoSeguimiento(creatorId, session?.userId ?? null)
    );
  } catch (error) {
    console.error("GET /api/seguidores:", error);

    return NextResponse.json(
      { error: "No se pudo consultar el seguimiento." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para seguir a un creador." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const creatorId = String(body.creatorId ?? "").trim();

    const destino = await creadorSeguible(creatorId, session.userId);

    if (!destino) {
      return NextResponse.json(
        { error: "Ese creador no existe o no se puede seguir." },
        { status: 404 }
      );
    }

    /*
      create y no upsert, para poder distinguir "acaba de
      seguirte" de "ya te seguía".

      La clave primaria compuesta hace que el segundo intento
      —doble clic, reintento de red— choque con P2002 en vez
      de crear otra fila. Ese choque es la señal de que NO hay
      que avisar otra vez al creador: sin esto, pulsar dos
      veces le llegarían dos "nuevo seguidor" por un solo
      seguidor. Si dejó de seguir y vuelve, la fila ya no
      existe, el create funciona y sí se avisa de nuevo.
    */
    let esNuevo = false;

    try {
      await prisma.follow.create({
        data: { followerId: session.userId, creatorId: destino },
      });

      esNuevo = true;
    } catch (error) {
      const yaSeguia =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!yaSeguia) throw error;
    }

    if (esNuevo) {
      /*
        No se dice quién es: el creador tiene la lista completa
        a un clic, y el aviso no necesita llevar el nombre ni
        ningún otro dato de una tercera persona.
      */
      await crearNotificacion({
        userId: destino,
        type: "FOLLOW",
        title: "Nuevo seguidor",
        body: "Un usuario comenzó a seguirte.",
        href: "/creadores/panel/seguidores",
      });
    }

    return NextResponse.json({
      success: true,
      siguiendo: true,
      seguidores: await contarSeguidores(destino),
    });
  } catch (error) {
    console.error("POST /api/seguidores:", error);

    return NextResponse.json(
      { error: "No se pudo seguir al creador." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const creatorId = String(body.creatorId ?? "").trim();

    if (!creatorId) {
      return NextResponse.json(
        { error: "Falta el creador." },
        { status: 400 }
      );
    }

    // deleteMany no falla si no había relación: dejar de
    // seguir a quien no seguías ya deja el estado correcto.
    await prisma.follow.deleteMany({
      where: { followerId: session.userId, creatorId },
    });

    return NextResponse.json({
      success: true,
      siguiendo: false,
      seguidores: await contarSeguidores(creatorId),
    });
  } catch (error) {
    console.error("DELETE /api/seguidores:", error);

    return NextResponse.json(
      { error: "No se pudo dejar de seguir al creador." },
      { status: 500 }
    );
  }
}
