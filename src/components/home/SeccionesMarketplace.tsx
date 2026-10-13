import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ProductCard, { type ProductCardData } from "@/components/tienda/ProductCard";
import { prisma } from "@/lib/prisma";
import {
  SELECCION_TARJETA,
  TAG_PACK,
  aTarjeta,
} from "@/lib/catalogo";

/**
 * Selecciones de la comunidad, packs y los más guardados.
 *
 * Son tres pestañas del catálogo del inicio (CatalogoPestanas).
 * Las consultas viven aquí y las lanza page.tsx con las demás,
 * en el mismo Promise.all; así la página sabe qué pestañas
 * tienen contenido antes de pintar la barra. Una pestaña sin
 * datos reales no se pinta, para que nunca aparezca vacía.
 *
 * Todo sale de PostgreSQL. Aquí no se inventa nada: ni packs,
 * ni popularidad, ni colecciones.
 */
export async function datosMarketplace() {
  const [coleccionesPublicas, packs, masGuardados] = await Promise.all([
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
      ha guardado nada todavía, el orden queda por fecha.
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
  // y repetiría lo que ya muestra «Destacados»: entonces se oculta.
  const hayInteresReal = masGuardados.some(
    (p) => p._count.favorites > 0 || p._count.downloads > 0
  );

  return {
    coleccionesPublicas,
    packs: packs.map(aTarjeta),
    masGuardados: hayInteresReal ? masGuardados.map(aTarjeta) : [],
  };
}

type DatosMarketplace = Awaited<ReturnType<typeof datosMarketplace>>;

/** Pestaña «Selecciones»: colecciones públicas de la comunidad. */
export function CuerpoSelecciones({
  colecciones,
}: {
  colecciones: DatosMarketplace["coleccionesPublicas"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {colecciones.map((coleccion) => {
        const autor =
          coleccion.user.publicName || coleccion.user.name || "Creador";

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
                      <span className="sr-only">Espacio sin imagen</span>
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
                  {coleccion._count.items === 1 ? "recurso" : "recursos"}
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
  );
}

/** Riel de tarjetas: pestañas «Packs», «Guardados» y «Para ti». */
export function RielTarjetas({ productos }: { productos: ProductCardData[] }) {
  return (
    <div className="rk-rail pb-2">
      {productos.map((producto) => (
        <div
          key={producto.id}
          className="w-[46vw] max-w-[13.5rem] sm:w-[13.5rem]"
        >
          <ProductCard product={producto} />
        </div>
      ))}
    </div>
  );
}
