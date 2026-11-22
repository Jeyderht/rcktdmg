import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET no está configurado en .env");
}

const secretKey = new TextEncoder().encode(secret);

type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export async function createSessionToken(user: SessionUser) {
  return await new SignJWT({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string) {
  let userId: unknown;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    userId = payload.userId;
  } catch {
    return null;
  }

  if (typeof userId !== "string") return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });
  return user ? { userId, ...user } : null;
}

export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user);

  const cookieStore = await cookies();

  cookieStore.set("rcktdmg_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set("rcktdmg_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}