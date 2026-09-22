"use client";

import { upload } from "@vercel/blob/client";

import { REGLAS, type TipoImagen } from "./imagenes";

export type ArchivoSubido = {
  fileUrl: string;
  fileName: string;
};

/**
 * Sube el archivo vendible de un recurso.
 *
 * Con el almacén de Blob activo el archivo viaja del navegador
 * al almacén privado sin pasar por la función del servidor,
 * que solo firma el permiso: así se respeta el límite de
 * 4,5 MB por petición y se admiten archivos de hasta 100 MB.
 *
 * En desarrollo (driver local) se mantiene la subida de
 * siempre al endpoint del servidor.
 *
 * Las validaciones de rol, tamaño y tipo viven en el servidor
 * en ambos caminos: esto solo elige por dónde va el archivo.
 */
export async function subirArchivoDeProducto(
  file: File
): Promise<ArchivoSubido> {
  const usarBlob =
    process.env.NEXT_PUBLIC_STORAGE_DRIVER === "blob";

  if (!usarBlob) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/product", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "No se pudo subir el archivo."
      );
    }

    return { fileUrl: data.fileUrl, fileName: data.fileName };
  }

  const punto = file.name.lastIndexOf(".");

  const extension =
    punto > -1 ? file.name.slice(punto).toLowerCase() : "";

  // El nombre lo genera el cliente pero el servidor comprueba
  // el formato antes de firmar: products/<uuid><extensión>.
  const pathname = `products/${crypto.randomUUID()}${extension}`;

  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/uploads/product/client-token",
    contentType: file.type || undefined,
    // Multipart a partir de unos megas: sube por partes y
    // reintenta solo la parte que falle.
    multipart: file.size > 8 * 1024 * 1024,
  });

  return { fileUrl: blob.url, fileName: file.name };
}

export type ImagenSubida = {
  url: string;
  fileName: string;
};

/** Endpoint que confirma y, si procede, guarda la URL. */
const ENDPOINT_POR_TIPO: Record<TipoImagen, string> = {
  "product-image": "/api/uploads/product-image",
  "creator-avatar": "/api/uploads/creator-avatar",
  "creator-cover": "/api/uploads/creator-cover",
};

/** Campo en el que cada endpoint devuelve la URL. */
const CAMPO_RESPUESTA: Record<TipoImagen, string> = {
  "product-image": "imageUrl",
  "creator-avatar": "avatarUrl",
  "creator-cover": "coverUrl",
};

/**
 * Sube una imagen pública.
 *
 * Con Blob activo va directa del navegador al almacén público
 * —las imágenes llegan a 10 MB y una función de Vercel admite
 * unos 4,5— y después se confirma contra el servidor, que
 * verifica el objeto y guarda la URL donde corresponda.
 *
 * En desarrollo con driver local se mantiene la subida de
 * siempre por multipart, sin cambios.
 *
 * `userId` solo hace falta en avatar y portada: su nombre va
 * prefijado con el id para que el servidor pueda comprobar de
 * quién es el archivo.
 */
export async function subirImagen(
  tipo: TipoImagen,
  file: File,
  userId?: string
): Promise<ImagenSubida> {
  const endpoint = ENDPOINT_POR_TIPO[tipo];
  const campo = CAMPO_RESPUESTA[tipo];

  const usarBlob =
    process.env.NEXT_PUBLIC_STORAGE_DRIVER === "blob";

  if (!usarBlob) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "No se pudo subir la imagen."
      );
    }

    return { url: data[campo], fileName: data.fileName };
  }

  const regla = REGLAS[tipo];

  // Se comprueba antes de molestar al servidor; el límite real
  // lo impone el permiso que este firma.
  if (file.size > regla.maxBytes) {
    throw new Error(regla.etiqueta);
  }

  const extension = regla.tiposMime[file.type];

  if (!extension) {
    throw new Error(
      "Formato no permitido. Usa JPG, PNG o WEBP."
    );
  }

  if (regla.conPrefijoDeUsuario && !userId) {
    throw new Error("No se pudo identificar tu cuenta.");
  }

  const nombre = regla.conPrefijoDeUsuario
    ? `${userId}-${crypto.randomUUID()}.${extension}`
    : `${crypto.randomUUID()}.${extension}`;

  const blob = await upload(`${regla.folder}/${nombre}`, file, {
    access: "public",
    handleUploadUrl: "/api/uploads/imagenes/client-token",
    contentType: file.type,
  });

  // Confirmación en el servidor: comprueba el objeto y guarda
  // la URL. Hasta aquí no se ha tocado la base de datos.
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blobUrl: blob.url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "No se pudo registrar la imagen."
    );
  }

  return { url: data[campo], fileName: data.fileName };
}
