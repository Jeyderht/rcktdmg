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
  ChevronLeft,
  LayoutGrid,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import Paginacion from "@/components/Paginacion";
import CompartirPerfil from "@/components/CompartirPerfil";
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
      } en RcktX.`;

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

        {/* PERFIL · centrado, con la portada fundida detrás */}
        <section className="rk-enter">
          <div className="rk-hero">
            <div className="rk-hero-cover">
              {creator.coverUrl && (
                <Image
                  src={creator.coverUrl}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 640px"
                />
              )}
            </div>

            {/* BARRA FLOTANTE: volver · usuario · compartir */}
            <div className="rk-hero-bar">
              <Link href="/creadores" aria-label="Volver a creadores" className="rk-hero-round">
                <ChevronLeft aria-hidden />
              </Link>

              <p className="rk-hero-bar-title">
                {creator.username ? creator.username : displayName}
              </p>

              <CompartirPerfil url={perfilUrl} titulo={displayName} />
            </div>

            <div className="rk-hero-body">
              {/* FOTO */}
              <div className="rk-hero-avatar">
                {creator.avatarUrl ? (
                  <Image
                    src={creator.avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="116px"
                  />
                ) : (
                  initials
                )}
              </div>

              {/* NOMBRE + VERIFICACIÓN */}
              <div className="rk-hero-name">
                <h1>{displayName}</h1>

                {creator.isVerified && (
                  <BadgeCheck
                    className="rk-hero-verified"
                    aria-label="Creador verificado"
                  />
                )}
              </div>

              {creator.username && (
                <p className="rk-hero-user">@{creator.username}</p>
              )}

              {/* BIO: solo si existe realmente */}
              {creator.bio && <p className="rk-hero-bio">{creator.bio}</p>}

              {/* REDES: solo las configuradas de verdad */}
              {socials.length > 0 && (
                <div className="rk-hero-chips">
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
                        className="rk-chip"
                      >
                        <Icon aria-hidden />
                        <span className="hidden sm:inline">{social.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* ACCIONES: seguir (ancho) + compartir (redondo) */}
              <div className="rk-hero-actions">
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
                    aria-label="Ver sus recursos"
                    title="Ver sus recursos"
                    className="rk-hero-round"
                  >
                    <LayoutGrid aria-hidden />
                  </a>
                )}
              </div>

              {/* CIFRAS: datos reales (los seguidores los muestra Seguir) */}
              <dl className="rk-hero-stats">
                <div>
                  <dt>{totalRecursos === 1 ? "Recurso" : "Recursos"}</dt>
                  <dd>
                    <span className="rk-text-iris">{totalRecursos}</span>
                  </dd>
                </div>

                <div>
                  <dt>{categorias.length === 1 ? "Categoría" : "Categorías"}</dt>
                  <dd>{categorias.length}</dd>
                </div>
              </dl>

              {/* PESTAÑAS: sus categorías reales, a la tienda filtrada */}
              {categorias.length > 0 && (
                <div className="rk-hero-tabs">
                  <nav className="rk-tabs rk-tabs-track" aria-label="Categorías del creador">
                    <a href="#recursos" className="rk-tab" aria-current="page">
                      Todo
                    </a>

                    {categorias.map((categoria) => (
                      <Link
                        key={categoria.slug}
                        href={`/tienda?categoria=${encodeURIComponent(categoria.slug)}`}
                        className="rk-tab"
                      >
                        {categoria.name}
                        <span className="rk-tab-count">
                          {categoria._count.products}
                        </span>
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
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
              <div className="mt-6 rk-rejilla">
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
