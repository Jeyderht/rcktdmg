import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/pricing";
import { ETIQUETA_ESTADO } from "@/lib/packs-comun";

export const metadata: Metadata = { title: "Packs" };

export const dynamic = "force-dynamic";

/**
 * Packs, vista de administración.
 *
 * Solo lectura: quién lo creó, en qué estado está y qué
 * incluye. Los packs no pasan por una cola de revisión —sus
 * recursos ya la pasaron—, así que no hay nada que aprobar
 * aquí; para retirar uno se usa el archivado desde el Creator
 * Studio, al que un ADMIN también tiene acceso.
 */
export default async function AdminPacksPage() {
  const packs = await prisma.pack.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      status: true,
      createdAt: true,
      coverUrl: true,
      creator: {
        select: { name: true, publicName: true, username: true },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          product: {
            select: { id: true, name: true, slug: true, price: true },
          },
        },
      },
      _count: { select: { orderItems: true } },
    },
  });

  const fecha = (d: Date) =>
    new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(d);

  return (
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Catálogo</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">Packs</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Agrupaciones de recursos publicadas por los creadores.
          Solo pueden contener recursos propios ya publicados.
        </p>
      </header>

      <div className="rk-divider mt-7" />

      {packs.length === 0 ? (
        <div className="mt-8 text-center">
          <div
            aria-hidden
            className="rk-empty-icon mx-auto"
          >
            <Layers size={20} className="text-ink/55" />
          </div>

          <p className="mt-3 text-sm text-ink/60">
            Todavía no hay packs creados.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {packs.map((pack) => {
            const suma = pack.items.reduce(
              (t, i) => t + Number(i.product.price),
              0
            );

            return (
              <li
                key={pack.id}
                className="rounded-rk-sm border border-line/12 px-4 py-3.5"
              >
                <div className="flex items-start gap-3.5">
                  <span className="rk-media relative h-12 w-12 shrink-0 overflow-hidden rounded-rk-sm">
                    {pack.coverUrl && (
                      <Image
                        src={pack.coverUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      {pack.status === "PUBLISHED" ? (
                        <Link
                          href={`/packs/${pack.slug}`}
                          className="truncate font-medium underline-offset-4 hover:underline"
                        >
                          {pack.name}
                        </Link>
                      ) : (
                        <span className="truncate font-medium">
                          {pack.name}
                        </span>
                      )}

                      <span
                        className={`rk-badge ${
                          pack.status === "PUBLISHED"
                            ? "rk-badge-success"
                            : pack.status === "ARCHIVED"
                              ? "rk-badge-warning"
                              : "rk-badge-neutral"
                        }`}
                      >
                        {ETIQUETA_ESTADO[pack.status]}
                      </span>
                    </p>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink/55">
                      <span>
                        {pack.creator.publicName ||
                          pack.creator.name ||
                          (pack.creator.username
                            ? `@${pack.creator.username}`
                            : "Creador")}
                      </span>

                      <span className="tabular-nums">
                        {formatPrice(Number(pack.price))}
                        {suma > Number(pack.price) && (
                          <span className="text-ink/40">
                            {" "}
                            (suelto {formatPrice(suma)})
                          </span>
                        )}
                      </span>

                      <span className="tabular-nums">
                        {pack.items.length}{" "}
                        {pack.items.length === 1 ? "recurso" : "recursos"}
                      </span>

                      <span className="tabular-nums">
                        {pack._count.orderItems} líneas vendidas
                      </span>

                      <span>{fecha(pack.createdAt)}</span>
                    </p>

                    {pack.items.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {pack.items.map((i) => (
                          <li key={i.product.id}>
                            <Link
                              href={`/tienda/${i.product.slug}`}
                              className="rk-chip !py-1 !text-[11px]"
                            >
                              {i.product.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
