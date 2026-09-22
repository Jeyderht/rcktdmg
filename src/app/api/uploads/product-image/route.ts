import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { putPublic } from "@/lib/storage";
import {
  confirmarImagenSubida,
  esErrorDeConfirmacion,
} from "@/lib/storage/confirmar-imagen";
import crypto from "crypto";
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

    /*
      Subida directa: el navegador ya dejó la imagen en el
      almacén público y aquí solo llega su URL para verificarla.
      La imagen se asocia después al recurso, desde la API de
      imágenes, que es la que comprueba la propiedad del
      producto igual que antes.
    */
    const esConfirmacion = (request.headers.get("content-type") || "")
      .includes("application/json");

    if (esConfirmacion) {
      const cuerpo = await request.json();

      const confirmada = await confirmarImagenSubida({
        tipoEsperado: "product-image",
        blobUrl: cuerpo?.blobUrl,
        userId: String(session.userId),
      });

      if (esErrorDeConfirmacion(confirmada)) {
        return NextResponse.json(
          { error: confirmada.error },
          { status: confirmada.status }
        );
      }

      return NextResponse.json({
        success: true,
        imageUrl: confirmada.url,
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

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    // El destino lo decide el adaptador: disco en desarrollo,
    // almacén público de Blob en producción.
    const guardado = await putPublic({
      folder: "product-images",
      fileName: uniqueName,
      data: buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      success: true,
      imageUrl: guardado.url,
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