import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
  ".pdf",
  ".psd",
  ".ai",
  ".eps",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
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

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para subir archivos." },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo no puede superar los 100 MB." },
        { status: 400 }
      );
    }

    const originalName = file.name || "archivo";
    const extension = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Usa ZIP, RAR, 7Z, PDF, PSD, AI, EPS, imágenes, videos, audio u Office.",
        },
        { status: 400 }
      );
    }

    const safeFileName = `${randomUUID()}${extension}`;

    const storageDirectory = path.join(
      process.cwd(),
      "storage",
      "products"
    );

    await fs.mkdir(storageDirectory, {
      recursive: true,
    });

    const filePath = path.join(
      storageDirectory,
      safeFileName
    );

    const arrayBuffer = await file.arrayBuffer();

    await fs.writeFile(
      filePath,
      Buffer.from(arrayBuffer)
    );

    return NextResponse.json({
      success: true,
      fileUrl: `/api/download-file/${safeFileName}`,
      fileName: originalName,
      size: file.size,
    });
  } catch (error) {
    console.error("ERROR SUBIENDO ARCHIVO:", error);

    return NextResponse.json(
      { error: "No se pudo subir el archivo." },
      { status: 500 }
    );
  }
}