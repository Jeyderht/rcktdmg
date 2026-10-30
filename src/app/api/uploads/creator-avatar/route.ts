import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { olvidarObjeto, putPublic } from "@/lib/storage";
import { getSession } from "@/lib/session";
import {
  confirmarImagenSubida,
  esErrorDeConfirmacion,
} from "@/lib/storage/confirmar-imagen";
import { MAX_IMAGEN_PERFIL, TIPOS_IMAGEN_PERFIL } from "@/lib/subidas";
import { MAX_FOTO_CLIENTE, tipoFotoPorFirma } from "@/lib/avatares";

export const runtime = "nodejs";
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

    /*
      El cliente también puede subir su foto de perfil, pero solo
      por la subida con formulario (abajo): el servidor recibe los
      bytes y comprueba el tipo REAL y el tamaño (2 MB). La subida
      directa al almacén sigue siendo solo de creadores y admin.
    */
    const esCliente = user.role === "CLIENT";

    if (!esCliente && user.role !== "CREATOR" && user.role !== "ADMIN") {
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

    if (esConfirmacion && esCliente) {
      return NextResponse.json(
        { error: "Sube la foto desde tu perfil." },
        { status: 403 }
      );
    }

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

    // CLIENTE: tipo por la firma de los bytes y máximo 2 MB; se guarda
    // con el tipo detectado, nunca con el que declara el navegador.
    if (esCliente) {
      if (file.size > MAX_FOTO_CLIENTE) {
        return NextResponse.json(
          { error: "La foto no puede superar los 2 MB." },
          { status: 400 }
        );
      }

      const datos = Buffer.from(await file.arrayBuffer());
      const tipoReal = tipoFotoPorFirma(datos);

      if (!tipoReal) {
        return NextResponse.json(
          { error: "Formato no permitido. Usa JPG, PNG o WEBP." },
          { status: 400 }
        );
      }

      const guardadoCliente = await putPublic({
        // Misma carpeta de avatares; el nombre lleva el id del usuario.
        folder: "creator-avatars",
        fileName: `${user.id}-${randomUUID()}.${TIPOS_IMAGEN_PERFIL[tipoReal]}`,
        data: datos,
        contentType: tipoReal,
      });

      const anteriorCliente = user.avatarUrl;

      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: guardadoCliente.url },
      });

      // Solo se olvidan fotos del almacén; los avatares de la casa no.
      if (anteriorCliente && anteriorCliente !== guardadoCliente.url) {
        await olvidarObjeto(anteriorCliente, "publico");
      }

      return NextResponse.json({
        success: true,
        avatarUrl: guardadoCliente.url,
        size: datos.length,
      });
    }

    const extension = TIPOS_IMAGEN_PERFIL[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          error: "Formato no permitido. Usa JPG, PNG o WEBP.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGEN_PERFIL) {
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
