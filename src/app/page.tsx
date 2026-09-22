import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Download,
  FolderHeart,
  LayoutGrid,
  ShieldCheck,
  Users,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  /*
   * Todos los datos de la home salen de la base de datos.
   * No hay cifras, productos, categorías ni creadores de
   * ejemplo: si algo no existe, su sección no se pinta.
   */
  const [products, categories, creators, productCount] =
    await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          coverUrl: true,
          category: { select: { name: true, slug: true } },
          creator: {
            select: {
              name: true,
              publicName: true,
              username: true,
              creatorStatus: true,
            },
          },
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      }),

      prisma.category.findMany({
        where: { products: { some: { status: "PUBLISHED" } } },
        orderBy: { name: "asc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: {
            select: {
              products: { where: { status: "PUBLISHED" } },
            },
          },
        },
      }),

      prisma.user.findMany({
        where: {
          role: { in: ["CREATOR", "ADMIN"] },
          creatorStatus: "APPROVED",
          username: { not: null },
          products: { some: { status: "PUBLISHED" } },
        },
        orderBy: [{ isVerified: "desc" }, { createdAt: "asc" }],
        take: 4,
        select: {
          id: true,
          name: true,
          publicName: true,
          username: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
          _count: {
            select: {
              products: { where: { status: "PUBLISHED" } },
            },
          },
        },
      }),

      prisma.product.count({ where: { status: "PUBLISHED" } }),
    ]);

  /* Qué ofrece RCKTDMG: solo funciones que existen de verdad. */
  const propuesta = [
    {
      icon: Download,
      title: "Descarga inmediata",
      text: "Tras el pago, el recurso queda disponible en tu cuenta.",
      href: "/mi-cuenta/descargas",
    },
    {
      icon: LayoutGrid,
      title: "Recursos digitales",
      text: "Plantillas y packs listos para usar en tus proyectos.",
      href: "/tienda",
    },
    {
      icon: Users,
      title: "Creadores",
      text: "Cada recurso tiene autor, con su perfil público.",
      href: "/creadores",
    },
    {
      icon: FolderHeart,
      title: "Colecciones",
      text: "Guarda favoritos y organiza lo que te interesa.",
      href: "/mi-cuenta/colecciones",
    },
  ];

  return (
    <>
      <Navbar />

      <main>

        {/* ══════════ HERO ══════════ */}
        <section className="relative overflow-hidden">
          {/*
            Composición abstracta hecha solo con CSS:
            halos, retícula y una forma geométrica girada.
            No se usa ninguna imagen.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -left-40 -top-32 h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-[100px]" />
            <div className="absolute -right-32 top-10 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[90px]" />

            {/* Retícula fina */}
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(var(--rk-border) / 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--rk-border) / 0.16) 1px, transparent 1px)",
                backgroundSize: "clamp(3rem, 6vw, 5rem) clamp(3rem, 6vw, 5rem)",
                maskImage:
                  "radial-gradient(70% 60% at 50% 0%, #000 30%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(70% 60% at 50% 0%, #000 30%, transparent 100%)",
              }}
            />
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-14 sm:px-5 lg:px-8 lg:pb-20 lg:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">

              {/* TEXTO */}
              <div className="rk-fade-up">
                <span className="rk-chip !border-accent/25 !bg-accent/10 !text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  RCKTDMG · Digital resources for creators
                </span>

                <h1 className="rk-title mt-6 text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl">
                  Crea sin
                  <br />
                  empezar
                  <br />
                  <span className="text-accent">desde cero.</span>
                </h1>

                <p className="mt-6 max-w-lg text-[15px] leading-7 text-ink/60 sm:text-lg sm:leading-8">
                  Recursos digitales hechos por creadores, listos
                  para descargar y usar en tus proyectos.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/tienda" className="rk-btn rk-btn-primary">
                    Explorar recursos
                    <ArrowRight size={16} />
                  </Link>

                  <Link href="/creadores" className="rk-btn rk-btn-glass">
                    Ver creadores
                  </Link>
                </div>
              </div>

              {/* VISUAL ABSTRACTO (CSS puro) */}
              <div
                aria-hidden
                className="rk-fade-up rk-enter-2 relative hidden h-[26rem] lg:block"
              >
                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-[3.5rem] border border-line/15 bg-gradient-to-br from-accent/25 via-accent/5 to-transparent backdrop-blur-sm" />

                <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-[62%] -translate-y-[38%] -rotate-6 rounded-[3rem] border border-line/10 bg-surface/50 shadow-rk-lg backdrop-blur-md" />

                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-[28%] -translate-y-[62%] rotate-[18deg] rounded-[2.25rem] bg-accent shadow-rk-float" />

                <div className="absolute bottom-6 left-6 h-20 w-20 rounded-full border border-line/15 bg-surface/40 backdrop-blur-md" />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ RECURSOS DESTACADOS ══════════ */}
        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
          <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rk-eyebrow">Novedades</p>

              <h2 className="rk-title mt-2.5 text-[1.75rem] sm:text-4xl">
                Recursos destacados
              </h2>
            </div>

            <Link
              href="/tienda"
              className="rk-press group inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-accent"
            >
              Ver los {productCount}
              <ArrowUpRight
                size={15}
                className="transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rk-card mt-8 px-6 py-16 text-center">
              <p className="text-sm text-ink/60">
                Todavía no hay recursos publicados.
              </p>
            </div>
          ) : (
            <div className="rk-fade-up rk-enter-1 mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: Number(product.price),
                    coverUrl: product.coverUrl,
                    image: product.images[0] ?? null,
                    category: product.category,
                    creator: {
                      name:
                        product.creator.publicName ||
                        product.creator.name ||
                        "Creador",
                      username:
                        product.creator.creatorStatus === "APPROVED"
                          ? product.creator.username
                          : null,
                    },
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ══════════ CATEGORÍAS ══════════ */}
        {categories.length > 0 && (
          <section className="border-y border-line/10">
            <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
              <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="rk-eyebrow">Explora</p>

                  <h2 className="rk-title mt-2.5 text-[1.75rem] sm:text-4xl">
                    Por categoría
                  </h2>
                </div>

                <Link
                  href="/categorias"
                  className="rk-press text-sm font-medium text-ink/60 transition-colors hover:text-accent"
                >
                  Ver todas
                </Link>
              </div>

              {/*
                La rejilla se adapta al número real de
                categorías: con una sola, una tarjeta suelta
                dentro de cuatro columnas se vería rota.
              */}
              <div
                className={`rk-fade-up rk-enter-1 mt-8 grid gap-3 ${
                  categories.length === 1
                    ? "max-w-sm"
                    : categories.length === 2
                    ? "sm:grid-cols-2 lg:max-w-3xl"
                    : categories.length === 3
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : "sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/tienda?categoria=${category.slug}`}
                    className="rk-card rk-hover-lift rk-press group relative overflow-hidden p-5"
                  >
                    {/* Marca geométrica CSS: no hay imagen de categoría. */}
                    <span
                      aria-hidden
                      className="absolute -right-6 -top-6 h-24 w-24 rotate-12 rounded-[1.75rem] border border-line/10 bg-accent/[0.07] transition-transform duration-normal ease-rk group-hover:rotate-[24deg] group-hover:scale-110"
                    />

                    <span className="relative flex h-10 w-10 items-center justify-center rounded-rk-sm bg-accent/10 text-accent">
                      <LayoutGrid size={17} />
                    </span>

                    <h3 className="relative mt-5 text-[15px] font-semibold tracking-tight">
                      {category.name}
                    </h3>

                    {category.description && (
                      <p className="relative mt-1 line-clamp-2 text-xs leading-5 text-ink/60">
                        {category.description}
                      </p>
                    )}

                    <p className="relative mt-3 text-xs font-medium text-ink/60">
                      {category._count.products}{" "}
                      {category._count.products === 1
                        ? "recurso"
                        : "recursos"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════ CREADORES ══════════ */}
        {creators.length > 0 && (
          <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
            <div className="rk-fade-up flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="rk-eyebrow">Comunidad</p>

                <h2 className="rk-title mt-2.5 text-[1.75rem] sm:text-4xl">
                  Creadores en RCKTDMG
                </h2>
              </div>

              <Link
                href="/creadores"
                className="rk-press text-sm font-medium text-ink/60 transition-colors hover:text-accent"
              >
                Ver todos
              </Link>
            </div>

            <div
              className={`rk-fade-up rk-enter-1 mt-8 grid gap-3 sm:grid-cols-2 ${
                creators.length > 2 ? "lg:grid-cols-4" : "lg:max-w-3xl"
              }`}
            >
              {creators.map((creator) => {
                const displayName =
                  creator.publicName || creator.name || "Creador";

                return (
                  <Link
                    key={creator.id}
                    href={`/creadores/${creator.username}`}
                    className="rk-card rk-hover-lift rk-press group flex items-center gap-3.5 p-4"
                  >
                    {/* Avatar real, o iniciales si no lo tiene. */}
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-rk-sm bg-primary text-base font-semibold text-onprimary">
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold tracking-tight">
                          {displayName}
                        </span>

                        {creator.isVerified && (
                          <BadgeCheck
                            size={14}
                            className="shrink-0 text-accent"
                            aria-label="Creador verificado"
                          />
                        )}
                      </span>

                      <span className="mt-0.5 block truncate text-[11px] text-ink/60">
                        @{creator.username}
                      </span>

                      <span className="mt-1.5 block text-[11px] font-medium text-ink/60">
                        {creator._count.products}{" "}
                        {creator._count.products === 1
                          ? "recurso"
                          : "recursos"}
                      </span>
                    </span>

                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-ink/45 transition-all duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════ PROPUESTA ══════════ */}
        <section className="border-y border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
            <div className="rk-fade-up max-w-xl">
              <p className="rk-eyebrow">Cómo funciona</p>

              <h2 className="rk-title mt-2.5 text-[1.75rem] sm:text-4xl">
                Todo lo que necesitas,
                <br className="hidden sm:block" /> en un solo sitio
              </h2>
            </div>

            <div className="rk-fade-up rk-enter-1 mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {propuesta.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="rk-card rk-hover-lift rk-press group relative overflow-hidden p-5"
                  >
                    <span className="rk-eyebrow !text-accent">
                      0{index + 1}
                    </span>

                    <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-rk-sm bg-accent/10 text-accent transition-transform duration-normal ease-rk group-hover:scale-110">
                      <Icon size={17} />
                    </span>

                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                      {item.title}
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-ink/60">
                      {item.text}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════ CTA FINAL ══════════ */}
        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
          <div className="rk-fade-up relative overflow-hidden rounded-rk-xl border border-line/10 bg-primary px-6 py-14 text-center sm:px-10 sm:py-20">
            {/* Halos y retícula sobre la superficie oscura. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-[80px]" />
              <div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-accent/20 blur-[90px]" />
            </div>

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-onprimary/15 bg-onprimary/10 px-3.5 py-1.5 text-[11px] font-medium text-onprimary/80 backdrop-blur-sm">
                <ShieldCheck size={12} />
                Descarga permanente desde tu cuenta
              </span>

              <h2 className="rk-title mx-auto mt-6 max-w-2xl text-[1.9rem] text-onprimary sm:text-5xl">
                Tu próximo proyecto
                <br />
                empieza aquí.
              </h2>

              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-onprimary/60 sm:text-base">
                Explora los recursos publicados y descarga el que
                necesites.
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/tienda" className="rk-btn rk-btn-primary">
                  Ir a la tienda
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/registro"
                  className="rk-btn border-onprimary/20 bg-onprimary/10 text-onprimary backdrop-blur-sm transition hover:bg-onprimary/20"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
