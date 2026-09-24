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
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import Paginacion from "@/components/Paginacion";
import SeguirButton from "@/components/SeguirButton";
import { SELECCION_TARJETA, aTarjeta } from "@/lib/catalogo";
import { estadoSeguimiento } from "@/lib/seguidores";
import { getSession } from "@/lib/session";
import { noEncontrado, paginaPublica } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const POR_PAGINA = 20;

/**
 * Datos del creador, sin sus recursos.
 *
 * Los recursos se piden aparte y paginados: antes venían con
 * un `include` sin límite, de modo que abrir el perfil de un
 * creador con 500 recursos los traía los 500.
 */
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

      _count: {
        select: {
          products: { where: { status: "PUBLISHED" } },
          seguidores: true,
        },
      },
    },
  });
}

/** Recursos publicados del creador, de una página. */
async function getRecursos(creatorId: string, pagina: number) {
  return prisma.product.findMany({
    where: { creatorId, status: "PUBLISHED" },
    // El id cierra el orden para que paginar sea estable.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    select: SELECCION_TARJETA,
  });
}

/**
 * Categorías en las que publica este creador.
 *
 * Salen de sus recursos reales, con su recuento: no es una
 * lista de intereses declarada a mano.
 */
async function getCategorias(creatorId: string) {
  const filas = await prisma.category.findMany({
    where: {
      products: { some: { creatorId, status: "PUBLISHED" } },
    },
    select: {
      name: true,
      slug: true,
      _count: {
        select: {
          products: { where: { creatorId, status: "PUBLISHED" } },
        },
      },
    },
  });

  return filas.sort((a, b) => b._count.products - a._count.products);
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { username } = await params;

  const creator = await getCreator(username);

  /*
    getCreator solo devuelve perfiles APPROVED con username.
    Los suspendidos, rechazados, sin perfil o inexistentes
    caen aquí: 404 y sin indexar.
  */
  if (!creator) {
    return noEncontrado("Creador");
  }

  const displayName =
    creator.publicName || creator.name || `@${creator.username}`;

  const recursos = creator._count.products;

  /*
    La descripción usa la biografía real si existe. Si no, se
    compone con el número REAL de recursos publicados; no se
    inventa ninguna biografía.
  */
  const descripcion = creator.bio
    ? creator.bio.replace(/\s+/g, " ").trim().slice(0, 160)
    : `${displayName} publica ${recursos} ${
        recursos === 1 ? "recurso" : "recursos"
      } en RCKTDMG.`;

  /*
    El perfil está paginado. La página 2 enseña recursos que
    no están en la 1, así que lleva su propia canónica: si
    todas apuntaran a la primera, el resto de recursos del
    creador quedaría fuera de los buscadores.
  */
  const pedida = Number((await searchParams).page ?? "1");

  const pagina =
    Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1;

  const base = `/creadores/${creator.username}`;

  return paginaPublica({
    titulo: pagina > 1 ? `${displayName} · Página ${pagina}` : displayName,
    descripcion,
    ruta: pagina > 1 ? `${base}?page=${pagina}` : base,
    // El avatar es del almacén público; nunca un archivo privado.
    imagen: creator.avatarUrl,
    tipo: "profile",
  });
}

