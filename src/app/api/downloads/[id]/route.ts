import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de descarga." },
        { status: 400 }
      );
    }

    const download = await prisma.download.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      include: {
        product: true,
        order: true,
      },
    });

    if (!download) {
      return NextResponse.json(
        { error: "Descarga no encontrada." },
        { status: 404 }
      );
    }

    if (download.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Esta descarga no está disponible." },
        { status: 403 }
      );
    }

    if (download.order.status !== "PAID") {
      return NextResponse.json(
        { error: "El pedido todavía no está pagado." },
        { status: 403 }
      );
    }

    if (!download.product.fileUrl) {
      return NextResponse.json(
        { error: "El archivo todavía no está disponible." },
        { status: 404 }
      );
    }

    const fileUrl = download.product.fileUrl;

    let filename = "";

    // Formato antiguo
    if (fileUrl.startsWith("/api/download-file/")) {
      filename = decodeURIComponent(
        fileUrl.replace("/api/download-file/", "")
      );
    }

    // Formato nuevo
    else if (fileUrl.startsWith("/storage/products/")) {
      filename = decodeURIComponent(
        fileUrl.replace("/storage/products/", "")
      );
    }

    // Formato desconocido
    else {
      return NextResponse.json(
        {
          error:
            "El archivo del producto no está configurado correctamente.",
        },
        { status: 400 }
      );
    }

    // Validación de seguridad
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Archivo inválido." },
        { status: 400 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "storage",
      "products",
      filename
    );

    // Comprobar que el archivo exista
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: "El archivo no existe en el servidor." },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    // Registrar descarga
    await prisma.download.update({
      where: {
        id: download.id,
      },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    const extension = path
      .extname(filename)
      .toLowerCase();

    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".rar": "application/vnd.rar",
      ".7z": "application/x-7z-compressed",

      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",

      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",

      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      ".txt": "text/plain",

      ".psd": "application/octet-stream",
      ".ai": "application/postscript",
      ".eps": "application/postscript",
      ".fig": "application/octet-stream",
    };

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          contentTypes[extension] ||
          "application/octet-stream",

        "Content-Disposition": `attachment; filename="${filename}"`,

        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("ERROR DESCARGANDO ARCHIVO:", error);

    return NextResponse.json(
      { error: "No se pudo descargar el archivo." },
      { status: 500 }
    );
  }
}