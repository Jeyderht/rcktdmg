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
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import EmptyState from "@/components/ui/EmptyState";
import ProductCard from "@/components/tienda/ProductCard";
import Paginacion from "@/components/ui/Paginacion";
import CompartirPerfil from "@/components/perfil/CompartirPerfil";
import PestanasPerfil from "@/components/perfil/PestanasPerfil";
import SeguirButton from "@/components/perfil/SeguirButton";
import { SELECCION_TARJETA, aTarjeta } from "@/lib/catalogo";
import { CATEGORIA_EVENTOS } from "@/lib/home";
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

/**
 * Recursos publicados del creador, de una página. Con
 * `categoria` (slug ya validado), solo los de esa categoría.
 */
async function getRecursos(
  creatorId: string,
  pagina: number,
  categoria: string | null
) {
  return prisma.product.findMany({
    where: {
      creatorId,
      status: "PUBLISHED",
      ...(categoria ? { category: { slug: categoria } } : {}),
    },
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
 * lista de intereses declarada a mano. Eventos va primero; el
 * resto, de más a menos recursos.
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

  return filas.sort(
    (a, b) =>
      Number(b.slug === CATEGORIA_EVENTOS) -
        Number(a.slug === CATEGORIA_EVENTOS) ||
      b._count.products - a._count.products
  );
}

/*
  «Corporativos» y «General» son la misma categoría: en las
  pestañas del perfil se enseña «General». Solo la etiqueta; el
  slug y los datos no cambian.
*/
function nombreDePestana(categoria: { name: string; slug: string }) {
  return categoria.slug === "corporativos" ? "General" : categoria.name;
}

/** `?categoria=` del perfil: un slug con forma válida o null. */
function categoriaPedida(valor: string | string[] | undefined) {
  return typeof valor === "string" && /^[a-z0-9-]+$/.test(valor)
    ? valor
    : null;
}

/*
  No hay vista «Todo»: el perfil siempre enseña una categoría.
  La pedida si es de las suyas; si no, la de por defecto, que es
  la primera de getCategorias (Eventos si tiene recursos ahí).
  Sin categorías devuelve null y el perfil queda como antes.
*/
function categoriaActiva<T extends { slug: string }>(
  categorias: T[],
  valor: string | string[] | undefined
) {
  const pedido = categoriaPedida(valor);
  return categorias.find((c) => c.slug === pedido) ?? categorias[0] ?? null;
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
  const consulta = await searchParams;
  const pedida = Number(consulta.page ?? "1");

  const pagina =
    Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1;

  const base = `/creadores/${creator.username}`;

  /*
    La canónica sigue a la categoría activa. La de por defecto es
    la URL limpia del perfil (la que enlazan tarjetas y sitemap);
    las demás conservan ?categoria=.
  */
  const categorias = await getCategorias(creator.id);
  const categoria = categoriaActiva(categorias, consulta.categoria);
  const filtros = new URLSearchParams();
  if (categoria && categoria !== categorias[0]) {
    filtros.set("categoria", categoria.slug);
  }
  if (pagina > 1) filtros.set("page", String(pagina));
  const ruta = filtros.size > 0 ? `${base}?${filtros}` : base;

  return paginaPublica({
    titulo: pagina > 1 ? `${displayName} · Página ${pagina}` : displayName,
    descripcion,
    ruta,
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

  const consulta = await searchParams;

  /*
    La sesión hace falta para saber si el visitante ya sigue a
    este creador. Sin sesión el perfil se ve igual: lo único
    que cambia es que el botón lleva al login.
  */
  const [categorias, session] = await Promise.all([
    getCategorias(creator.id),
    getSession(),
  ]);

  /*
    FILTRO DE CATEGORÍA (?categoria=<slug>)

    Las pestañas filtran los recursos de este creador sin salir
    del perfil. Solo vale un slug de sus categorías reales; sin
    él, o con uno inválido, se abre la de por defecto (Eventos o
    la primera que tenga). El total y la paginación siguen al
    filtro.
  */
  const filtro = categoriaActiva(categorias, consulta.categoria);
  const porDefecto = categorias[0] ?? null;

  const totalFiltrado = filtro ? filtro._count.products : totalRecursos;

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalFiltrado / POR_PAGINA)
  );

  const pedida = Number(
    typeof consulta.page === "string" ? consulta.page : "1"
  );

  const pagina = Math.min(
    Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1,
    totalPaginas
  );

  const [recursos, seguimiento] = await Promise.all([
    totalFiltrado > 0
      ? getRecursos(creator.id, pagina, filtro?.slug ?? null)
      : [],
    estadoSeguimiento(creator.id, session?.userId ?? null),
  ]);

  const perfilUrl = `/creadores/${creator.username}`;

  /** URL de una vista del portafolio: filtro + página, al ancla. La categoría por defecto va sin ?categoria=. */
  const urlRecursos = (categoria: string | null, numero = 1) => {
    const filtros = new URLSearchParams();
    if (categoria && categoria !== porDefecto?.slug) {
      filtros.set("categoria", categoria);
    }
    if (numero > 1) filtros.set("page", String(numero));
    return `${perfilUrl}${filtros.size > 0 ? `?${filtros}` : ""}#recursos`;
  };

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

              {/*
                SEGUIDORES: línea simple «N seguidores» y debajo la
                fila de botones (Seguir + cuadrícula). Compartir sigue
                en la barra de la portada.
              */}
              <SeguirButton
                creatorId={creator.id}
                perfilUrl={perfilUrl}
                seguidoresIniciales={seguimiento.seguidores}
                siguiendoInicial={seguimiento.siguiendo}
                esUnoMismo={seguimiento.esUnoMismo}
              >
                {totalRecursos > 0 && (
                  <a
                    href="#recursos"
                    aria-label="Ver sus recursos"
                    title="Ver sus recursos"
                    className="rk-seguir-redondo"
                  >
                    <LayoutGrid aria-hidden />
                  </a>
                )}
              </SeguirButton>

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

              {/*
                PESTAÑAS: sus categorías reales. Filtran sus recursos
                aquí mismo (?categoria=…#recursos), sin salir del perfil.
              */}
              {categorias.length > 0 && (
                <div className="rk-hero-tabs">
                  <PestanasPerfil>
                    {categorias.map((categoria) => (
                      <Link
                        key={categoria.slug}
                        href={urlRecursos(categoria.slug)}
                        className="rk-tab"
                        aria-current={
                          filtro?.slug === categoria.slug ? "page" : undefined
                        }
                      >
                        {nombreDePestana(categoria)}
                        <span className="rk-tab-count">
                          {categoria._count.products}
                        </span>
                      </Link>
                    ))}
                  </PestanasPerfil>
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
                // La página 1 es la URL limpia; el filtro se conserva.
                href={(numero) => urlRecursos(filtro?.slug ?? null, numero)}
              />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
