import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import {
  aplicarEtiquetaPack,
  colorValido,
  formatoDesdeUrl,
} from "@/lib/producto-metadata";

function createSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
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
        { error: "No tienes permisos para crear recursos." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      categoryId,
      price,
      accessType,
      coverUrl,
      previewUrl,
      fileUrl,
      color,
      esPack,
    } = body;

    if (!name || !description || !categoryId || price === undefined) {
      return NextResponse.json(
        { error: "Completa todos los campos obligatorios." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "La categoría indicada no existe." },
        { status: 400 }
      );
    }

    const baseSlug = createSlug(name);

    let slug = baseSlug;

    const existingProduct = await prisma.product.findUnique({
      where: {
        slug,
      },
    });

    if (existingProduct) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const product = await prisma.product.create({
      data: {
        creatorId: session.userId as string,
        categoryId,
        name: name.trim(),
        slug,
        description: description.trim(),
        price: String(price),
        accessType: accessType || "BOTH",
        status: "DRAFT",
        coverUrl: coverUrl || null,
        previewUrl: previewUrl || null,
        fileUrl: fileUrl || null,
        color: colorValido(color),
        // El formato lo deduce el archivo subido, no el
        // formulario: así siempre coincide con la descarga.
        fileFormat: formatoDesdeUrl(fileUrl),
      },
    });

    // La etiqueta "pack" es opcional y se puede quitar luego.
    if (esPack === true) {
      await aplicarEtiquetaPack(product.id, true);
    }

    return NextResponse.json(
      {
        message: "Recurso creado correctamente.",
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERROR CREANDO RECURSO:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

