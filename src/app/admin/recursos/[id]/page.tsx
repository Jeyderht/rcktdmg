import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import ResourceActions from "../ResourceActions";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COLORES, TAG_PACK } from "@/lib/catalogo";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "Pendiente de revisión",
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

      // Solo la etiqueta de pack: el panel no necesita más.
      tags: {
        where: { tag: { slug: TAG_PACK } },
        select: { tagId: true },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, alt: true },
      },
    },
  });

  if (!resource) {
    notFound();
  }

  const colorEtiqueta =
    COLORES.find((c) => c.valor === resource.color)?.etiqueta ?? null;

  const esPack = resource.tags.length > 0;

  const statusLabel =
    STATUS_LABEL[resource.status] || resource.status;

  const specs = [
    {
      label: "Creador",
      value: resource.creator.name || "Sin nombre",
    },
    {
      label: "Correo",
      value: resource.creator.email,
    },
    {
      label: "Categoría",
      value: resource.category.name,
    },
    {
      label: "Precio",
      value: `S/ ${Number(resource.price).toFixed(2)}`,
    },
    // Metadatos del catálogo: solo se listan si existen.
    ...(resource.fileFormat
      ? [
        {
          label: "Formato",
          value: resource.fileFormat.toUpperCase(),
        },
      ]
      : []),
    ...(colorEtiqueta
      ? [
        {
          label: "Color",
          value: colorEtiqueta,
        },
      ]
      : []),
    {
      label: "Tipo",
      value: esPack ? "Pack" : "Recurso individual",
    },
    {
      label: "Creado",
      value: new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
      }).format(resource.createdAt),
    },
    {
      label: "Actualizado",
      value: new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
      }).format(resource.updatedAt),
    },
  ];

  // Estado real de cada archivo, sin suponer nada.
  const files = [
    {
      label: "Archivo del producto",
      ready: Boolean(resource.fileUrl),
      readyText: "Cargado y listo para entregar",
      pendingText: "Todavía sin archivo",
    },
    {
      label: "Portada",
      ready: Boolean(resource.coverUrl),
      readyText: "Portada configurada",
      pendingText: "Sin portada",
    },
    {
      label: "Vista previa",
      ready: Boolean(resource.previewUrl),
      readyText: "Vista previa configurada",
      pendingText: "Sin vista previa",
    },
  ];

  const gallery = [
    resource.coverUrl
      ? { key: "cover", url: resource.coverUrl, label: "Portada" }
      : null,

    resource.previewUrl
      ? {
          key: "preview",
          url: resource.previewUrl,
          label: "Vista previa",
        }
      : null,

    ...resource.images.map((image, index) => ({
      key: image.id,
      url: image.url,
      label: image.alt?.trim() || `Imagen ${index + 1}`,
    })),
  ].filter(Boolean) as {
    key: string;
    url: string;
    label: string;
  }[];

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">
      <div className="mx-auto w-full max-w-5xl">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up">
          <Link
            href="/admin/recursos"
            className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
          >
            <ChevronLeft size={15} />
            Recursos
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <p className="rk-eyebrow">Vista administrativa</p>

              <h1 className="rk-title mt-2.5 text-[1.75rem] sm:text-3xl">
                {resource.name}
              </h1>

              {/* El color del estado corresponde al estado real. */}
              <span
                className={`rk-badge mt-3 ${
                  STATUS_BADGE[resource.status] ||
                  "rk-badge-neutral"
                }`}
              >
                {statusLabel}
              </span>
            </div>

            {resource.status === "PUBLISHED" && (
              <Link
                href={`/tienda/${resource.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rk-btn rk-btn-glass rk-btn-compact shrink-0 !px-4 !py-2.5 !text-sm"
              >
                <ExternalLink size={15} />
                Ver publicación
              </Link>
            )}
          </div>
        </header>

        {/* ========== REVISIÓN ========== */}
        {resource.status === "REJECTED" &&
          resource.rejectionReason && (
            <section className="rk-fade mt-6 rounded-rk-md border border-danger/25 bg-danger/10 p-5">
              <p className="text-sm font-semibold text-danger">
                Recurso rechazado
              </p>

              <p className="mt-1.5 text-sm leading-6 text-danger">
                <span className="font-medium">Motivo:</span>{" "}
                {resource.rejectionReason}
              </p>
            </section>
          )}

        {/* ========== INFORMACIÓN ========== */}
        <section className="rk-fade-up rk-enter-1 mt-8">
          <p className="rk-eyebrow">Información</p>

          <div className="rk-divider mt-3" />

          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            {specs.map((spec) => (
              <div key={spec.label} className="min-w-0">
                <dt className="text-xs text-ink/60">
                  {spec.label}
                </dt>

                <dd className="mt-1.5 truncate text-sm font-medium">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ========== IMÁGENES ========== */}
        <section className="rk-fade-up rk-enter-2 mt-8">
          <p className="rk-eyebrow">Imágenes</p>

          <div className="rk-divider mt-3" />

          {gallery.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">
              Este recurso todavía no tiene imágenes.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
              {gallery.map((item) => (
                <div
                  key={item.key}
                  className="rk-media rk-aspect-product relative overflow-hidden rounded-rk-sm"
                >
                  {/* La imagen se ve nítida: el vidrio va solo
                      en la etiqueta que flota encima. */}
                  <Image
                    src={item.url}
                    alt={`${item.label} de ${resource.name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 30vw, 16vw"
                  />

                  <span className="rk-glass-on-image absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full px-2 py-0.5 text-[9px] font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== DESCRIPCIÓN ========== */}
        <section className="rk-fade-up rk-enter-3 mt-8">
          <p className="rk-eyebrow">Descripción</p>

          <div className="rk-divider mt-3" />

          <div className="rk-card mt-4 p-5">
            <p className="whitespace-pre-line text-[15px] leading-7 text-ink/65">
              {resource.description}
            </p>
          </div>
        </section>

        {/* ========== ARCHIVOS ========== */}
        <section className="rk-fade-up mt-8">
          <p className="rk-eyebrow">Archivos</p>

          <div className="rk-divider mt-3" />

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {files.map((file) => (
              <div key={file.label} className="rk-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {file.label}
                  </p>

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

        {/* ========== MODERACIÓN ========== */}
        <section className="rk-fade-up mt-8">
          <p className="rk-eyebrow">Moderación</p>

          <div className="rk-divider mt-3" />

          <div className="mt-4">
            <ResourceActions
              resourceId={resource.id}
              resourceSlug={resource.slug}
              status={resource.status}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
