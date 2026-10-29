import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  esTagProtegido,
  normalizarListaTags,
  sincronizarTagsProducto,
} from "@/lib/tags";
import { registrarCambioAdmin, type CambioAdmin } from "@/lib/registro-admin";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/** Estados que se gestionan aquí; el resto va por el flujo de revisión. */
const ESTADOS_GESTIONABLES = ["PUBLISHED", "ARCHIVED"] as const;
type EstadoGestionable = (typeof ESTADOS_GESTIONABLES)[number];

const LARGO_MAXIMO_NOMBRE = 150;
const LARGO_MAXIMO_DESCRIPCION = 5000;
/** Tope de Decimal(10, 2). */
const PRECIO_MAXIMO = 99_999_999.99;

function esEstadoGestionable(valor: unknown): valor is EstadoGestionable {
  return (
    typeof valor === "string" &&
    (ESTADOS_GESTIONABLES as readonly string[]).includes(valor)
  );
}

function error(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status });
}

/**
 * Edición de un recurso publicado o archivado por la administración.
 *
 * El PATCH de creadores/productos/[id] sigue limitando un recurso
 * publicado a «solo portada» para el creador; esta ruta es aparte
 * y solo para ADMIN. Acepta cualquier subconjunto de: nombre,
 * descripción, precio, categoría, etiquetas y estado (PUBLISHED ↔
 * ARCHIVED, que es archivar y restaurar). Cada cambio aplicado
 * queda en el registro (registrarCambioAdmin).
 *
 * No toca el archivo (va por versiones), ni el slug (las URLs de la
 * ficha no cambian al renombrar), ni pedidos, pagos o descargas:
 * quien compró sigue descargando aunque el recurso se archive.
 */
