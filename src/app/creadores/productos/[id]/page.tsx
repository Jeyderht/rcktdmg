import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  BarChart3,
  ChevronLeft,
  ExternalLink,
  ImageIcon,
  Pencil,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusInfo = {
  DRAFT: {
    label: "Borrador",
    badge: "rk-badge-neutral",
  },
  PENDING_REVIEW: {
    label: "Pendiente de revisión",
    badge: "rk-badge-warning",
  },
  PUBLISHED: {
    label: "Publicado",
    badge: "rk-badge-success",
  },
  REJECTED: {
    label: "Rechazado",
    badge: "rk-badge-danger",
  },
  ARCHIVED: {
    label: "Archivado",
    badge: "rk-badge-neutral",
  },
} as const;

const accessLabels = {
  INDIVIDUAL: "Compra individual",
  PLAN: "Solo planes",
  BOTH: "Compra + planes",
} as const;

export default async function CreatorProductPage({
  params,
}: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifySessionToken(token);

  if (!session || typeof session.userId !== "string") {
    redirect("/login");
  }

  if (session.role !== "CREATOR" && session.role !== "ADMIN") {
    redirect("/");
  }

  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      creatorId: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      accessType: true,
      status: true,
      rejectionReason: true,
      coverUrl: true,
      previewUrl: true,
      fileUrl: true,
      createdAt: true,
      category: true,
      creator: true,
    },
  });

  if (!product) {
    notFound();
  }

  if (!product.slug) {
    throw new Error("Este recurso no tiene un slug configurado.");
  }

  // Un creador solamente puede gestionar sus propios recursos.
  if (
    session.role !== "ADMIN" &&
    product.creatorId !== session.userId
  ) {
    redirect("/creadores/panel/recursos");
  }

  const status = statusInfo[product.status];

  const specs = [
    {
      label: "Categoría",
      value: product.category?.name || "Sin categoría",
    },
    {
      label: "Precio",
      value: `S/ ${Number(product.price).toFixed(2)}`,
    },
    {
      label: "Acceso",
      value: accessLabels[product.accessType],
    },
    {
      label: "Creado",
      value: new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
      }).format(product.createdAt),
    },
  ];

  // Estado real de cada archivo: nada se da por hecho.
  const files = [
    {
      label: "Archivo principal",
      ready: Boolean(product.fileUrl),
      readyText: "Cargado y listo para entregar",
      pendingText: "Todavía sin archivo",
    },
    {
      label: "Portada",
      ready: Boolean(product.coverUrl),
      readyText: "Portada configurada",
      pendingText: "Sin portada",
    },
    {
      label: "Vista previa",
      ready: Boolean(product.previewUrl),
      readyText: "Vista previa configurada",
      pendingText: "Sin vista previa",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up">
        <Link
          href="/creadores/panel/recursos"
          className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
        >
          <ChevronLeft size={15} />
          Mis recursos
        </Link>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            {/* Contenido visual 9:16, siempre nítido. */}
            <div className="rk-media rk-aspect-product relative w-20 shrink-0 overflow-hidden rounded-rk-md sm:w-24">
              {product.coverUrl ? (
                <Image
                  src={product.coverUrl}
                  alt={product.name}
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

            <div className="min-w-0">
              <p className="rk-eyebrow">Recurso</p>

              <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
                {product.name}
              </h1>

              <span className={`rk-badge mt-3 ${status.badge}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {product.status === "PUBLISHED" && (
              <Link
                href={`/tienda/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rk-btn rk-btn-primary rk-btn-compact !px-4 !py-2.5 !text-sm"
              >
                <ExternalLink size={15} />
                Ver publicación
              </Link>
            )}

            <Link
              href={`/creadores/productos/${product.id}/estadisticas`}
              className="rk-btn rk-btn-glass rk-btn-compact !px-4 !py-2.5 !text-sm"
            >
              <BarChart3 size={15} />
              Estadísticas
            </Link>
          </div>
        </div>
      </header>

      {/* ========== MOTIVO REAL DEL RECHAZO ========== */}
      {product.status === "REJECTED" && product.rejectionReason && (
        <div className="rk-fade mt-6 rounded-rk-md border border-danger/25 bg-danger/10 p-5">
          <p className="text-sm font-semibold text-danger">
            Recurso rechazado
          </p>

          <p className="mt-1.5 text-sm leading-6 text-danger">
            <span className="font-medium">Motivo:</span>{" "}
            {product.rejectionReason}
          </p>
        </div>
      )}

      {/* ========== DATOS ========== */}
      <section className="rk-fade-up rk-enter-1 mt-7">
        <p className="rk-eyebrow">Información</p>

        <div className="rk-divider mt-3" />

        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="text-xs text-ink/60">{spec.label}</dt>

              <dd className="mt-1.5 text-sm font-medium">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ========== DESCRIPCIÓN ========== */}
      <section className="rk-fade-up rk-enter-2 mt-8">
        <p className="rk-eyebrow">Descripción</p>

        <div className="rk-divider mt-3" />

        <div className="rk-card mt-4 p-5">
          <p className="whitespace-pre-line text-[15px] leading-7 text-ink/65">
            {product.description}
          </p>
        </div>
      </section>

      {/* ========== ARCHIVOS ========== */}
      <section className="rk-fade-up rk-enter-3 mt-8">
        <p className="rk-eyebrow">Archivos</p>

        <div className="rk-divider mt-3" />

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {files.map((file) => (
            <div key={file.label} className="rk-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{file.label}</p>

                <span
                  className={`rk-badge shrink-0 ${
                    file.ready
                      ? "rk-badge-success"
                      : "rk-badge-warning"
                  }`}
                >
                  {file.ready ? "Listo" : "Pendiente"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-ink/60">
                {file.ready ? file.readyText : file.pendingText}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== ACCIONES ========== */}
      <section className="rk-fade-up mt-8">
        <p className="rk-eyebrow">Gestionar</p>

        <div className="rk-divider mt-3" />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/creadores/productos/${product.id}/imagenes`}
            className="rk-btn rk-btn-glass rk-btn-compact !px-4 !py-2.5 !text-sm"
          >
            <ImageIcon size={15} />
            Imágenes
          </Link>

          {(product.status === "DRAFT" ||
            product.status === "REJECTED") && (
            <Link
              href={`/creadores/productos/${product.id}/editar`}
              className="rk-btn rk-btn-glass rk-btn-compact !px-4 !py-2.5 !text-sm"
            >
              <Pencil size={15} />
              Editar recurso
            </Link>
          )}

          {/* Mismo envío a revisión que antes: POST al endpoint. */}
          {product.status === "DRAFT" && (
            <form
              action={`/api/creadores/productos/${product.id}/enviar-revision`}
              method="POST"
            >
              <button
                type="submit"
                className="rk-btn rk-btn-primary rk-btn-compact !px-4 !py-2.5 !text-sm"
              >
                Enviar a revisión
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
