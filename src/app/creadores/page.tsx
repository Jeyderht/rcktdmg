import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck } from "lucide-react";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Creadores",
  description:
    "Descubre a los creadores de RCKTDMG y publica tus propios recursos.",
};

export const dynamic = "force-dynamic";

export default async function CreatorsPage() {
  const session = await getSession();

  const isCreator =
    session?.role === "CREATOR" || session?.role === "ADMIN";

  // Solo se listan creadores aprobados y con perfil público
  // (necesitan username para tener URL).
  const creators = await prisma.user.findMany({
    where: {
      role: "CREATOR",
      creatorStatus: "APPROVED",
      username: {
        not: null,
      },
      products: {
        some: {
          status: "PUBLISHED",
        },
      },
    },
    orderBy: [{ isVerified: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      publicName: true,
      username: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      isVerified: true,

      _count: {
        select: {
          products: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
  });

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

        {/* ENCABEZADO */}
        <section className="rk-enter">
          <div className="rk-glass relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:rounded-[2.5rem] sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
            />

            <div className="relative">
              <p className="rk-eyebrow">Creator Studio</p>

              <h1 className="mt-3 text-[2.25rem] font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
                Publica. Crece. Vende.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-ink/50">
                Sube tus recursos, gestiona tus ventas y cobra tus
                ganancias desde un único panel.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {isCreator ? (
                  <Link
                    href="/creadores/panel"
                    className="rk-btn rk-btn-primary"
                  >
                    Ir a mi panel
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    href={session ? "/mi-cuenta" : "/registro"}
                    className="rk-btn rk-btn-primary"
                  >
                    {session ? "Mi cuenta" : "Crear cuenta"}
                    <ArrowRight size={16} />
                  </Link>
                )}

                <Link href="/tienda" className="rk-btn rk-btn-glass">
                  Ver recursos
                </Link>
              </div>

              {!isCreator && (
                <p className="mx-auto mt-5 max-w-lg text-xs text-ink/40">
                  Las cuentas de creador las habilita el equipo de
                  RCKTDMG desde administración.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* CREADORES */}
        {creators.length > 0 && (
          <section className="rk-enter rk-enter-1 mt-10 sm:mt-14">
            <p className="rk-eyebrow">Comunidad</p>

            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Creadores en RCKTDMG
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => {
                const displayName =
                  creator.publicName || creator.name || "Creador";

                return (
                  <Link
                    key={creator.id}
                    href={`/creadores/${creator.username}`}
                    className="rk-card rk-card-hover rk-press group overflow-hidden"
                  >
                    {/* PORTADA */}
                    <div className="h-24 overflow-hidden rounded-t-[1.5rem]">
                      {creator.coverUrl ? (
                        <img
                          src={creator.coverUrl}
                          alt={`Portada de ${displayName}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-rk group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-ink via-ink/70 to-accent/60" />
                      )}
                    </div>

                    <div className="px-5 pb-5">
                      {/* AVATAR */}
                      <div className="-mt-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.1rem] border-[3px] border-surface bg-primary shadow-rk">
                        {creator.avatarUrl ? (
                          <img
                            src={creator.avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-semibold text-onprimary">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-1.5">
                        <h3 className="truncate font-semibold tracking-tight">
                          {displayName}
                        </h3>

                        {creator.isVerified && (
                          <BadgeCheck
                            size={15}
                            className="shrink-0 fill-ink text-background"
                          />
                        )}
                      </div>

                      <p className="mt-0.5 text-sm text-ink/40">
                        @{creator.username}
                      </p>

                      {creator.bio && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/50">
                          {creator.bio}
                        </p>
                      )}

                      <p className="mt-4 text-xs font-medium text-ink/40">
                        {creator._count.products}{" "}
                        {creator._count.products === 1
                          ? "recurso publicado"
                          : "recursos publicados"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
