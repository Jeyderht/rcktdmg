import Link from "next/link";
import type { Metadata } from "next";
import { Clock, FileCheck2, Store, UserCheck } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SolicitudForm from "./SolicitudForm";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { solicitudDe } from "@/lib/solicitudes";
import { paginaPublica } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = paginaPublica({
  titulo: "Conviértete en creador",
  descripcion:
    "Publica y vende tus recursos digitales en RCKTDMG. Envía tu portafolio y, si encaja, abrimos tu perfil público.",
  ruta: "/creadores/unete",
});

/* Los cuatro pasos reales del proceso. */
const PASOS = [
  {
    icono: FileCheck2,
    titulo: "Rellenas la solicitud",
    texto: "Tu nombre público, tu especialidad y tu portafolio.",
  },
  {
    icono: Clock,
    titulo: "La revisamos",
    texto: "Miramos tu trabajo. Te avisamos con una notificación.",
  },
  {
    icono: UserCheck,
    titulo: "Se abre tu perfil",
    texto: "Si encaja, tu perfil público queda disponible con tu nombre.",
  },
  {
    icono: Store,
    titulo: "Publicas tus recursos",
    texto: "Subes tus archivos, pones precio y quedan en la tienda.",
  },
];

/**
 * Convertirse en creador.
 *
 * La página enseña una de cuatro cosas según quién entre:
 * quien ya publica, quien tiene una solicitud en revisión,
 * quien no ha iniciado sesión y quien puede solicitarlo.
 *
 * Nadie cambia de rol por entrar aquí ni por enviar el
 * formulario: eso solo ocurre cuando administración aprueba.
 */
export default async function ConvierteteEnCreadorPage() {
  const session = await getSession();

  const [categorias, solicitud] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    session ? solicitudDe(session.userId) : Promise.resolve(null),
  ]);

  const yaEsCreador =
    session?.role === "CREATOR" || session?.role === "ADMIN";

  const enRevision = solicitud?.estado === "PENDING";

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-5 lg:pt-12">
        <section className="rk-fade-up">
          <p className="rk-kicker">Publica en RCKTDMG</p>

          <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl lg:text-5xl">
            Conviértete en creador
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-7 text-ink/65">
            Convierte tus diseños en recursos y véndelos en RCKTDMG.
            Tú pones el precio y conservas la autoría; nosotros
            ponemos la tienda, las descargas y las licencias.
          </p>
        </section>

        {/* ══════════ CÓMO FUNCIONA ══════════ */}
        <section className="rk-fade-up rk-enter-1 mt-10">
          <ol className="grid gap-3 sm:grid-cols-2">
            {PASOS.map(({ icono: Icono, titulo, texto }, indice) => (
              <li key={titulo} className="rk-tile p-5">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="rk-icon-tile h-10 w-10">
                    <Icono size={18} aria-hidden strokeWidth={1.75} />
                  </span>

                  <span className="rk-step-index">
                    0{indice + 1}
                  </span>
                </div>

                <h2 className="mt-3 text-[15px] font-semibold tracking-tight">
                  {titulo}
                </h2>

                <p className="mt-1 text-[13px] leading-6 text-ink/60">
                  {texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="rk-divider mt-12" />

        {/* ══════════ ESTADO O FORMULARIO ══════════ */}
        <section className="rk-fade-up rk-enter-2 mt-10">
          {yaEsCreador ? (
            <div className="rk-tile rounded-rk-lg p-8 text-center">
              <h2 className="rk-title text-xl">Ya publicas en RCKTDMG</h2>

              <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-ink/60">
                Tu cuenta ya tiene acceso al Creator Studio.
              </p>

              <Link
                href="/creadores/panel"
                className="rk-btn rk-btn-primary mt-6"
              >
                Ir al Creator Studio
              </Link>
            </div>
          ) : !session ? (
            <div className="rk-tile rounded-rk-lg p-8 text-center">
              <h2 className="rk-title text-xl">
                Inicia sesión para solicitarlo
              </h2>

              <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-ink/60">
                La solicitud va ligada a tu cuenta. Si todavía no
                tienes una, crearla lleva un minuto.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
                <Link
                  href="/login?redirect=%2Fcreadores%2Funete"
                  className="rk-btn rk-btn-primary"
                >
                  Iniciar sesión
                </Link>

                <Link href="/registro" className="rk-btn rk-btn-line">
                  Crear cuenta
                </Link>
              </div>
            </div>
          ) : enRevision ? (
            <div className="rk-tile rounded-rk-lg p-8 text-center">
              <Clock
                size={30}
                aria-hidden
                className="mx-auto text-ink/45"
              />

              <h2 className="rk-title mt-4 text-xl">
                Tu solicitud está en revisión
              </h2>

              <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-ink/60">
                La enviaste como <strong>@{solicitud?.username}</strong>.
                Te avisaremos con una notificación en cuanto la
                revisemos. Mientras tanto no hace falta que hagas nada.
              </p>

              <Link href="/tienda" className="rk-btn rk-btn-line mt-6">
                Seguir explorando
              </Link>
            </div>
          ) : (
            <>
              <h2 className="rk-title text-xl sm:text-2xl">
                Tu solicitud
              </h2>

              <p className="mt-2 text-[15px] leading-7 text-ink/60">
                Todos los campos son reales y se publicarán en tu
                perfil si te aprobamos, salvo el portafolio, que solo
                ve quien revisa.
              </p>

              <div className="mt-7">
                <SolicitudForm
                  categorias={categorias}
                  solicitudPrevia={solicitud}
                />
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
