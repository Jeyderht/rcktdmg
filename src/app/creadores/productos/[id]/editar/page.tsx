"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  accessType: "INDIVIDUAL" | "PLAN" | "BOTH";
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  rejectionReason: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  fileUrl: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  } | null;
};

const accessOptions = [
  {
    value: "INDIVIDUAL",
    label: "Compra individual",
  },
  {
    value: "PLAN",
    label: "Solo planes",
  },
  {
    value: "BOTH",
    label: "Compra + planes",
  },
] as const;

export default function EditarRecursoPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id || "");

  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [accessType, setAccessType] = useState<
    "INDIVIDUAL" | "PLAN" | "BOTH"
  >("BOTH");

  const [coverUrl, setCoverUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/creadores/productos/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo cargar el recurso."
          );
        }

        const currentProduct: Product = data.product;

        setProduct(currentProduct);

        setName(currentProduct.name);
        setDescription(currentProduct.description);
        setCategoryId(currentProduct.categoryId);
        setPrice(currentProduct.price);
        setAccessType(currentProduct.accessType);
        setCoverUrl(currentProduct.coverUrl || "");
        setPreviewUrl(currentProduct.previewUrl || "");
        setFileUrl(currentProduct.fileUrl || "");
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el recurso."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProduct();
    }
  }, [id]);

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingFile(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/uploads/product",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo subir el archivo."
        );
      }

      setFileUrl(data.fileUrl);
      setFileName(data.fileName);

      setMessage("Nuevo archivo cargado correctamente.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setUploadingFile(false);
    }
  }
  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "cover" | "preview"
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (type === "cover") {
      setUploadingCover(true);
    } else {
      setUploadingPreview(true);
    }

    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/uploads/product-image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo subir la imagen."
        );
      }

      if (type === "cover") {
        setCoverUrl(data.imageUrl);
        setMessage("Portada cargada correctamente.");
      } else {
        setPreviewUrl(data.imageUrl);
        setMessage("Preview cargado correctamente.");
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la imagen."
      );
    } finally {
      if (type === "cover") {
        setUploadingCover(false);
      } else {
        setUploadingPreview(false);
      }

      e.target.value = "";
    }
  }
  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!fileUrl) {
        throw new Error(
          "Debes tener un archivo principal cargado."
        );
      }

      const response = await fetch(
        `/api/creadores/productos/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            categoryId,
            price,
            accessType,
            coverUrl,
            previewUrl,
            fileUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el recurso."
        );
      }

      setMessage(
        "Recurso actualizado correctamente."
      );

      setProduct((current) =>
        current
          ? {
            ...current,
            name,
            description,
            categoryId,
            price,
            accessType,
            coverUrl: coverUrl || null,
            previewUrl: previewUrl || null,
            fileUrl: fileUrl || null,
            status: data.product.status,
          }
          : current
      );

      setTimeout(() => {
        router.push(
          `/creadores/productos/${id}`
        );
      }, 800);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el recurso."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rk-card p-8">
            <p className="text-ink/50">
              Cargando recurso...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/creadores/panel/recursos"
            className="text-sm text-ink/45 hover:text-ink"
          >
            ← Volver a mis recursos
          </Link>

          <div className="mt-6 rounded-3xl border border-danger/25 bg-danger/10 p-6">
            <p className="font-medium text-danger">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return null;
  }

  const canEdit =
    product.status === "DRAFT" ||
    product.status === "REJECTED";

  if (!canEdit) {
    return (
      <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/creadores/productos/${id}`}
            className="text-sm text-ink/45 hover:text-ink"
          >
            ← Volver al recurso
          </Link>

          <div className="mt-6 rk-card p-8">
            <h1 className="text-2xl font-semibold">
              Este recurso no puede editarse
            </h1>

            <p className="mt-3 text-ink/50">
              Los recursos publicados o pendientes de
              revisión no pueden modificarse en este momento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/creadores/productos/${id}`}
          className="text-sm text-ink/45 transition hover:text-ink"
        >
          ← Volver al recurso
        </Link>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
            Creator Studio
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Editar recurso
          </h1>

          <p className="mt-2 text-ink/50">
            Actualiza la información de tu recurso antes
            de enviarlo a revisión.
          </p>

          {product.status === "REJECTED" && product.rejectionReason && (
            <div className="mt-5 rounded-2xl border border-danger/25 bg-danger/10 p-5">
              <p className="text-sm font-semibold text-danger">
                Recurso rechazado
              </p>

              <p className="mt-2 text-sm leading-6 text-danger">
                <span className="font-medium">Motivo del rechazo:</span>{" "}
                {product.rejectionReason}
              </p>

              <p className="mt-2 text-xs text-danger">
                Corrige este punto antes de volver a enviar el recurso a revisión.
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {/* INFORMACIÓN BÁSICA */}
          <section className="rk-card p-7">
            <h2 className="text-xl font-semibold">
              Información básica
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Nombre del recurso
                </label>

                <input
                  id="name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  className="w-full rk-card px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium"
                >
                  Descripción
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  required
                  rows={6}
                  className="w-full resize-y rk-card px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>
            </div>
          </section>

          {/* PRECIO Y ACCESO */}
          <section className="rk-card p-7">
            <h2 className="text-xl font-semibold">
              Precio y acceso
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium"
                >
                  Precio
                </label>

                <div className="flex items-center overflow-hidden rounded-2xl border border-ink/10">
                  <span className="px-4 text-ink/40">
                    S/
                  </span>

                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value)
                    }
                    required
                    className="w-full border-0 px-2 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="accessType"
                  className="mb-2 block text-sm font-medium"
                >
                  Tipo de acceso
                </label>

                <select
                  id="accessType"
                  value={accessType}
                  onChange={(e) =>
                    setAccessType(
                      e.target.value as
                      | "INDIVIDUAL"
                      | "PLAN"
                      | "BOTH"
                    )
                  }
                  className="w-full rk-card px-4 py-3 outline-none"
                >
                  {accessOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* CATEGORÍA */}
          <section className="rk-card p-7">
            <h2 className="text-xl font-semibold">
              Categoría
            </h2>

            <div className="mt-6">
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium"
              >
                Categoría actual
              </label>

              <select
                id="category"
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value)
                }
                required
                className="w-full rk-card px-4 py-3 outline-none"
              >
                {product.category && (
                  <option value={product.category.id}>
                    {product.category.name}
                  </option>
                )}
              </select>

              <p className="mt-2 text-xs text-ink/40">
                Por ahora se mantiene la categoría actual.
              </p>
            </div>
          </section>

          {/* ARCHIVO */}
          <section className="rk-card p-7">
            <h2 className="text-xl font-semibold">
              Archivo principal
            </h2>

            <p className="mt-2 text-sm text-ink/45">
              Puedes reemplazar el archivo actual.
              Máximo 100 MB.
            </p>

            {fileUrl && (
              <div className="mt-5 rounded-2xl bg-success/12 p-4">
                <p className="text-sm font-medium text-success">
                  Archivo actualmente configurado
                </p>

                {!fileName && (
                  <p className="mt-1 break-all text-xs text-success">
                    {fileUrl}
                  </p>
                )}

                {fileName && (
                  <p className="mt-1 text-sm text-success">
                    {fileName}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/10 bg-ink/[0.05] p-8 text-center">
              <input
                id="product-file-edit"
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />

              <label
                htmlFor="product-file-edit"
                className="inline-flex cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-90"
              >
                {uploadingFile
                  ? "Subiendo archivo..."
                  : "Reemplazar archivo"}
              </label>

              <p className="mt-4 text-sm text-ink/40">
                ZIP, RAR, 7Z, PDF, Office, PSD, AI,
                imágenes, videos y otros formatos compatibles.
              </p>
            </div>
          </section>

          {/* PORTADA Y PREVIEW */}
          {/* PORTADA Y PREVIEW */}
          <section className="rk-card p-7">
            <h2 className="text-xl font-semibold">
              Portada y preview
            </h2>

            <p className="mt-2 text-sm text-ink/45">
              Sube imágenes desde tu computadora o utiliza una URL externa.
              Formatos permitidos: PNG, JPG, JPEG y WEBP.
            </p>

            <div className="mt-7 space-y-10">
              {/* PORTADA */}
              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium">
                    Portada del recurso
                  </p>

                  <p className="mt-1 text-xs text-ink/40">
                    Esta imagen aparecerá en la tienda, colecciones y tarjetas del recurso.
                  </p>
                </div>

                {coverUrl ? (
                  <div className="mb-5 overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.05]">
                    <img
                      src={coverUrl}
                      alt={`Portada de ${name}`}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-5 flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-ink/10 bg-ink/[0.05]">
                    <span className="text-xs uppercase tracking-[0.2em] text-ink/25">
                      Sin portada
                    </span>
                  </div>
                )}

                <input
                  id="cover-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    handleImageUpload(e, "cover")
                  }
                  disabled={uploadingCover}
                  className="hidden"
                />

                <label
                  htmlFor="cover-upload"
                  className="inline-flex cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-90"
                >
                  {uploadingCover
                    ? "Subiendo portada..."
                    : coverUrl
                      ? "Cambiar portada"
                      : "Subir portada"}
                </label>

                <div className="mt-5">
                  <label
                    htmlFor="coverUrl"
                    className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-ink/40"
                  >
                    O usa una URL
                  </label>

                  <input
                    id="coverUrl"
                    value={coverUrl}
                    onChange={(e) =>
                      setCoverUrl(e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none transition focus:border-accent/45"
                  />
                </div>
              </div>

              <div className="border-t border-ink/[0.07]" />

              {/* PREVIEW */}
              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium">
                    Preview del recurso
                  </p>

                  <p className="mt-1 text-xs text-ink/40">
                    Esta imagen se mostrará como vista previa dentro de la página del producto.
                  </p>
                </div>

                {previewUrl ? (
                  <div className="mb-5 overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.05]">
                    <img
                      src={previewUrl}
                      alt={`Preview de ${name}`}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-5 flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-ink/10 bg-ink/[0.05]">
                    <span className="text-xs uppercase tracking-[0.2em] text-ink/25">
                      Sin preview
                    </span>
                  </div>
                )}

                <input
                  id="preview-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    handleImageUpload(e, "preview")
                  }
                  disabled={uploadingPreview}
                  className="hidden"
                />

                <label
                  htmlFor="preview-upload"
                  className="inline-flex cursor-pointer rk-btn rk-btn-glass"
                >
                  {uploadingPreview
                    ? "Subiendo preview..."
                    : previewUrl
                      ? "Cambiar preview"
                      : "Subir preview"}
                </label>

                <div className="mt-5">
                  <label
                    htmlFor="previewUrl"
                    className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-ink/40"
                  >
                    O usa una URL
                  </label>

                  <input
                    id="previewUrl"
                    value={previewUrl}
                    onChange={(e) =>
                      setPreviewUrl(e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none transition focus:border-accent/45"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* MENSAJES */}
          {error && (
            <div className="rounded-2xl border border-danger/25 bg-danger/10 p-4">
              <p className="text-sm font-medium text-danger">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-success/25 bg-success/12 p-4">
              <p className="text-sm font-medium text-success">
                {message}
              </p>
            </div>
          )}

          {/* BOTONES */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                saving ||
                uploadingFile ||
                uploadingCover ||
                uploadingPreview
              }
              className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

            <Link
              href={`/creadores/productos/${id}`}
              className="rounded-full border border-ink/10 px-7 py-3 text-sm font-medium transition hover:bg-ink/[0.06]"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}