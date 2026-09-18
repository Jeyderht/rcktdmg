import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const admin = await requireRole(["ADMIN"]);

        if (!admin) {
            return NextResponse.json(
                { error: "No tienes permisos para realizar esta acción." },
                { status: 403 }
            );
        }

        const body = await req.json();

        const name = String(body.name || "").trim();

        const email = String(body.email || "")
            .toLowerCase()
            .trim();

        const password = String(body.password || "");

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Todos los campos son obligatorios." },
                { status: 400 }
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: "El correo no tiene un formato válido." },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                {
                    error:
                        "La contraseña debe tener mínimo 8 caracteres.",
                },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Ya existe un usuario con ese correo." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: "CREATOR",
                creatorStatus: "APPROVED",
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Creador creado correctamente.",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    creatorStatus: user.creatorStatus,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/admin/usuarios/creador:", error);

        return NextResponse.json(
            { error: "No se pudo crear el creador." },
            { status: 500 }
        );
    }
}
