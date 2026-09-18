import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusInfo = {
  DRAFT: {
    label: "Borrador",
    className: "bg-ink/[0.05] text-ink/70",
  },
  PENDING_REVIEW: {
    label: "Pendiente de revisiÃ³n",
    className: "bg-warning/12 text-warning",
  },
  PUBLISHED: {
    label: "Publicado",
    className: "bg-success/12 text-success",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-danger/10 text-danger",
  },
  ARCHIVED: {
    label: "Archivado",
    className: "bg-ink/[0.09] text-ink/60",
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

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <div className="mb-8">
          <Link
            href="/creadores/panel/recursos"
            className="text-sm text-ink/45 transition hover:text-ink"
          >
            â† Volver a mis recursos
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.15em] text-ink/40">
                Creator Studio
              </p>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                Gestionar recurso
              </h1>

              <p className="mt-2 text-ink/50">
                Consulta y administra la informaciÃ³n de tu recurso.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* INFORMACIÃ“N PRINCIPAL */}
        <section className="overflow-hidden rk-card">
          <div className="p-7">
            <div className="flex flex-col gap-8">
              {/* TÃTULO */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-ink/35">
                  Nombre del recurso
                </p>

                <h2 className="mt-2 text-3xl font-semibold">
                  {product.name}
                </h2>
              </div>

              {/* DATOS */}
              <div className="grid grid-cols-1 gap-5 border-y border-ink/[0.07] py-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/35">
                    CategorÃ­a
                  </p>
                  <p className="mt-2 font-medium">
                    {product.category?.name || "Sin categorÃ­a"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/35">
                    Precio
                  </p>
                  <p className="mt-2 font-medium">
                    S/ {Number(product.price).toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/35">
                    Acceso
                  </p>
                  <p className="mt-2 font-medium">
                    {accessLabels[product.accessType]}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/35">
                    Creado
                  </p>
                  <p className="mt-2 font-medium">
                    {new Date(product.createdAt).toLocaleDateString("es-PE")}
                  </p>
                </div>
              </div>

              {/* DESCRIPCIÃ“N */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-ink/35">
                  DescripciÃ³n
                </p>

                <div className="mt-3 rounded-2xl bg-ink/[0.05] p-5">
                  <p className="whitespace-pre-wrap leading-7 text-ink/65">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* ARCHIVOS */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-ink/35">
                  Archivos
                </p>

                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-ink/[0.07] p-4">
                    <div>
                      <p className="font-medium">
                        Archivo principal
                      </p>
                      <p className="mt-1 text-sm text-ink/40">
                        {product.fileUrl
                          ? "Archivo cargado correctamente"
                          : "Archivo pendiente"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${product.fileUrl
                        ? "bg-success/12 text-success"
                        : "bg-warning/12 text-warning"
                        }`}
                    >
                      {product.fileUrl ? "Cargado" : "Pendiente"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-ink/[0.07] p-4">
                    <div>
                      <p className="font-medium">
                        Portada
                      </p>
                      <p className="mt-1 text-sm text-ink/40">
                        {product.coverUrl
                          ? "Portada configurada"
                          : "Sin portada"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-ink/[0.07] p-4">
                    <div>
                      <p className="font-medium">
                        Preview
                      </p>
                      <p className="mt-1 text-sm text-ink/40">
                        {product.previewUrl
                          ? "Preview configurado"
                          : "Sin preview"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CREADOR */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-ink/35">
                  Creador
                </p>

                <p className="mt-2 font-medium">
                  {product.creator.name || "Creador RCKTDMG"}
                </p>

                <p className="mt-1 text-sm text-ink/40">
                  {product.creator.email}
                </p>
              </div>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="border-t border-ink/[0.07] bg-ink/[0.04] p-6">
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/creadores/productos/${product.id}/imagenes`}
                className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-medium transition hover:bg-ink/[0.06]"
              >
                Editar imágenes
              </Link>
              {product.status === "PUBLISHED" && (
                <Link
                  href={`/tienda/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                >
                  Ver publicaciÃ³n
                </Link>
              )}

              {product.status === "DRAFT" && (
                <form
                  action={`/api/creadores/productos/${product.id}/enviar-revision`}
                  method="POST"
                >
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-onprimary transition hover:opacity-80"
                  >
                    Enviar a revisiÃ³n
                  </button>
                </form>
              )}

              <Link
                href="/creadores/panel/recursos"
                className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-medium transition hover:bg-ink/[0.06]"
              >
                Volver
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
