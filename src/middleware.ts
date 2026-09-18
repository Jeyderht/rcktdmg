import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET no está configurado.");
}

const secretKey = new TextEncoder().encode(secret);

async function getSession(request: NextRequest) {
  const token = request.cookies.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Redirige a /login conservando la página de destino para
 * volver a ella después de iniciar sesión.
 */
function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  loginUrl.searchParams.set(
    "redirect",
    request.nextUrl.pathname + request.nextUrl.search
  );

  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await getSession(request);

  // Un usuario con sesión activa no necesita login ni registro.
  if (pathname === "/login" || pathname === "/registro") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ADMIN
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return redirectToLogin(request);
    }

    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  // CREATOR STUDIO
  //
  // Solo el panel y la gestión de productos son privados.
  // `/creadores` y `/creadores/[username]` son públicos:
  // son la landing y los perfiles públicos de creador.
  if (
    pathname.startsWith("/creadores/panel") ||
    pathname.startsWith("/creadores/productos")
  ) {
    if (!session) {
      return redirectToLogin(request);
    }

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  // CUENTA DEL CLIENTE Y CHECKOUT
  if (
    pathname.startsWith("/mi-cuenta") ||
    pathname.startsWith("/checkout")
  ) {
    if (!session) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/creadores/panel/:path*",
    "/creadores/productos/:path*",
    "/mi-cuenta/:path*",
    "/checkout/:path*",
    "/login",
    "/registro",
  ],
};
