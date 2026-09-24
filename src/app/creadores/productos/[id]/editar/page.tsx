"use client";

import { FormEvent, useEffect, useState } from "react";

import TagsInput from "@/components/TagsInput";
import {
  LICENCIAS,
  TIPOS_LICENCIA,
  type TipoLicencia,
} from "@/lib/licencias-comun";
import Image from "next/image";

import {
  subirArchivoDeProducto,
  subirImagen,
} from "@/lib/storage/client-upload";
import Link from "next/link";
import { COLORES } from "@/lib/catalogo";
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
  fileFormat: string | null;
  color: string | null;
  esPack: boolean;
  tags: string[];
  licenseType: TipoLicencia;
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
  const [color, setColor] = useState("");
  const [esPack, setEsPack] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [licenseType, setLicenseType] =
    useState<TipoLicencia>("PERSONAL");

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
        setColor(currentProduct.color || "");
        setEsPack(currentProduct.esPack === true);
        setTags(currentProduct.tags ?? []);
        setLicenseType(currentProduct.licenseType ?? "PERSONAL");
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
      // Con Blob activo el archivo va directo al almacén
      // privado; en local sigue pasando por el endpoint.
      const subido = await subirArchivoDeProducto(file);

      setFileUrl(subido.fileUrl);
      setFileName(subido.fileName);

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
      // Con Blob activo la imagen va directa al almacén.
      const subida = await subirImagen("product-image", file);

      const data = { imageUrl: subida.url };

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
            color: color || null,
            esPack,
            tags,
            licenseType,
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
            color: color || null,
            esPack,
            tags,
            licenseType,
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
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          <div className="rk-card p-8">
            <p className="text-ink/60">
              Cargando recurso...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/creadores/panel/recursos"
            className="text-sm text-ink/60 hover:text-ink"
          >
            ← Volver a mis recursos
          </Link>

          <div className="mt-6 rounded-rk-lg border border-danger/25 bg-danger/10 p-6">
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
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/creadores/productos/${id}`}
            className="text-sm text-ink/60 hover:text-ink"
          >
            ← Volver al recurso
          </Link>

          <div className="mt-6 rk-card p-8">
            <h1 className="text-2xl font-semibold">
              Este recurso no puede editarse
            </h1>

            <p className="mt-3 text-ink/60">
              Los recursos publicados o pendientes de
              revisión no pueden modificarse en este momento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/creadores/productos/${id}`}
          className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
        >
          ← Volver al recurso
        </Link>

        <div className="mt-5">
          <p className="rk-eyebrow">
            Creator Studio
          </p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Editar recurso
          </h1>

          <p className="mt-2 text-ink/60">
            Actualiza la información de tu recurso antes
            de enviarlo a revisión.
          </p>

          {product.status === "REJECTED" && product.rejectionReason && (
            <div className="mt-5 rounded-rk-md border border-danger/25 bg-danger/10 p-5">
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
          <section className="rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Información</p>

            <h2 className="rk-title mt-2 text-xl">
              Información básica
            </h2>

            <div className="rk-divider mt-4" />

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
                  className="rk-select w-full"
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
                  className="w-full resize-y rk-card px-4 py-3 outline-none transition focus:border-ink/40"
                />
              </div>
            </div>
          </section>

          {/* PRECIO Y ACCESO */}
          <section className="rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Precio y acceso</p>

            <h2 className="rk-title mt-2 text-xl">
              Precio y acceso
            </h2>

            <div className="rk-divider mt-4" />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium"
                >
                  Precio
                </label>

                <div className="flex items-center overflow-hidden rounded-rk-md border border-line/10">
                  <span className="px-4 text-ink/60">
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
                  className="rk-select w-full"
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
          <section className="rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Clasificación</p>

            <h2 className="rk-title mt-2 text-xl">
              Categoría
            </h2>

            <div className="rk-divider mt-4" />

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
                className="rk-select w-full"
              >
                {product.category && (
                  <option value={product.category.id}>
                    {product.category.name}
                  </option>
                )}
              </select>

              <p className="mt-2 text-xs text-ink/60">
                Por ahora se mantiene la categoría actual.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="licenseType"
                className="mb-2 block text-sm font-medium"
              >
                Licencia de uso
              </label>

              <select
                id="licenseType"
                value={licenseType}
                onChange={(e) =>
                  setLicenseType(e.target.value as TipoLicencia)
                }
                className="rk-select w-full"
              >
                {TIPOS_LICENCIA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {LICENCIAS[tipo].etiqueta}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-ink/60">
                {LICENCIAS[licenseType].resumen} Cambiarla NO afecta
                a quien ya compró: cada licencia guarda las
                condiciones que se aceptaron.
              </p>
            </div>
            <div className="mt-6">
              <p className="mb-2 block text-sm font-medium">
                Etiquetas
                <span className="ml-1.5 font-normal text-ink/45">
                  (opcional)
                </span>
              </p>

              <TagsInput valor={tags} onChange={setTags} disabled={saving} />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="color"
                  className="mb-2 block text-sm font-medium"
                >
                  Color predominante
                  <span className="ml-1.5 font-normal text-ink/45">
                    (opcional)
                  </span>
                </label>

                <select
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="rk-select w-full"
                >
                  <option value="">Sin especificar</option>

                  {COLORES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-ink/60">
                  Permite encontrar tu recurso al filtrar por color
                  en la tienda.
                </p>
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium">
                  Tipo de recurso
                </p>

                <label
                  htmlFor="esPack"
                  className="flex cursor-pointer items-start gap-3 rounded-rk-md border border-line/10 p-3.5 transition-colors duration-fast ease-rk hover:border-line/20"
                >
                  <input
                    id="esPack"
                    type="checkbox"
                    checked={esPack}
                    onChange={(e) => setEsPack(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--rk-foreground))]"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      Es un pack
                    </span>

                    <span className="mt-0.5 block text-xs leading-5 text-ink/60">
                      Márcalo si el archivo reúne varios recursos en
                      un solo paquete.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ARCHIVO */}
          <section className="rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Archivos</p>

            <h2 className="rk-title mt-2 text-xl">
              Archivo principal
            </h2>

            <div className="rk-divider mt-4" />

            <p className="mt-2 text-sm text-ink/60">
              Puedes reemplazar el archivo actual.
              Máximo 100 MB.
            </p>

            {fileUrl && (
              <div className="mt-5 rounded-rk-md bg-success/12 p-4">
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

            {product.fileFormat && (
              <p className="mt-4 text-xs text-ink/60">
                Formato detectado:{" "}
                <span className="font-semibold uppercase text-ink">
                  {product.fileFormat}
                </span>
                . Se actualiza solo al reemplazar el archivo.
              </p>
            )}

            <div className="mt-5 rounded-rk-md border-2 border-dashed border-line/10 bg-ink/[0.05] p-8 text-center">
              <input
                id="product-file-edit"
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />

              <label
                htmlFor="product-file-edit"
                className="rk-btn rk-btn-primary cursor-pointer rk-btn-compact !px-5 !py-2.5 !text-sm"
              >
                {uploadingFile
                  ? "Subiendo archivo..."
                  : "Reemplazar archivo"}
              </label>

              <p className="mt-4 text-sm text-ink/60">
                ZIP, RAR, 7Z, PDF, Office, PSD, AI,
                imágenes, videos y otros formatos compatibles.
              </p>
            </div>
          </section>

          {/* PORTADA Y PREVIEW */}
          {/* PORTADA Y PREVIEW */}
          <section className="rk-card p-5 sm:p-6">
            <p className="rk-eyebrow">Imágenes</p>

            <h2 className="rk-title mt-2 text-xl">
              Portada y preview
            </h2>

            <div className="rk-divider mt-4" />

            <p className="mt-2 text-sm text-ink/60">
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

                  <p className="mt-1 text-xs text-ink/60">
                    Esta imagen aparecerá en la tienda, colecciones y tarjetas del recurso.
                  </p>
                </div>

                {coverUrl ? (
                  <div className="rk-media relative mb-5 h-56 overflow-hidden rounded-rk-md border border-line/10">
                    <Image
                      src={coverUrl}
                      alt={`Portada de ${name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 32rem"
                    />
                  </div>
                ) : (
                  <div className="mb-5 flex h-56 items-center justify-center rounded-rk-md border border-dashed border-line/20">
                    <span className="text-xs uppercase tracking-[0.2em] text-ink/45">
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
                  className="rk-btn rk-btn-primary cursor-pointer rk-btn-compact !px-5 !py-2.5 !text-sm"
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
                    className="rk-eyebrow mb-2 block"
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
                    className="rk-input w-full"
                  />
                </div>
              </div>

              <div className="border-t border-line/10" />

              {/* PREVIEW */}
              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium">
                    Preview del recurso
                  </p>

                  <p className="mt-1 text-xs text-ink/60">
                    Esta imagen se mostrará como vista previa dentro de la página del producto.
                  </p>
                </div>

                {previewUrl ? (
                  <div className="rk-media relative mb-5 h-56 overflow-hidden rounded-rk-md border border-line/10">
                    <Image
                      src={previewUrl}
                      alt={`Preview de ${name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 32rem"
                    />
                  </div>
                ) : (
                  <div className="mb-5 flex h-56 items-center justify-center rounded-rk-md border border-dashed border-line/20">
                    <span className="text-xs uppercase tracking-[0.2em] text-ink/45">
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
                    className="rk-eyebrow mb-2 block"
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
                    className="rk-input w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* MENSAJES */}
          {error && (
            <div className="rk-fade rounded-rk-md border border-danger/25 bg-danger/10 p-4">
              <p className="text-sm font-medium text-danger">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="rk-fade rounded-rk-md border border-success/25 bg-success/10 p-4">
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
              className="rk-btn rk-btn-primary"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

            <Link
              href={`/creadores/productos/${id}`}
              className="rk-btn rk-btn-glass"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
