"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function guardarNombre(_: string, datos: FormData) {
  const sesion = await requireRole(["CLIENT"]);
  if (!sesion) return "Inicia sesión con tu cuenta de cliente.";
  const valor = datos.get("nombre");
  const nombre = typeof valor === "string" ? valor.trim() : "";
  if (!nombre || nombre.length > 100) return "Escribe un nombre de hasta 100 caracteres.";
  try {
    await prisma.user.update({ where: { id: sesion.userId, role: "CLIENT" }, data: { name: nombre } });
  } catch {
    return "No se pudo guardar tu nombre. Vuelve a intentarlo.";
  }
  revalidatePath("/mi-cuenta/perfil");
  return "Nombre actualizado.";
}
