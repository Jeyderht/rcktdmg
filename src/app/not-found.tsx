import Link from "next/link";
import type { Metadata } from "next";
import { Compass, Home, Search } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { paginaPrivada } from "@/lib/seo";

/*
  Un 404 no se indexa. Next ya devuelve el código 410/404 en
  la respuesta, pero la etiqueta deja claro que esta página no
  debe guardarse aunque un rastreador llegue a ella desde un
  enlace roto.
*/
export const metadata: Metadata = paginaPrivada("Página no encontrada");

/**
 * Página 404 del sitio.
 *
 * Sale cuando una URL no existe y cuando una página llama a
 * `notFound()`: un recurso sin publicar, un pack en borrador,
 * un creador que no existe o una colección privada.
 *
 * No enumera causas ni distingue entre ellas —desde fuera no
 * se puede saber si algo no existe o si existe y no es
 * público—; simplemente ofrece por dónde seguir.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />

      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-5 lg:pb-28 lg:pt-24">
        <span
          aria-hidden
          className="rk-media flex h-14 w-14 items-center justify-center rounded-full"
        >
          <Compass size={24} className="text-ink/45" />
        </span>

        <p className="rk-kicker mt-6">Error 404</p>

        <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl">
          Esta página no existe
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-7 text-ink/60">
          El enlace puede estar mal escrito, o el contenido que
          buscas ya no está disponible.
        </p>

        <div className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Link href="/" className="rk-btn rk-btn-primary">
            <Home size={16} aria-hidden />
            Ir al inicio
          </Link>

          <Link href="/tienda" className="rk-btn rk-btn-ghost">
            <Search size={16} aria-hidden />
            Explorar recursos
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
