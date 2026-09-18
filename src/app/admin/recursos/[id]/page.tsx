import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ResourceActions from "../ResourceActions";

import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminRecursoPage({ params }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifySessionToken(token);

  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;

  const resource = await prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      creator: true,
      category: true,
    },
  });

  if (!resource) {
    notFound();
  }

  const statusLabel =
    resource.status === "PENDING_REVIEW"
      ? "Pendiente de revisión"
      : resource.status === "PUBLISHED"
        ? "Publicado"
        : resource.status === "REJECTED"
          ? "Rechazado"
          : resource.status === "DRAFT"
            ? "Borrador"
            : resource.status;

  return (
    <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/recursos"
          className="mb-8 inline-block text-sm text-ink/50 hover:text-ink"
        >
          ← Volver a recursos
        </Link>

        <div className="rk-card p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
                Vista administrativa
              </p>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                {resource.name}
              </h1>

              <span className="mt-4 inline-flex rounded-full bg-warning/12 px-3 py-1 text-xs font-medium text-warning">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs text-ink/40">Creador</p>
              <p className="mt-1 text-base">
                {resource.creator.name || "Sin nombre"}
              </p>
            </div>

            <div>
              <p className="text-xs text-ink/40">Correo</p>
              <p className="mt-1 text-base">
                {resource.creator.email}
              </p>
            </div>

            <div>
              <p className="text-xs text-ink/40">Categoría</p>
              <p className="mt-1 text-base">
                {resource.category.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-ink/40">Precio</p>
              <p className="mt-1 text-base font-semibold">
                S/ {resource.price.toString()}
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="text-xl font-semibold">
              Descripción
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/60">
              {resource.description}
            </p>
          </div>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="text-xl font-semibold">
              Archivos
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-ink/[0.05] p-4 text-sm">
                <span className="font-medium">
                  Portada:
                </span>{" "}
                {resource.coverUrl
                  ? "Configurada"
                  : "No configurada"}
              </div>

              <div className="rounded-2xl bg-ink/[0.05] p-4 text-sm">
                <span className="font-medium">
                  Vista previa:
                </span>{" "}
                {resource.previewUrl
                  ? "Configurada"
                  : "No configurada"}
              </div>

              <div
                className={`rounded-2xl p-4 text-sm ${resource.fileUrl
                  ? "bg-success/12 text-success"
                  : "bg-warning/12 text-warning"
                  }`}
              >
                <span className="font-medium">
                  Archivo del producto:
                </span>{" "}
                {resource.fileUrl
                  ? "✓ Archivo cargado"
                  : "⚠ Archivo pendiente"}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-ink/10 pt-8">
            <Link
              href="/admin/recursos"
              className="rounded-full border border-ink/10 px-6 py-3 text-sm hover:bg-primary hover:text-onprimary"
            >
              Volver
            </Link>

            {resource.status === "PUBLISHED" && (
              <Link
                href={`/tienda/${resource.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-primary px-6 py-3 text-sm text-onprimary hover:opacity-80"
              >
                Ver publicación
              </Link>
            )}

            <ResourceActions
              resourceId={resource.id}
              resourceSlug={resource.slug}
              status={resource.status}
            />
          </div>
        </div>
      </div>
    </main>
  );
}