export default async function CreatorPublicProfile({
  params,
  searchParams,
}: PageProps) {
  const { username } = await params;

  const creator = await getCreator(username);

  if (!creator) {
    notFound();
  }

  const totalRecursos = creator._count.products;

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalRecursos / POR_PAGINA)
  );

  const pedida = Number(
    typeof (await searchParams).page === "string"
      ? (await searchParams).page
      : "1"
  );

  const pagina = Math.min(
    Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1,
    totalPaginas
  );

  /*
    La sesión hace falta para saber si el visitante ya sigue a
    este creador. Sin sesión el perfil se ve igual: lo único
    que cambia es que el botón lleva al login.
  */
  const session = await getSession();

  const [recursos, categorias, seguimiento] = await Promise.all([
    totalRecursos > 0 ? getRecursos(creator.id, pagina) : [],
    getCategorias(creator.id),
    estadoSeguimiento(creator.id, session?.userId ?? null),
  ]);

  const perfilUrl = `/creadores/${creator.username}`;

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
          <div className="rk-glass overflow-hidden rounded-rk-xl">

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
                <div className="h-full w-full bg-gradient-to-br from-ink via-ink/75 to-ink/50" />
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
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rk-media rounded-rk-lg border-4 border-surface shadow-rk-float sm:h-36 sm:w-36 sm:rounded-rk-xl">
                    {creator.avatarUrl ? (
                      <Image
                        src={creator.avatarUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 112px, 144px"
                      />
                    ) : (
                      <span className="text-4xl font-semibold text-ink/60 sm:text-5xl">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>

                {/* INFORMACIÓN */}
                <div className="min-w-0 flex-1 sm:pt-3">

                  {/* NOMBRE + VERIFICACIÓN */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="rk-title text-2xl sm:text-3xl">
                      {displayName}
                    </h1>

                    {creator.isVerified && (
                      <span
                        title="Creador verificado"
                        className="rk-badge rk-badge-accent"
                      >
                        <BadgeCheck size={13} />
                        Verificado
                      </span>
                    )}
                  </div>

                  {creator.username && (
                    <p className="mt-1 text-sm text-ink/60">
                      @{creator.username}
                    </p>
                  )}

                  {/* BIO: solo si existe realmente */}
                  {creator.bio && (
                    <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-7 text-ink/60 sm:mx-0">
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

                  {/*
                    CATEGORÍAS
                    Salen de sus recursos publicados, no de una
                    lista declarada: enlazan a la tienda ya
                    filtrada por ese creador.
                  */}
                  {categorias.length > 0 && (
                    <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                      {categorias.map((categoria) => (
                        <li key={categoria.slug}>
                          <Link
                            href={`/tienda?categoria=${encodeURIComponent(
                              categoria.slug
                            )}`}
                            className="rk-chip"
                          >
                            {categoria.name}

                            <span className="text-[10px] tabular-nums opacity-60">
                              {categoria._count.products}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/*
                    RECURSOS PUBLICADOS + ACCIÓN

                    En móvil cada bloque ocupa su línea y va
                    centrado; a partir de sm se alinean en fila.
                    Antes el botón de seguir traía su recuento
                    apilado debajo y en una fila centrada
                    quedaba desalineado con el resto.
                  */}
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                    <span className="rk-card px-4 py-2 text-sm font-medium tabular-nums">
                      {totalRecursos}{" "}
                      <span className="text-ink/60">
                        {totalRecursos === 1
                          ? "recurso publicado"
                          : "recursos publicados"}
                      </span>
                    </span>

                    <SeguirButton
                      creatorId={creator.id}
                      perfilUrl={perfilUrl}
                      seguidoresIniciales={seguimiento.seguidores}
                      siguiendoInicial={seguimiento.siguiendo}
                      esUnoMismo={seguimiento.esUnoMismo}
                    />

                    {totalRecursos > 0 && (
                      <a
                        href="#recursos"
                        className="rk-btn rk-btn-line !px-5 !py-2.5 !text-[13px]"
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

          <h2 className="rk-title mt-2 text-2xl sm:text-3xl">
            Recursos de {displayName}
          </h2>

          {totalRecursos === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={PackageOpen}
                title="Todavía no hay recursos publicados"
                description={`Cuando ${displayName} publique un recurso aparecerá aquí.`}
                action={{
                  href: "/tienda",
                  label: "Explorar el marketplace",
                }}
              />
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {recursos.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={aTarjeta(product)}
                  />
                ))}
              </div>

              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                href={(numero) =>
                  // La página 1 es la URL limpia del perfil.
                  numero <= 1
                    ? `${perfilUrl}#recursos`
                    : `${perfilUrl}?page=${numero}#recursos`
                }
              />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
