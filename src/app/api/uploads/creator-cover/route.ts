import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
        { error: "Solo los creadores pueden subir una portada." },
        { status: 403 }
      );
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
          error: "La portada no puede superar los 8 MB.",
        },
        { status: 400 }
      );
    }

    // El nombre se genera en el servidor: el usuario nunca
    // controla la ruta ni la extensión del archivo guardado.
    const fileName = `${user.id}-${randomUUID()}.${extension}`;

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "creator-covers"
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const filePath = path.join(uploadDirectory, fileName);

    const bytes = await file.arrayBuffer();

    await writeFile(filePath, Buffer.from(bytes));

    const coverUrl = `/creator-covers/${fileName}`;

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        coverUrl,
      },
    });

    return NextResponse.json({
      success: true,
      coverUrl,
      fileName,
      size: file.size,
    });
  } catch (error) {
    console.error("POST /api/uploads/creator-cover:", error);

    return NextResponse.json(
      { error: "Error al subir la portada." },
      { status: 500 }
    );
  }
}
