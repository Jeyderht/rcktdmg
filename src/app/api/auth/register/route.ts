import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { notificarAdmins } from "@/lib/notificaciones";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();

    const email = String(body.email || "")
      .toLowerCase()
      .trim();

    const password = String(body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Todos los campos son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "La contraseña debe tener mínimo 8 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Este correo ya está registrado.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CLIENT",
      },
    });

    /*
      Aviso a administración. Va sin correo: para saber quién
      es está el panel de usuarios, que ya exige rol ADMIN.
      El correo en el cuerpo lo dejaría a la vista en la
      campana de cualquier pantalla compartida.
    */
    await notificarAdmins({
      type: "USER_REGISTERED",
      title: "Nuevo usuario registrado",
      body: user.name || "Cuenta nueva en RcktX",
      href: "/admin/usuarios",
    });

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json(
      {
        ok: true,
        redirect: "/mi-cuenta",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "No se pudo crear la cuenta.",
      },
      {
        status: 500,
      }
    );
  }
}