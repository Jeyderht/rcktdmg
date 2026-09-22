import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { olvidarObjeto, putPublic } from "@/lib/storage";
import { getSession } from "@/lib/session";
import {
  confirmarImagenSubida,
  esErrorDeConfirmacion,
} from "@/lib/storage/confirmar-imagen";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (user.role !== "CREATOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Solo los creadores pueden subir una foto de perfil.",
        },
        { status: 403 }
      );
    }

    /*
      Subida directa: el navegador ya dejó la imagen en el
      almacén público y aquí solo llega su URL para verificarla
      y guardarla. Se distingue por el tipo de contenido.
    */
    const esConfirmacion = (request.headers.get("content-type") || "")
      .includes("application/json");

    if (esConfirmacion) {
      const cuerpo = await request.json();

      const confirmada = await confirmarImagenSubida({
        tipoEsperado: "creator-avatar",
        blobUrl: cuerpo?.blobUrl,
        userId: user.id,
      });

      if (esErrorDeConfirmacion(confirmada)) {
        return NextResponse.json(
          { error: confirmada.error },
          { status: confirmada.status }
        );
      }

      // La base solo se toca con la imagen ya comprobada.
      const anterior = user.avatarUrl;

      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: confirmada.url },
      });

      // El objeto viejo se olvida después de guardar el nuevo,
      // y solo si era del almacén público y es otro distinto.
      if (anterior && anterior !== confirmada.url) {
        await olvidarObjeto(anterior, "publico");
      }

      return NextResponse.json({
        success: true,
        avatarUrl: confirmada.url,
        fileName: confirmada.pathname.split("/").pop(),
        size: confirmada.size,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ninguna imagen." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "La imagen está vacía." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          error: "Formato no permitido. Usa JPG, PNG o WEBP.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "La foto de perfil no puede superar los 8 MB.",
        },
        { status: 400 }
      );
    }

    // El nombre se genera en el servidor: el usuario nunca
    // controla la ruta ni la extensión del archivo guardado.
    const fileName = `${user.id}-${randomUUID()}.${extension}`;

    const bytes = await file.arrayBuffer();

    // Almacén público: disco en desarrollo, Blob en producción.
    const guardado = await putPublic({
      folder: "creator-avatars",
      fileName,
      data: Buffer.from(bytes),
      contentType: file.type || undefined,
    });

    const avatarUrl = guardado.url;

    const anterior = user.avatarUrl;

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl,
      },
    });

    // Mismo criterio que arriba: primero la base, luego el
    // almacén, y nunca se tocan las rutas locales heredadas.
    if (anterior && anterior !== avatarUrl) {
      await olvidarObjeto(anterior, "publico");
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
      fileName,
      size: file.size,
    });
  } catch (error) {
    console.error("POST /api/uploads/creator-avatar:", error);

    return NextResponse.json(
      { error: "Error al subir la foto de perfil." },
      { status: 500 }
    );
  }
}
