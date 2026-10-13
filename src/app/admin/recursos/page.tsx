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

/** Borde sutil por estado: distingue sin saturar la lista
    (rk-rec-pub es el del preview para los publicados). */
const STATUS_EDGE: Record<string, string> = {
  PENDING_REVIEW: "!border-warning/30",
  PUBLISHED: "rk-rec-pub",
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
    <div data-vista="Recursos">

      {/* ========== CABECERA ========== */}
      <header className="rk-us-cab">
        <h1 className="rk-title" style={{ margin: 0, fontSize: "2rem" }}>
          {isReviewInbox ? "Revisiones" : "Recursos"}
        </h1>

        <p className="rk-us-sub">
          {isReviewInbox
            ? "Recursos pendientes de revisión, en orden de llegada."
            : "Revisa, publica o rechaza los recursos enviados por los creadores."}
        </p>
      </header>

      {/* ========== FILTROS ========== */}
      <div className="rk-us-filtros" role="group" aria-label="Filtrar por estado">
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
              className={`rk-chip shrink-0${active ? " rk-chip-active" : ""}`}
            >
              {filter.label}
              <span className="tabular-nums opacity-50">{filter.count}</span>
            </Link>
          );
        })}
      </div>

      {/* ========== CONTADOR ========== */}
      <div className="rk-us-cont">
        <p>{statusFilter ? STATUS_LABEL[statusFilter] : "Todo el catálogo"}</p>
        <span>
          {visibleResources.length}{" "}
          {visibleResources.length === 1 ? "recurso" : "recursos"}
        </span>
      </div>

      <div className="rk-divider" />

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
        <section className="rk-us-lista" aria-label="Lista de recursos">
          {visibleResources.map((resource) => {
            const image =
              resource.coverUrl || resource.images[0]?.url || null;

            return (
              <article
                key={resource.id}
                className={`rk-card rk-rec ${STATUS_EDGE[resource.status] || ""}`}
              >
                <div className="rk-rec-col">
                  {/*
                    El marco lo decide la pieza: 9:16 solo si es una
                    story, 4:5 para el resto. `cover` recorta, no estira.
                  */}
                  <div
                    className={`rk-rec-img rk-rec-foto ${claseProporcion({
                      categoriaSlug: resource.category.slug,
                      pieceType: resource.pieceType,
                    })} relative overflow-hidden`}
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
                      <span>RcktX</span>
                    )}
                  </div>

                  <div className="rk-rec-tx">
                    <div className="rk-rec-nom">
                      <h2>{resource.name}</h2>
                      <span
                        className={`rk-badge ${STATUS_BADGE[resource.status] || "rk-badge-neutral"}`}
                      >
                        {STATUS_LABEL[resource.status]}
                      </span>
                    </div>

                    <p className="rk-rec-desc">{resource.description}</p>

                    {/* Motivo real del rechazo. */}
                    {resource.status === "REJECTED" && resource.rejectionReason && (
                      <p className="rk-upload-error mt-3">
                        <span className="font-medium">Motivo del rechazo:</span>{" "}
                        {resource.rejectionReason}
                      </p>
                    )}

                    <div className="rk-rec-meta2">
                      <span>
                        {resource.creator.name || "Sin nombre"} · {resource.creator.email}
                      </span>
                      <span>{resource.category.name}</span>
                      <b>S/ {Number(resource.price).toFixed(2)}</b>
                      <span>
                        {new Intl.DateTimeFormat("es-PE", {
                          dateStyle: "medium",
                        }).format(resource.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES */}
                <ResourceActions
                  resourceId={resource.id}
                  resourceSlug={resource.slug}
                  status={resource.status}
                />
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
