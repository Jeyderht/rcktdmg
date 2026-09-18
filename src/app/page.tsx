import Link from "next/link";
import { ArrowRight, Compass, LayoutGrid, Sparkles, Users } from "lucide-react";

import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, categories, creatorCount, productCount] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          status: "PUBLISHED",
        },
        include: {
          category: true,

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
        take: 6,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.category.findMany({
        where: {
          products: {
            some: {
              status: "PUBLISHED",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,

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
      }),

      prisma.user.count({
        where: {
          role: "CREATOR",
          creatorStatus: "APPROVED",
        },
      }),

      prisma.product.count({
        where: {
          status: "PUBLISHED",
        },
      }),
    ]);

  const quickAccess = [
    {
      href: "/tienda",
      label: "Explorar",
      hint: `${productCount} ${productCount === 1 ? "recurso" : "recursos"}`,
      icon: Compass,
    },
    {
      href: "/categorias",
      label: "Categorías",
      hint: `${categories.length} ${
        categories.length === 1 ? "colección" : "colecciones"
      }`,
      icon: LayoutGrid,
    },
    {
      href: "/creadores",
      label: "Creadores",
      hint: `${creatorCount} ${creatorCount === 1 ? "activo" : "activos"}`,
      icon: Users,
    },
    {
      href: "/planes",
      label: "Planes",
      hint: "Suscripciones",
      icon: Sparkles,
    },
  ];

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-5 lg:px-8 lg:pb-24 lg:pt-12">

        {/* PORTADA */}
        <section className="rk-enter">
          <div className="rk-glass relative overflow-hidden rounded-[2rem] px-6 py-12 sm:rounded-[2.5rem] sm:px-10 sm:py-16 lg:px-14 lg:py-20">

            {/* Halo decorativo */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[rgb(0_122_160/0.16)] blur-3xl"
            />

            <div className="relative">
              <span className="rk-chip">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Marketplace de recursos digitales
              </span>

              <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.03] sm:text-6xl lg:text-7xl">
                Crea más.
                <br />
                <span className="text-ink/35">Diseña mejor.</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink/55 sm:text-lg sm:leading-8">
                Descubre, compra y descarga recursos profesionales
                creados por diseñadores.
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <Link
                  href="/tienda"
                  className="rk-btn rk-btn-primary"
                >
                  Explorar recursos
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/creadores"
                  className="rk-btn rk-btn-glass"
                >
                  Ser creador
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ACCESOS RÁPIDOS */}
        <section className="rk-enter rk-enter-1 mt-4 sm:mt-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {quickAccess.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rk-card rk-card-hover rk-press group flex flex-col justify-between rounded-[1.5rem] p-4 sm:p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-primary text-onprimary shadow-rk-sm transition-transform duration-500 ease-rk group-hover:scale-110">
                    <Icon size={18} />
                  </span>

                  <span className="mt-5 block">
                    <span className="block text-[15px] font-semibold tracking-tight">
                      {item.label}
                    </span>

                    <span className="mt-0.5 block text-xs text-ink/45">
                      {item.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CATEGORÍAS */}
        {categories.length > 0 && (
          <section className="rk-enter rk-enter-2 mt-10 sm:mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="rk-eyebrow">Explora</p>

                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                  Por categoría
                </h2>
              </div>

              <Link
                href="/categorias"
                className="rk-press text-sm font-medium text-ink/55 transition-colors hover:text-ink"
              >
                Ver todas
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/tienda?categoria=${category.slug}`}
                  className="rk-chip"
                >
                  {category.name}
                  <span className="text-ink/30">
                    {category._count.products}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* RECURSOS DESTACADOS */}
        <section className="rk-enter rk-enter-3 mt-10 sm:mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Novedades</p>

              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Recursos destacados
              </h2>
            </div>

            <Link
              href="/tienda"
              className="rk-btn rk-btn-glass !px-4 !py-2.5"
            >
              Ver todos
              <ArrowRight size={15} />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rk-card mt-6 px-6 py-16 text-center">
              <p className="text-sm text-ink/45">
                Todavía no hay recursos publicados.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {products.map((product) => (
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
