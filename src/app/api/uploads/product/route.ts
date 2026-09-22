import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { putPrivate } from "@/lib/storage";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".psd",
  ".ai",
  ".eps",
  ".fig",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp4",
  ".mov",
  ".txt",
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
        { error: "El archivo supera el límite de 100 MB." },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const extension = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Puedes subir ZIP, RAR, PDF, Office, PSD, AI, imágenes, videos y otros formatos digitales compatibles.",
        },
        { status: 400 }
      );
    }

    const uniqueName = `${crypto.randomUUID()}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Almacén privado: el archivo nunca recibe una URL pública.
    const guardado = await putPrivate({
      fileName: uniqueName,
      data: buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      success: true,
      fileUrl: guardado.url,
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
