import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, UserPlus, Users } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import UserActions from "./UserActions";

export const metadata: Metadata = {
  title: "Usuarios",
};

export const dynamic = "force-dynamic";

const CREATOR_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  SUSPENDED: "Suspendido",
  REJECTED: "Rechazado",
};

const CREATOR_STATUS_BADGE: Record<string, string> = {
  PENDING: "rk-badge-warning",
  APPROVED: "rk-badge-success",
  SUSPENDED: "rk-badge-danger",
  REJECTED: "rk-badge-neutral",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "rk-badge-accent",
  CREATOR: "rk-badge-accent",
  CLIENT: "rk-badge-neutral",
};

type UsuariosPageProps = {
  searchParams: Promise<{
    rol?: string;
  }>;
};

export default async function UsuariosPage({
  searchParams,
}: UsuariosPageProps) {
  const params = await searchParams;

  const roleFilter =
    params.rol === "CLIENT" ||
    params.rol === "CREATOR" ||
    params.rol === "ADMIN"
      ? params.rol
      : null;

  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: roleFilter ? { role: roleFilter } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        publicName: true,
        username: true,
        email: true,
        role: true,
        creatorStatus: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,

        _count: {
          select: {
            products: true,
          },
        },
      },
    }),

    prisma.user.groupBy({
      by: ["role"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const countByRole = (role: string) =>
    counts.find((item) => item.role === role)?._count._all ?? 0;

  const total = counts.reduce(
    (sum, item) => sum + item._count._all,
    0
  );

  // Los contadores salen de la base: ninguno es estimado.
  const filters = [
    { value: null, label: "Todos", count: total },
    {
      value: "CLIENT",
      label: "Clientes",
      count: countByRole("CLIENT"),
    },
    {
      value: "CREATOR",
      label: "Creadores",
      count: countByRole("CREATOR"),
    },
    {
      value: "ADMIN",
      label: "Administradores",
      count: countByRole("ADMIN"),
    },
  ];

  // La vista de creadores tiene su propia entrada en el menú:
  // cuando el filtro está activo, la página lo refleja.
  const isCreatorsView = roleFilter === "CREATOR";

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="rk-eyebrow">Admin Center</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            {isCreatorsView ? "Creadores" : "Usuarios"}
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            {isCreatorsView
              ? "Estados, verificación y catálogo de cada creador."
              : "Gestiona clientes, creadores, verificación y estados."}
          </p>
        </div>

        <Link
          href="/admin/usuarios/nuevo"
          className="rk-btn rk-btn-primary shrink-0"
        >
          <UserPlus size={16} />
          Crear creador
        </Link>
      </header>

      {/* ========== FILTROS ========== */}
      <section className="rk-fade-up rk-enter-1 mt-7">
        <div
          role="group"
          aria-label="Filtrar por rol"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {filters.map((filter) => {
            const active = roleFilter === filter.value;

            return (
              <Link
                key={filter.label}
                href={
                  filter.value
                    ? `/admin/usuarios?rol=${filter.value}`
                    : "/admin/usuarios"
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
          {isCreatorsView ? "Creadores" : "Cuentas"}
        </p>

        <span className="text-sm font-medium tabular-nums text-ink/60">
          {users.length}{" "}
          {users.length === 1 ? "usuario" : "usuarios"}
        </span>
      </div>

      <div className="rk-divider mt-4" />

      {/* ========== LISTA ========== */}
      {users.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Users}
            title="No hay usuarios con este filtro"
            description="Cambia de filtro para ver otras cuentas registradas."
            action={{ href: "/admin/usuarios", label: "Ver todos" }}
          />
        </div>
      ) : (
        <section className="rk-fade-up rk-enter-2 mt-5 space-y-2.5">
          {users.map((user) => {
            const displayName =
              user.publicName || user.name || "Sin nombre";

            return (
              <article
                key={user.id}
                className="rk-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* DATOS */}
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="rk-media relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-ink/70">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold">
                        {displayName}
                      </p>

                      {/* Verificación real del registro. */}
                      {user.isVerified && (
                        <span
                          title="Creador verificado"
                          className="rk-badge rk-badge-accent"
                        >
                          <BadgeCheck size={12} />
                          Verificado
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-sm text-ink/60">
                      {user.email}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span
                        className={`rk-badge ${
                          ROLE_BADGE[user.role] ||
                          "rk-badge-neutral"
                        }`}
                      >
                        {user.role}
                      </span>

                      {user.creatorStatus && (
                        <span
                          className={`rk-badge ${
                            CREATOR_STATUS_BADGE[
                              user.creatorStatus
                            ] || "rk-badge-neutral"
                          }`}
                        >
                          {
                            CREATOR_STATUS_LABEL[
                              user.creatorStatus
                            ]
                          }
                        </span>
                      )}

                      {user.role === "CREATOR" && (
                        <span className="text-xs text-ink/60">
                          {user._count.products}{" "}
                          {user._count.products === 1
                            ? "recurso"
                            : "recursos"}
                        </span>
                      )}

                      {/* El perfil público solo existe si hay
                          username y el creador está aprobado. */}
                      {user.username &&
                        user.creatorStatus === "APPROVED" && (
                          <Link
                            href={`/creadores/${user.username}`}
                            className="rk-press text-xs font-medium text-accent transition-opacity hover:opacity-75"
                          >
                            @{user.username}
                          </Link>
                        )}

                      <span className="text-xs text-ink/60">
                        {new Intl.DateTimeFormat("es-PE", {
                          dateStyle: "medium",
                        }).format(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES */}
                <div className="lg:shrink-0">
                  <UserActions
                    userId={user.id}
                    role={user.role}
                    creatorStatus={user.creatorStatus}
                    isVerified={user.isVerified}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
