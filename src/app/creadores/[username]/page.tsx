import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Facebook,
  Globe,
  Instagram,
  Music2,
  PackageOpen,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

async function getCreator(username: string) {
  return prisma.user.findFirst({
    where: {
      username: username.trim().toLowerCase(),
      /*
       * Mismos roles que pueden tener perfil de creador en
       * /api/creadores/perfil y acceder al Creator Studio.
       * Si aquí solo se aceptara CREATOR, una cuenta ADMIN
       * que guarda su username vería su perfil público en
       * 404 pese a tener el enlace visible en la tienda.
       */
      role: {
        in: ["CREATOR", "ADMIN"],
      },
      creatorStatus: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      publicName: true,
      websiteUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      tiktokUrl: true,
      isVerified: true,

      products: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          coverUrl: true,
          createdAt: true,

          category: {
            select: {
              name: true,
              slug: true,
            },
          },

          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
            select: {
              url: true,
              alt: true,
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;

  const creator = await getCreator(username);

  if (!creator) {
    return { title: "Creador no encontrado" };
  }

  const displayName =
    creator.publicName || creator.name || `@${creator.username}`;

  return {
    title: displayName,
    description:
      creator.bio?.slice(0, 160) ||
      `Recursos digitales de ${displayName} en RCKTDMG.`,
  };
}

export default async function CreatorPublicProfile({
  params,
}: PageProps) {
  const { username } = await params;

  const creator = await getCreator(username);

  if (!creator) {
    notFound();
  }

  const displayName =
    creator.publicName || creator.name || "Creador";

  const initials = displayName.charAt(0).toUpperCase();

  const socials = [
    { url: creator.websiteUrl, label: "Sitio web", icon: Globe },
    { url: creator.instagramUrl, label: "Instagram", icon: Instagram },
    { url: creator.facebookUrl, label: "Facebook", icon: Facebook },
    { url: creator.tiktokUrl, label: "TikTok", icon: Music2 },
  ].filter((social) => Boolean(social.url));

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:pb-24 lg:pt-8">

        {/* PERFIL */}
        <section className="rk-enter">
          <div className="rk-glass overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">

            {/* PORTADA */}
            <div className="relative h-32 overflow-hidden sm:h-48 lg:h-56">
              {creator.coverUrl ? (
                <Image
                  src={creator.coverUrl}
                  alt={`Portada de ${displayName}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 72rem"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-ink via-ink/75 to-accent/60" />
              )}

              {/* Degradado para que el avatar respire sobre la imagen */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/80 to-transparent"
              />
            </div>

            {/*
              DATOS
              Móvil: bloque centrado.
              Escritorio: foto a la izquierda, datos a la derecha.
            */}
            <div className="px-5 pb-7 sm:px-9 sm:pb-9">
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:gap-7 sm:text-left">

                {/* FOTO */}
                <div className="-mt-16 shrink-0 sm:-mt-20">
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.8rem] border-4 border-surface bg-primary shadow-rk-float sm:h-36 sm:w-36 sm:rounded-[2rem]">
                    {creator.avatarUrl ? (
                      <Image
                        src={creator.avatarUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 112px, 144px"
                      />
                    ) : (
                      <span className="text-4xl font-semibold text-onprimary sm:text-5xl">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>

                {/* INFORMACIÓN */}
                <div className="min-w-0 flex-1 sm:pt-3">

                  {/* NOMBRE + VERIFICACIÓN */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {displayName}
                    </h1>

                    {creator.isVerified && (
                      <span
                        title="Creador verificado"
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-onprimary"
                      >
                        <BadgeCheck size={13} />
                        Verificado
                      </span>
                    )}
                  </div>

                  {creator.username && (
                    <p className="mt-1 text-sm text-ink/45">
                      @{creator.username}
                    </p>
                  )}

                  {/* BIO: solo si existe realmente */}
                  {creator.bio && (
                    <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-7 text-ink/55 sm:mx-0">
                      {creator.bio}
                    </p>
                  )}

                  {/*
                    REDES SOCIALES
                    Solo las que están configuradas de verdad.
                    Móvil: iconos circulares. Escritorio: con etiqueta.
                  */}
                  {socials.length > 0 && (
                    <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                      {socials.map((social) => {
                        const Icon = social.icon;

                        return (
                          <a
                            key={social.label}
                            href={social.url as string}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={social.label}
                            title={social.label}
                            className="rk-chip h-10 w-10 justify-center !px-0 sm:h-auto sm:w-auto sm:!px-4"
                          >
                            <Icon size={15} className="shrink-0" />

                            <span className="hidden sm:inline">
                              {social.label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* RECURSOS PUBLICADOS + ACCIÓN */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <span className="rk-card px-4 py-2 text-sm font-medium">
                      {creator.products.length}{" "}
                      <span className="text-ink/50">
                        {creator.products.length === 1
                          ? "recurso publicado"
                          : "recursos publicados"}
                      </span>
                    </span>

                    {creator.products.length > 0 && (
                      <a
                        href="#recursos"
                        className="rk-btn rk-btn-primary !px-5 !py-2.5 !text-[13px]"
                      >
                        Explorar sus recursos
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/*
          RECURSOS
          Solo productos PUBLISHED de este creador: la consulta
          ya filtra por status, así que DRAFT, PENDING_REVIEW,
          REJECTED y ARCHIVED nunca llegan aquí.
        */}
        <section
          id="recursos"
          className="rk-enter rk-enter-1 mt-10 scroll-mt-28 sm:mt-12"
        >
          <p className="rk-eyebrow">Portafolio</p>

          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Recursos de {displayName}
          </h2>

          {creator.products.length === 0 ? (
            <div className="rk-card mt-6 px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-ink/[0.05]">
                <PackageOpen size={22} className="text-ink/35" />
              </div>

              <p className="mt-4 text-sm text-ink/50">
                Este creador todavía no tiene recursos publicados.
              </p>

              <Link href="/tienda" className="rk-btn rk-btn-glass mt-6">
                Explorar el marketplace
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {creator.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    price: Number(product.price),
                    coverUrl: product.coverUrl,
                    image: product.images[0] ?? null,
                    category: product.category,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
