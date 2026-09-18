import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";

import { prisma } from "@/lib/prisma";
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

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-ink/[0.06] text-ink/60",
  PENDING_REVIEW: "bg-warning/12 text-warning",
  PUBLISHED: "bg-success/12 text-success",
  REJECTED: "bg-danger/10 text-danger",
  ARCHIVED: "bg-ink/[0.09] text-ink/70",
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

      <Link
        href="/admin"
        className="rk-press mb-5 inline-flex items-center gap-1.5 text-sm text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} />
        Volver al panel
      </Link>

      {/* ENCABEZADO */}
      <section className="rk-enter">
        <div className="rk-glass rounded-[2rem] px-5 py-8 sm:rounded-[2.5rem] sm:px-9 sm:py-10">
          <p className="rk-eyebrow">Admin Center</p>

          <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight sm:text-4xl">
            Recursos
          </h1>

          <p className="mt-2.5 max-w-xl text-[15px] leading-7 text-ink/50">
            Revisa, publica o rechaza los recursos enviados por
            los creadores.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.label}
                href={
                  filter.value
                    ? `/admin/recursos?estado=${filter.value}`
                    : "/admin/recursos"
                }
                className={`rk-chip ${
                  statusFilter === filter.value
                    ? "rk-chip-active"
                    : ""
                }`}
              >
                {filter.label}
                <span className="opacity-50">{filter.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LISTA */}
      {visibleResources.length === 0 ? (
        <div className="rk-enter rk-enter-1 rk-card mt-5 px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-ink/[0.05]">
            <Inbox size={24} className="text-ink/35" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No hay recursos con este filtro
          </h2>
        </div>
      ) : (
        <div className="rk-enter rk-enter-1 mt-5 space-y-3">
          {visibleResources.map((resource) => {
            const image =
              resource.coverUrl || resource.images[0]?.url || null;

            return (
              <article
                key={resource.id}
                className="rk-card p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

                  {/* MINIATURA */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-gradient-to-br from-ink/[0.04] to-ink/[0.08]">
                    {image ? (
                      <img
                        src={image}
                        alt={resource.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-ink/25">
                          RK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DATOS */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold leading-snug">
                        {resource.name}
                      </h2>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          STATUS_STYLE[resource.status]
                        }`}
                      >
                        {STATUS_LABEL[resource.status]}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/50">
                      {resource.description}
                    </p>

                    {resource.status === "REJECTED" &&
                      resource.rejectionReason && (
                        <p className="mt-3 rounded-[0.9rem] bg-danger/10 px-3.5 py-2.5 text-xs leading-5 text-danger">
                          <span className="font-medium">
                            Motivo del rechazo:
                          </span>{" "}
                          {resource.rejectionReason}
                        </p>
                      )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/45">
                      <span>
                        {resource.creator.name || "Sin nombre"}
                        <span className="text-ink/30">
                          {" · "}
                          {resource.creator.email}
                        </span>
                      </span>

                      <span>{resource.category.name}</span>

                      <span className="font-medium text-ink/60">
                        S/ {Number(resource.price).toFixed(2)}
                      </span>

                      <span>
                        {new Date(
                          resource.createdAt
                        ).toLocaleDateString("es-PE")}
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
        </div>
      )}
    </main>
  );
}
