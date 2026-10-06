import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardCheck, Inbox } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { claseProporcion } from "@/lib/tipos-publicacion";
import { requireRole } from "@/lib/session";
import ResourceActions from "./ResourceActions";

export const metadata: Metadata = {
  title: "Recursos",
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "Pendiente",
  PUBLISHED: "Publicado",
  REJECTED: "Rechazado",
  ARCHIVED: "Archivado",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "rk-badge-neutral",
  PENDING_REVIEW: "rk-badge-warning",
  PUBLISHED: "rk-badge-success",
  REJECTED: "rk-badge-danger",
  ARCHIVED: "rk-badge-neutral",
};

/** Borde sutil por estado: distingue sin saturar la lista. */
const STATUS_EDGE: Record<string, string> = {
  PENDING_REVIEW: "!border-warning/30",
  PUBLISHED: "!border-success/25",
  REJECTED: "!border-danger/30",
};

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

export default async function RecursosAdminPage({
  searchParams,
}: PageProps) {
  const admin = await requireRole(["ADMIN"]);

  if (!admin) {
    redirect("/login");
  }

  const params = await searchParams;

  const statusFilter =
    params.estado && STATUS_LABEL[params.estado]
      ? params.estado
      : null;

  const [resources, counts] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        creator: {
          select: {
            name: true,
            email: true,
            username: true,
          },
        },
        category: {
          select: {
            name: true,
            /* Con él se decide la proporción de la miniatura. */
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    }),

    prisma.product.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // El filtro se aplica en memoria para no complicar el tipado
  // del enum de Prisma con un valor que llega de la URL.
  const visibleResources = statusFilter
    ? resources.filter(
        (resource) => resource.status === statusFilter
      )
    : resources;

  const countFor = (status: string) =>
    counts.find((item) => item.status === status)?._count._all ?? 0;

  const total = counts.reduce(
    (sum, item) => sum + item._count._all,
    0
  );

  const filters = [
    { value: null, label: "Todos", count: total },
    {
      value: "PENDING_REVIEW",
      label: "Pendientes",
      count: countFor("PENDING_REVIEW"),
    },
    {
      value: "PUBLISHED",
      label: "Publicados",
      count: countFor("PUBLISHED"),
    },
    {
      value: "REJECTED",
      label: "Rechazados",
      count: countFor("REJECTED"),
    },
    {
      value: "DRAFT",
      label: "Borradores",
      count: countFor("DRAFT"),
    },
  ];

  /*
    "Revisiones" no es una ruta aparte: es esta misma página
    con el filtro de pendientes, que es a donde apuntan el
    menú lateral y los accesos del dashboard. Cuando ese
    filtro está activo, la página se presenta como bandeja
    de moderación.
  */
  const isReviewInbox = statusFilter === "PENDING_REVIEW";

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up">
        <p className="rk-eyebrow">Admin Center</p>

        <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
          {isReviewInbox ? "Revisiones" : "Recursos"}
        </h1>

        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
          {isReviewInbox
            ? "Recursos pendientes de revisión, en orden de llegada."
            : "Revisa, publica o rechaza los recursos enviados por los creadores."}
        </p>
      </header>

      {/* ========== FILTROS ========== */}
      <section className="rk-fade-up rk-enter-1 mt-7">
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {filters.map((filter) => {
            const active = statusFilter === filter.value;

            return (
              <Link
                key={filter.label}
                href={
                  filter.value
                    ? `/admin/recursos?estado=${filter.value}`
                    : "/admin/recursos"
                }
                aria-current={active ? "true" : undefined}
                className={`rk-chip shrink-0 ${
                  active ? "rk-chip-active" : ""
                }`}
              >
                {filter.label}
                <span className="tabular-nums opacity-50">
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ========== CONTADOR ========== */}
      <div className="rk-fade-up mt-6 flex items-baseline justify-between gap-4">
        <p className="text-[15px] text-ink/60">
          {statusFilter
            ? STATUS_LABEL[statusFilter]
            : "Todo el catálogo"}
        </p>

        <span className="text-sm font-medium tabular-nums text-ink/60">
          {visibleResources.length}{" "}
          {visibleResources.length === 1 ? "recurso" : "recursos"}
        </span>
      </div>

      <div className="rk-divider mt-4" />

      {/* ========== LISTA ========== */}
      {visibleResources.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={isReviewInbox ? ClipboardCheck : Inbox}
            title={
              isReviewInbox
                ? "No hay recursos pendientes de revisión"
                : "No hay recursos con este filtro"
            }
            description={
              isReviewInbox
                ? "Cuando un creador envíe un recurso a revisión aparecerá aquí."
                : "Cambia de filtro para ver otros recursos del catálogo."
            }
            action={{
              href: "/admin/recursos",
              label: "Ver todo el catálogo",
            }}
          />
        </div>
      ) : (
        <section className="rk-fade-up rk-enter-2 mt-5 space-y-3">
          {visibleResources.map((resource) => {
            const image =
              resource.coverUrl || resource.images[0]?.url || null;

            return (
              <article
                key={resource.id}
                className={`rk-card p-4 sm:p-5 ${
                  STATUS_EDGE[resource.status] || ""
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

                  {/*
                    El marco lo decide la pieza: 9:16 solo si
                    es una story, 4:5 para el resto. La imagen
                    sigue nítida y `cover` recorta, no estira.
                  */}
                  <div
                    className={`rk-media ${claseProporcion(
                      {
                      categoriaSlug: resource.category.slug,
                      pieceType: resource.pieceType,
                    }
                    )} relative w-20 shrink-0 overflow-hidden rounded-rk-sm sm:w-24`}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={resource.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                        RCKTDMG
                      </span>
                    )}
                  </div>

                  {/* DATOS */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold leading-snug">
                        {resource.name}
                      </h2>

                      <span
                        className={`rk-badge ${
                          STATUS_BADGE[resource.status] ||
                          "rk-badge-neutral"
                        }`}
                      >
                        {STATUS_LABEL[resource.status]}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">
                      {resource.description}
                    </p>

                    {/* Motivo real del rechazo. */}
                    {resource.status === "REJECTED" &&
                      resource.rejectionReason && (
                        <p className="rk-upload-error mt-3">
                          <span className="font-medium">
                            Motivo del rechazo:
                          </span>{" "}
                          {resource.rejectionReason}
                        </p>
                      )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
                      <span className="truncate">
                        {resource.creator.name || "Sin nombre"}
                        <span className="text-ink/60">
                          {" · "}
                          {resource.creator.email}
                        </span>
                      </span>

                      <span>{resource.category.name}</span>

                      <span className="font-medium tabular-nums text-ink/60">
                        S/ {Number(resource.price).toFixed(2)}
                      </span>

                      <span>
                        {new Intl.DateTimeFormat("es-PE", {
                          dateStyle: "medium",
                        }).format(resource.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="shrink-0 lg:pt-1">
                    <ResourceActions
                      resourceId={resource.id}
                      resourceSlug={resource.slug}
                      status={resource.status}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
