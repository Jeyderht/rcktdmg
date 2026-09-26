import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { putPrivate } from "@/lib/storage";
import {
  EXTENSIONES_ARCHIVO,
  MAXIMO_BYTES_ARCHIVO,
} from "@/lib/requisitos-contenido";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

/*
  El límite y las extensiones ya no se declaran aquí: vienen
  de requisitos-contenido.ts, que es lo que también lee el
  formulario del creador y la página de requisitos. Antes
  estaban escritas en este archivo y repetidas en la interfaz,
  así que podían dejar de coincidir sin que nadie lo notara.
*/
const MAX_FILE_SIZE = MAXIMO_BYTES_ARCHIVO;

const ALLOWED_EXTENSIONS: readonly string[] = EXTENSIONES_ARCHIVO;

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
