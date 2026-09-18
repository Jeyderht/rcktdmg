"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  coverUrl: string | null;
  previewUrl: string | null;
};

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  createdAt: string;
};

export default function EditarImagenesPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id || "");

  const [product, setProduct] = useState<Product | null>(null);

  const [coverUrl, setCoverUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [images, setImages] = useState<ProductImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] =
    useState(false);
  const [uploadingImages, setUploadingImages] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================================
  // CARGAR PRODUCTO + IMÁGENES
  // =========================================

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [productResponse, imagesResponse] =
          await Promise.all([
            fetch(`/api/creadores/productos/${id}`, {
              cache: "no-store",
            }),

            fetch(
              `/api/creadores/productos/${id}/imagenes`,
              {
                cache: "no-store",
              }
            ),
          ]);

        const productData =
          await productResponse.json();

        const imagesData =
          await imagesResponse.json();

        if (!productResponse.ok) {
          throw new Error(
            productData.error ||
              "No se pudo cargar el recurso."
          );
        }

        if (!imagesResponse.ok) {
          throw new Error(
            imagesData.error ||
              "No se pudieron cargar las imágenes."
          );
        }

        const currentProduct: Product =
          productData.product;

        setProduct(currentProduct);

        setCoverUrl(
          currentProduct.coverUrl || ""
        );

        setPreviewUrl(
          currentProduct.previewUrl || ""
        );

        setImages(
          Array.isArray(imagesData.images)
            ? imagesData.images
            : []
        );
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
      loadData();
    }
  }, [id]);

  // =========================================
  // SUBIR PORTADA / PREVIEW
  // =========================================

  async function handleImageUpload(
    e: ChangeEvent<HTMLInputElement>,
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
          data.error ||
            "No se pudo subir la imagen."
        );
      }

      if (type === "cover") {
        setCoverUrl(data.imageUrl);
        setMessage(
          "Portada cargada correctamente."
        );
      } else {
        setPreviewUrl(data.imageUrl);
        setMessage(
          "Preview cargado correctamente."
        );
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

  // =========================================
  // SUBIR IMÁGENES ADICIONALES
  // =========================================

  async function handleAdditionalImagesUpload(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    const remainingSlots = 10 - images.length;

    if (remainingSlots <= 0) {
      setError(
        "Ya tienes el máximo de 10 imágenes adicionales."
      );
      e.target.value = "";
      return;
    }

    const filesToUpload = files.slice(
      0,
      remainingSlots
    );

    setUploadingImages(true);
    setError("");
    setMessage("");

    try {
      const uploadedImages: ProductImage[] = [];

      for (const file of filesToUpload) {
        const formData = new FormData();

        formData.append("file", file);

        const uploadResponse = await fetch(
          "/api/uploads/product-image",
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData =
          await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error ||
              `No se pudo subir ${file.name}.`
          );
        }

        const currentSortOrder =
          images.length +
          uploadedImages.length;

        const createResponse = await fetch(
          `/api/creadores/productos/${id}/imagenes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: uploadData.imageUrl,
              alt: file.name,
              sortOrder: currentSortOrder,
            }),
          }
        );

        const createData =
          await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(
            createData.error ||
              `No se pudo registrar ${file.name}.`
          );
        }

        uploadedImages.push(
          createData.image
        );
      }

      setImages((current) => [
        ...current,
        ...uploadedImages,
      ]);

      if (files.length > filesToUpload.length) {
        setMessage(
          `Se agregaron ${uploadedImages.length} imágenes. Solo quedan 10 imágenes adicionales como máximo.`
        );
      } else {
        setMessage(
          `${uploadedImages.length} ${
            uploadedImages.length === 1
              ? "imagen agregada"
              : "imágenes agregadas"
          } correctamente.`
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron subir las imágenes."
      );
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  }

  // =========================================
  // ELIMINAR IMAGEN
  // =========================================

  async function handleDeleteImage(
    imageId: string
  ) {
    const confirmed = window.confirm(
      "¿Quieres eliminar esta imagen?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/creadores/productos/${id}/imagenes`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo eliminar la imagen."
        );
      }

      setImages((current) =>
        current
          .filter(
            (image) => image.id !== imageId
          )
          .map((image, index) => ({
            ...image,
            sortOrder: index,
          }))
      );

      setMessage(
        "Imagen eliminada correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la imagen."
      );
    }
  }

  // =========================================
  // MOVER IMAGEN
  // =========================================

  async function moveImage(
    imageId: string,
    direction: "up" | "down"
  ) {
    const currentIndex = images.findIndex(
      (image) => image.id === imageId
    );

    if (currentIndex === -1) return;

    const newIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      newIndex < 0 ||
      newIndex >= images.length
    ) {
      return;
    }

    const currentImage =
      images[currentIndex];

    const targetImage =
      images[newIndex];

    try {
      setError("");
      setMessage("");

      // Actualizamos visualmente primero.
      const reordered = [...images];

      reordered[currentIndex] = targetImage;
      reordered[newIndex] = currentImage;

      const normalized =
        reordered.map((image, index) => ({
          ...image,
          sortOrder: index,
        }));

      setImages(normalized);

      // Guardamos los dos cambios de orden.
      await Promise.all([
        fetch(
          `/api/creadores/productos/${id}/imagenes`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageId: currentImage.id,
              sortOrder: newIndex,
            }),
          }
        ),

        fetch(
          `/api/creadores/productos/${id}/imagenes`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageId: targetImage.id,
              sortOrder: currentIndex,
            }),
          }
        ),
      ]);

      setMessage(
        "Orden de imágenes actualizado."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el orden."
      );
    }
  }

  // =========================================
  // GUARDAR PORTADA / PREVIEW
  // =========================================

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/creadores/productos/${id}/imagenes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coverUrl,
            previewUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron guardar las imágenes."
        );
      }

      setMessage(
        "Imágenes guardadas correctamente."
      );

      setTimeout(() => {
        router.push(
          `/creadores/productos/${id}`
        );
        router.refresh();
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las imágenes."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl bg-surface p-10">
          <p className="text-ink/50">
            Cargando recurso...
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error && !product) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl bg-surface p-10">
          <p className="text-danger">
            {error}
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* CABECERA */}
        <div className="mb-8">
          <Link
            href={`/creadores/productos/${id}`}
            className="text-sm text-ink/45 transition hover:text-ink"
          >
            ← Volver a gestionar
          </Link>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-ink/40">
            Gestión de imágenes
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {product?.name}
          </h1>

          <p className="mt-3 text-ink/50">
            Administra la portada, el preview y
            las imágenes adicionales de tu
            publicación.
          </p>
        </div>

        <section className="rounded-[2rem] border border-ink/[0.07] bg-surface p-6 shadow-sm md:p-8">

          {/* ================================= */}
          {/* PORTADA */}
          {/* ================================= */}

          <div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-ink/40">
                Portada
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Imagen principal
              </h2>

              <p className="mt-2 text-sm text-ink/45">
                Esta será la imagen principal
                de tu publicación.
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl bg-ink/[0.05]">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`Portada de ${
                    product?.name ||
                    "recurso"
                  }`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <span className="text-xs uppercase tracking-[0.25em] text-ink/25">
                    Sin portada
                  </span>
                </div>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:opacity-80">
              {uploadingCover
                ? "Subiendo portada..."
                : coverUrl
                  ? "Cambiar portada"
                  : "Subir portada"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    "cover"
                  )
                }
                disabled={
                  uploadingCover ||
                  uploadingPreview ||
                  uploadingImages ||
                  saving
                }
              />
            </label>
          </div>

          {/* ================================= */}
          {/* PREVIEW */}
          {/* ================================= */}

          <div className="mt-10 border-t border-ink/[0.07] pt-10">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-ink/40">
                Preview
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Imagen de vista previa
              </h2>

              <p className="mt-2 text-sm text-ink/45">
                Se mostrará como imagen de
                vista previa de tu producto.
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl bg-ink/[0.05]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Preview de ${
                    product?.name ||
                    "recurso"
                  }`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <span className="text-xs uppercase tracking-[0.25em] text-ink/25">
                    Sin preview
                  </span>
                </div>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-full border border-ink/10 px-5 py-3 text-sm font-medium transition hover:bg-ink/[0.06]">
              {uploadingPreview
                ? "Subiendo preview..."
                : previewUrl
                  ? "Cambiar preview"
                  : "Subir preview"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    "preview"
                  )
                }
                disabled={
                  uploadingCover ||
                  uploadingPreview ||
                  uploadingImages ||
                  saving
                }
              />
            </label>
          </div>

          {/* ================================= */}
          {/* GALERÍA ADICIONAL */}
          {/* ================================= */}

          <div className="mt-10 border-t border-ink/[0.07] pt-10">

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-ink/40">
                  Galería
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Imágenes adicionales
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-ink/45">
                  Agrega más imágenes para
                  mostrar tu producto con mayor
                  detalle. Puedes seleccionar varias
                  imágenes a la vez.
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-ink/[0.06] px-4 py-2 text-sm font-medium">
                {images.length} / 10
              </div>
            </div>

            {/* BOTÓN SUBIR */}
            <label
              className={`mt-6 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-ink/10 px-6 py-8 text-center transition ${
                uploadingImages
                  ? "cursor-wait opacity-50"
                  : "hover:border-ink/25 hover:bg-ink/[0.02]"
              }`}
            >
              <div>
                <div className="text-3xl">
                  +
                </div>

                <p className="mt-2 text-sm font-medium">
                  {uploadingImages
                    ? "Subiendo imágenes..."
                    : "Agregar imágenes"}
                </p>

                <p className="mt-1 text-xs text-ink/40">
                  PNG, JPG o WEBP · máximo
                  10 imágenes adicionales
                </p>
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={
                  handleAdditionalImagesUpload
                }
                disabled={
                  uploadingImages ||
                  uploadingCover ||
                  uploadingPreview ||
                  saving ||
                  images.length >= 10
                }
              />
            </label>

            {/* GALERÍA */}
            {images.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {images.map(
                  (image, index) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-3xl border border-ink/[0.07] bg-ink/[0.05]"
                    >
                      {/* IMAGEN */}
                      <div className="relative">
                        <img
                          src={image.url}
                          alt={
                            image.alt ||
                            `Imagen ${
                              index + 1
                            }`
                          }
                          className="aspect-[4/3] w-full object-cover"
                        />

                        <div className="rk-glass-on-image absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-medium">
                          #{index + 1}
                        </div>
                      </div>

                      {/* CONTROLES */}
                      <div className="p-4">

                        <p className="truncate text-sm font-medium">
                          {image.alt ||
                            `Imagen ${
                              index + 1
                            }`}
                        </p>

                        <div className="mt-4 flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              moveImage(
                                image.id,
                                "up"
                              )
                            }
                            disabled={
                              index === 0
                            }
                            className="flex-1 rounded-full border border-ink/10 px-3 py-2 text-sm transition hover:bg-ink/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveImage(
                                image.id,
                                "down"
                              )
                            }
                            disabled={
                              index ===
                              images.length - 1
                            }
                            className="flex-1 rounded-full border border-ink/10 px-3 py-2 text-sm transition hover:bg-ink/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteImage(
                                image.id
                              )
                            }
                            disabled={
                              uploadingImages ||
                              saving
                            }
                            className="flex-1 rounded-full border border-danger/25 px-3 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-40"
                          >
                            Eliminar
                          </button>

                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-ink/[0.05] px-6 py-12 text-center">
                <p className="text-sm font-medium text-ink/50">
                  Todavía no tienes imágenes
                  adicionales.
                </p>

                <p className="mt-1 text-xs text-ink/30">
                  Agrega imágenes para
                  enriquecer la presentación de
                  tu producto.
                </p>
              </div>
            )}
          </div>

          {/* ================================= */}
          {/* MENSAJES */}
          {/* ================================= */}

          {(message || error) && (
            <div className="mt-8 space-y-3">
              {message && (
                <p className="rounded-2xl bg-success/12 px-4 py-3 text-sm text-success">
                  {message}
                </p>
              )}

              {error && (
                <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ================================= */}
          {/* ACCIONES */}
          {/* ================================= */}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/[0.07] pt-6">

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                uploadingCover ||
                uploadingPreview ||
                uploadingImages
              }
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Guardando..."
                : "Guardar imágenes"}
            </button>

            <Link
              href={`/creadores/productos/${id}`}
              className="rounded-full border border-ink/10 px-6 py-3 text-sm font-medium transition hover:bg-ink/[0.06]"
            >
              Cancelar
            </Link>

          </div>

        </section>
      </div>
    </main>
  );
}