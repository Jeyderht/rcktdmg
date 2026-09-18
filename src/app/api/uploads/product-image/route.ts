import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (
      session.role !== "CREATOR" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para subir imágenes.",
        },
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

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error:
            "La imagen no puede superar los 10 MB.",
        },
        { status: 400 }
      );
    }

    const originalName = file.name || "imagen";
    const extension = path
      .extname(originalName)
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Solo se permiten imágenes PNG, JPG, JPEG o WEBP.",
        },
        { status: 400 }
      );
    }

    const uniqueName = `${crypto.randomUUID()}${extension}`;

    const storageDirectory = path.join(
      process.cwd(),
      "public",
      "product-images"
    );

    await fs.mkdir(storageDirectory, {
      recursive: true,
    });

    const filePath = path.join(
      storageDirectory,
      uniqueName
    );

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      imageUrl: `/product-images/${uniqueName}`,
      fileName: originalName,
      size: file.size,
    });
  } catch (error) {
    console.error(
      "ERROR SUBIENDO IMAGEN:",
      error
    );

    return NextResponse.json(
      { error: "No se pudo subir la imagen." },
      { status: 500 }
    );
  }
}