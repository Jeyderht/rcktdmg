import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { notificarAdmins } from "@/lib/notificaciones";
import { createSession } from "@/lib/auth";
import { destinoInterno } from "@/lib/redireccion";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

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

    if (name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Revisa tu nombre y correo electrónico." }, { status: 400 });
    }
    if (bcrypt.truncates(password)) {
      return NextResponse.json({ error: "La contraseña supera el máximo de 72 bytes." }, { status: 400 });
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

    /*
      Vuelta a la página de la que llegó, si el formulario la trae y
      es una ruta interna válida; si no, /mi-cuenta como siempre. Se
      valida aquí otra vez: lo que diga el navegador no basta.
    */
    return NextResponse.json(
      {
        ok: true,
        redirect: destinoInterno(body.redirect) ?? "/mi-cuenta",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Este correo ya está registrado." }, { status: 409 });
    }
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