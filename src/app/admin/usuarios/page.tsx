import Link from "next/link";
import type { Metadata } from "next";

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

const CREATOR_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning/12 text-warning",
  APPROVED: "bg-success/12 text-success",
  SUSPENDED: "bg-danger/10 text-danger",
  REJECTED: "bg-ink/[0.09] text-ink/70",
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

  return (
    <>


      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-8 lg:py-12">

          {/* ENCABEZADO */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-ink/40">
                Admin Center
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Usuarios
              </h1>

              <p className="mt-2 text-sm text-ink/50">
                Gestiona clientes, creadores, verificación y
                estados.
              </p>
            </div>

            <Link
              href="/admin/usuarios/nuevo"
              className="inline-flex w-fit rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80"
            >
              + Crear creador
            </Link>
          </div>

          {/* FILTROS */}
          <div className="mt-8 flex flex-wrap gap-2">
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
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-ink bg-primary text-onprimary"
                      : "border-ink/10 bg-surface text-ink/60 hover:border-ink/30"
                  }`}
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-60">
                    {filter.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* LISTA */}
          <section className="mt-6 overflow-hidden rk-card">

            <div className="border-b border-ink/[0.07] px-5 py-4 sm:px-6">
              <h2 className="font-semibold">
                {users.length}{" "}
                {users.length === 1 ? "usuario" : "usuarios"}
              </h2>
            </div>

            {users.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-ink/40">
                No hay usuarios con este filtro.
              </p>
            ) : (
              <ul className="divide-y divide-ink/[0.07]">
                {users.map((user) => {
                  const displayName =
                    user.publicName || user.name || "Sin nombre";

                  return (
                    <li
                      key={user.id}
                      className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                    >
                      {/* DATOS */}
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-onprimary">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">
                              {displayName}
                            </p>

                            {user.isVerified && (
                              <span
                                title="Creador verificado"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-onprimary"
                              >
                                ✓
                              </span>
                            )}
                          </div>

                          <p className="truncate text-sm text-ink/50">
                            {user.email}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                user.role === "ADMIN"
                                  ? "bg-primary text-onprimary"
                                  : user.role === "CREATOR"
                                  ? "bg-accent/12 text-accent"
                                  : "bg-ink/[0.05] text-ink/70"
                              }`}
                            >
                              {user.role}
                            </span>

                            {user.creatorStatus && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  CREATOR_STATUS_STYLE[
                                    user.creatorStatus
                                  ]
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
                              <span className="text-xs text-ink/40">
                                {user._count.products}{" "}
                                {user._count.products === 1
                                  ? "recurso"
                                  : "recursos"}
                              </span>
                            )}

                            {user.username &&
                              user.creatorStatus === "APPROVED" && (
                                <Link
                                  href={`/creadores/${user.username}`}
                                  className="text-xs text-ink/50 underline underline-offset-2 transition hover:text-ink"
                                >
                                  @{user.username}
                                </Link>
                              )}

                            <span className="text-xs text-ink/35">
                              {new Date(
                                user.createdAt
                              ).toLocaleDateString("es-PE")}
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
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
