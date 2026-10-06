import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, Sparkles } from "lucide-react";

import Carousel from "@/components/Carousel";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import {
  SELECCION_TARJETA,
  TAG_PACK,
  aTarjeta,
} from "@/lib/catalogo";

/**
 * Secciones de marketplace del inicio.
 *
 * Se añaden sobre la home existente sin tocarla: cada bloque se
 * oculta por completo si no hay datos reales que mostrar, para
 * que nunca aparezca una sección vacía.
 *
 * Todo sale de PostgreSQL. Aquí no se inventa nada: ni packs,
 * ni popularidad, ni colecciones.
 */

/** Cabecera común: etiqueta, título y enlace opcional. */
function Cabecera({
  kicker,
  titulo,
  descripcion,
  href,
  etiquetaEnlace,
}: {
  kicker: string;
  titulo: string;
  descripcion?: string;
  href?: string;
  etiquetaEnlace?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="rk-kicker">{kicker}</p>

        <h2 className="rk-title mt-3 text-[2rem] sm:text-5xl">
          {titulo}
        </h2>

        {descripcion && (
          <p className="mt-3.5 max-w-xl text-[15px] leading-7 text-ink/60">
            {descripcion}
          </p>
        )}
      </div>

      {href && etiquetaEnlace && (
        <Link
          href={href}
          className="rk-press rk-link-seccion group shrink-0 gap-2 text-sm font-semibold"
        >
          {etiquetaEnlace}
          <ArrowRight
            size={16}
            className="transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}

export default async function SeccionesMarketplace() {
  const [
    coleccionesPublicas,
    packs,
    masGuardados,
  ] = await Promise.all([
    // Solo lo que su dueño decidió publicar.
    prisma.collection.findMany({
      where: {
        isPublic: true,
        items: { some: { product: { status: "PUBLISHED" } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        user: {
          select: { username: true, publicName: true, name: true },
        },
        _count: {
          select: {
            items: { where: { product: { status: "PUBLISHED" } } },
          },
        },
        items: {
          where: { product: { status: "PUBLISHED" } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            product: {
              select: { id: true, name: true, coverUrl: true },
            },
          },
        },
      },
    }),

    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        tags: { some: { tag: { slug: TAG_PACK } } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: SELECCION_TARJETA,
    }),

    /*
      Destacados por interés real: cuántas veces se guardó y se
      descargó cada recurso. No hay métrica inventada; si nadie
      ha guardado nada todavía, el orden queda por fecha y la
      sección sigue teniendo sentido.
    */
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { favorites: { _count: "desc" } },
        { downloads: { _count: "desc" } },
        { createdAt: "desc" },
      ],
      take: 12,
      select: {
        ...SELECCION_TARJETA,
        _count: { select: { favorites: true, downloads: true } },
      },
    }),
  ]);

  // Sin favoritos ni descargas el orden sería solo por fecha
  // y repetiría lo que ya muestra la home: entonces se oculta.
  const hayInteresReal = masGuardados.some(
    (p) => p._count.favorites > 0 || p._count.downloads > 0
  );

  return (
    <>
      {/* ══════════ COLECCIONES PÚBLICAS ══════════ */}
      {coleccionesPublicas.length > 0 && (
        <section className="border-t border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <Cabecera
              kicker="Colecciones"
              titulo="Selecciones de la comunidad"
              descripcion="Conjuntos de recursos agrupados por quienes los usan."
            />

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {coleccionesPublicas.map((coleccion) => {
                const autor =
                  coleccion.user.publicName ||
                  coleccion.user.name ||
                  "Creador";

                const portadas = coleccion.items
                  .map((item) => item.product.coverUrl)
                  .filter((url): url is string => Boolean(url));

                return (
                  <Link
                    key={coleccion.id}
                    href={`/colecciones/${coleccion.id}`}
                    className="rk-tile rk-press group block p-3"
                  >
                    {/* Collage con las portadas que existen. */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {Array.from({ length: 4 }).map((_, indice) => {
                        const url = portadas[indice];

                        return (
                          <div
                            key={indice}
                            className="rk-frame rk-aspect-product !rounded-rk-sm"
                          >
                            {url ? (
                              <Image
                                src={url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 22vw, 10vw"
                              />
                            ) : (
                              <span className="sr-only">
                                Espacio sin imagen
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3.5 flex items-end justify-between gap-3 px-1 pb-1">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold">
                          {coleccion.name}
                        </h3>

                        <p className="mt-1 truncate text-xs text-ink/60">
                          {autor} · {coleccion._count.items}{" "}
                          {coleccion._count.items === 1
                            ? "recurso"
                            : "recursos"}
                        </p>
                      </div>

                      <ArrowRight
                        size={16}
                        aria-hidden
                        className="shrink-0 text-ink/45 transition-transform duration-normal ease-rk group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ PACKS ══════════ */}
      {packs.length > 0 && (
        <section className="rk-onyx">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <Cabecera
              kicker="Packs"
              titulo="Conjuntos completos"
              descripcion="Recursos agrupados en un solo paquete."
              href="/tienda?pack=true"
              etiquetaEnlace="Ver todos los packs"
            />

            <div className="mt-10">
              <Carousel etiqueta="Packs destacados">
                {packs.map((producto) => (
                  <div
                    key={producto.id}
                    className="w-[46vw] max-w-[13.5rem] sm:w-[13.5rem]"
                  >
                    <ProductCard product={aTarjeta(producto)} />
                  </div>
                ))}
              </Carousel>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ ARCHIVOS DESTACADOS ══════════ */}
      {hayInteresReal && masGuardados.length > 0 && (
        <section className="border-t border-line/10">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
            <Cabecera
              kicker="Destacados"
              titulo="Los más guardados"
              descripcion="Ordenados por las veces que la comunidad los guardó y descargó."
              href="/tienda"
              etiquetaEnlace="Explorar la tienda"
            />

            <div className="mt-10">
              <Carousel etiqueta="Archivos destacados">
                {masGuardados.map((producto) => (
                  <div
                    key={producto.id}
                    className="w-[46vw] max-w-[13.5rem] sm:w-[13.5rem]"
                  >
                    <ProductCard product={aTarjeta(producto)} />
                  </div>
                ))}
              </Carousel>
            </div>
          </div>
        </section>
      )}

      {/* Estado sin packs: se explica en vez de desaparecer. */}
      {packs.length === 0 && masGuardados.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-5 lg:px-8">
          <div className="rk-tile flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                aria-hidden
                className="rk-icon-tile h-10 w-10"
              >
                <Layers size={18} />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Todavía no hay packs publicados
                </p>

                <p className="mt-0.5 text-xs text-ink/60">
                  Los creadores pueden marcar un recurso como pack
                  al publicarlo.
                </p>
              </div>
            </div>

            <Link
              href="/tienda"
              className="rk-btn rk-btn-line shrink-0 !px-4 !text-sm"
            >
              <Sparkles size={15} />
              Ver el catálogo
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