export async function PATCH(request: Request, contexto: Contexto) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return error("Solo la administración puede editar este recurso.", 403);
    }

    const { id } = await contexto.params;

    let body: Record<string, unknown>;

    try {
      const leido: unknown = await request.json();

      if (!leido || typeof leido !== "object" || Array.isArray(leido)) {
        return error("El cuerpo de la petición no es válido.");
      }

      body = leido as Record<string, unknown>;
    } catch {
      return error("El cuerpo de la petición no es válido.");
    }

    const recurso = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        status: true,
        categoryId: true,
        pieceType: true,
        category: { select: { name: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    });

    if (!recurso) {
      return error("El recurso no existe.", 404);
    }

    if (!esEstadoGestionable(recurso.status)) {
      return error(
        "Solo se editan aquí recursos publicados o archivados. Los demás siguen el flujo de revisión."
      );
    }

    const datos: {
      name?: string;
      description?: string;
      price?: string;
      categoryId?: string;
      pieceType?: null;
      status?: EstadoGestionable;
    } = {};
    const cambios: CambioAdmin[] = [];

    // NOMBRE
    if (body.name !== undefined) {
      const nombre = typeof body.name === "string" ? body.name.trim() : "";

      if (!nombre) return error("El nombre no puede quedar vacío.");
      if (nombre.length > LARGO_MAXIMO_NOMBRE) {
        return error(`El nombre admite hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`);
      }

      if (nombre !== recurso.name) {
        datos.name = nombre;
        cambios.push({ campo: "name", antes: recurso.name, despues: nombre });
      }
    }

    // DESCRIPCIÓN
    if (body.description !== undefined) {
      const descripcion =
        typeof body.description === "string" ? body.description.trim() : "";

      if (!descripcion) return error("La descripción no puede quedar vacía.");
      if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
        return error(
          `La descripción admite hasta ${LARGO_MAXIMO_DESCRIPCION} caracteres.`
        );
      }

      if (descripcion !== recurso.description) {
        datos.description = descripcion;
        cambios.push({
          campo: "description",
          antes: recurso.description,
          despues: descripcion,
        });
      }
    }

    // PRECIO: número ≥ 0 con hasta 2 decimales.
    if (body.price !== undefined) {
      const texto =
        typeof body.price === "number"
          ? String(body.price)
          : typeof body.price === "string"
            ? body.price.trim()
            : "";

      if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
        return error("El precio debe ser un número mayor o igual a 0 con hasta 2 decimales.");
      }

      const precio = Number(texto);

      if (!Number.isFinite(precio) || precio < 0 || precio > PRECIO_MAXIMO) {
        return error("El precio no es válido.");
      }

      const nuevo = precio.toFixed(2);
      const anterior = Number(recurso.price).toFixed(2);

      if (nuevo !== anterior) {
        datos.price = nuevo;
        cambios.push({ campo: "price", antes: anterior, despues: nuevo });
      }
    }

    // CATEGORÍA: tiene que existir y estar activa.
    if (body.categoryId !== undefined) {
      const categoryId =
        typeof body.categoryId === "string" ? body.categoryId.trim() : "";

      if (!categoryId) return error("Elige una categoría.");

      if (categoryId !== recurso.categoryId) {
        const categoria = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true, slug: true, isActive: true },
        });

        if (!categoria) return error("La categoría indicada no existe.");
        if (!categoria.isActive) {
          return error(`La categoría «${categoria.name}» está retirada.`);
        }

        datos.categoryId = categoria.id;
        cambios.push({
          campo: "category",
          antes: recurso.category.name,
          despues: categoria.name,
        });

        /*
          La pieza declarada (flyer, story…) solo existe dentro de
          Eventos. Si el recurso sale de Eventos, se quita, como
          hace el formulario del creador al crear.
        */
        if (categoria.slug !== "eventos" && recurso.pieceType !== null) {
          datos.pieceType = null;
          cambios.push({
            campo: "pieceType",
            antes: recurso.pieceType,
            despues: null,
          });
        }
      }
    }

    // ESTADO: archivar (PUBLISHED → ARCHIVED) o restaurar (ARCHIVED → PUBLISHED).
    if (body.status !== undefined) {
      if (!esEstadoGestionable(body.status)) {
        return error("El estado solo puede ser PUBLISHED o ARCHIVED.");
      }

      if (body.status !== recurso.status) {
        datos.status = body.status;
        cambios.push({ campo: "status", antes: recurso.status, despues: body.status });
      }
    }

    // ETIQUETAS: las protegidas («pack») no se tocan desde aquí.
    let etiquetasNuevas: string[] | null = null;

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return error("Las etiquetas deben ser una lista.");
      }

      const antes = recurso.tags
        .map((t) => t.tag)
        .filter((t) => !esTagProtegido(t.slug))
        .map((t) => t.name)
        .sort();
      const despues = normalizarListaTags(body.tags)
        .filter((t) => !esTagProtegido(t.slug))
        .map((t) => t.nombre)
        .sort();

      if (antes.join("\n") !== despues.join("\n")) {
        etiquetasNuevas = despues;
        cambios.push({ campo: "tags", antes, despues });
      }
    }

    if (cambios.length === 0) {
      return NextResponse.json({ ok: true, message: "No había cambios que guardar." });
    }

    if (Object.keys(datos).length > 0) {
      await prisma.product.update({ where: { id: recurso.id }, data: datos });
    }

    if (etiquetasNuevas) {
      await sincronizarTagsProducto(recurso.id, etiquetasNuevas);
    }

    registrarCambioAdmin({
      adminId: session.userId,
      recursoId: recurso.id,
      cambios,
    });

    const archivado = datos.status === "ARCHIVED";
    const restaurado = datos.status === "PUBLISHED";

    return NextResponse.json({
      ok: true,
      message: archivado
        ? "Recurso archivado: ya no se ve en la tienda. Quien lo compró lo sigue descargando."
        : restaurado
          ? "Recurso restaurado: vuelve a estar publicado."
          : "Cambios guardados.",
      cambios: cambios.map((c) => c.campo),
    });
  } catch (e) {
    console.error("ERROR EDITANDO RECURSO (admin):", e);

    return error("No se pudieron guardar los cambios.", 500);
  }
}
