"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";

import { claseProporcion } from "@/lib/tipos-publicacion";

import { subirImagen } from "@/lib/storage/client-upload";

type Product = {
  /** Decide el marco con el que se previsualiza. */
  pieceType?: string | null;
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
      // Con Blob activo la imagen va directa al almacén.
      const subida = await subirImagen("product-image", file);

      const data = { imageUrl: subida.url };

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
        const subida = await subirImagen(
          "product-image",
          file
        );

        const uploadData = { imageUrl: subida.url };

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
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="rk-card p-8">
          <p className="text-ink/60">
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
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="rk-card p-8">
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
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
      <div className="mx-auto max-w-5xl">

        {/* CABECERA */}
        <div className="mb-8">
          <Link
            href={`/creadores/productos/${id}`}
            className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
          >
            ← Volver a gestionar
          </Link>

          <p className="rk-eyebrow mt-6">
            Gestión de imágenes
          </p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            {product?.name}
          </h1>

          <p className="mt-3 text-ink/60">
            Administra la portada, el preview y
            las imágenes adicionales de tu
            publicación.
          </p>
        </div>

        <section className="rk-card p-5 sm:p-6">

          {/* ================================= */}
          {/* PORTADA */}
          {/* ================================= */}

          <div>
            <div>
              <p className="rk-eyebrow">
                Portada
              </p>

              <h2 className="rk-title mt-2 text-xl">
                Imagen principal
              </h2>

              <p className="mt-2 text-sm text-ink/60">
                Esta será la imagen principal
                de tu publicación.
              </p>
            </div>

            <div
              className={`rk-media ${claseProporcion(
                product?.pieceType as never
              )} relative mx-auto mt-5 w-full max-w-[14rem] overflow-hidden rounded-rk-md`}
            >
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={`Portada de ${
                    product?.name ||
                    "recurso"
                  }`}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs uppercase tracking-[0.25em] text-ink/45">
                    Sin portada
                  </span>
                </div>
              )}
            </div>

            <label className="rk-btn rk-btn-primary mx-auto mt-4 rk-btn-compact cursor-pointer !px-5 !py-2.5 !text-sm">
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

          <div className="mt-10 border-t border-line/10 pt-10">
            <div>
              <p className="rk-eyebrow">
                Preview
              </p>

              <h2 className="rk-title mt-2 text-xl">
                Imagen de vista previa
              </h2>

              <p className="mt-2 text-sm text-ink/60">
                Se mostrará como imagen de
                vista previa de tu producto.
              </p>
            </div>

            <div
              className={`rk-media ${claseProporcion(
                product?.pieceType as never
              )} relative mx-auto mt-5 w-full max-w-[14rem] overflow-hidden rounded-rk-md`}
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={`Preview de ${
                    product?.name ||
                    "recurso"
                  }`}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs uppercase tracking-[0.25em] text-ink/45">
                    Sin preview
                  </span>
                </div>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-full border border-line/10 px-5 py-3 text-sm font-medium transition hover:bg-ink/[0.06]">
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

          <div className="mt-10 border-t border-line/10 pt-10">

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="rk-eyebrow">
                  Galería
                </p>

                <h2 className="rk-title mt-2 text-xl">
                  Imágenes adicionales
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-ink/60">
                  Agrega más imágenes para
                  mostrar tu producto con mayor
                  detalle. Puedes seleccionar varias
                  imágenes a la vez.
                </p>
              </div>

              <div className="rk-chip shrink-0 tabular-nums">
                {images.length} / 10
              </div>
            </div>

            {/* BOTÓN SUBIR */}
            <label
              className={`mt-6 flex cursor-pointer items-center justify-center rounded-rk-md border border-dashed border-line/20 px-6 py-8 text-center transition-colors duration-normal ease-rk ${
                uploadingImages
                  ? "cursor-wait opacity-50"
                  : "hover:border-ink/40 hover:bg-ink/[0.02]"
              }`}
            >
              <div>
                <span
                  aria-hidden
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink"
                >
                  <ImagePlus size={22} />
                </span>

                <p className="mt-3 text-sm font-medium">
                  {uploadingImages
                    ? "Subiendo imágenes..."
                    : "Agregar imágenes"}
                </p>

                <p className="mt-1 text-xs text-ink/60">
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
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map(
                  (image, index) => (
                    <div
                      key={image.id}
                      className="rk-card group relative overflow-hidden !rounded-rk-md !p-0"
                    >
                      {/* IMAGEN: 9:16 y siempre nítida */}
                      <div
                        className={`rk-media ${claseProporcion(
                          product?.pieceType as never
                        )} relative`}
                      >
                        <Image
                          src={image.url}
                          alt={
                            image.alt ||
                            `Imagen ${
                              index + 1
                            }`
                          }
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 45vw, 22vw"
                        />

                        <div className="rk-glass-on-image absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-medium">
                          #{index + 1}
                        </div>
                      </div>

                      {/* CONTROLES: vidrio sobre imagen nítida */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 p-2">
                        <button
                          type="button"
                          onClick={() => moveImage(image.id, "up")}
                          disabled={index === 0}
                          aria-label="Mover imagen antes"
                          title="Mover antes"
                          className="rk-press rk-glass-on-image flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowLeft size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveImage(image.id, "down")}
                          disabled={index === images.length - 1}
                          aria-label="Mover imagen después"
                          title="Mover después"
                          className="rk-press rk-glass-on-image flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowRight size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={uploadingImages || saving}
                          aria-label={`Eliminar imagen ${index + 1}`}
                          title="Eliminar imagen"
                          className="rk-press rk-glass-on-image flex h-8 w-8 items-center justify-center rounded-full text-danger disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-rk-md border border-dashed border-line/20 px-6 py-12 text-center">
                <p className="text-sm font-medium text-ink/60">
                  Todavía no tienes imágenes
                  adicionales.
                </p>

                <p className="mt-1 text-xs text-ink/60">
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
                <p className="rk-fade rounded-rk-md border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
                  {message}
                </p>
              )}

              {error && (
                <p className="rk-fade rounded-rk-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ================================= */}
          {/* ACCIONES */}
          {/* ================================= */}

          <div className="mt-8 flex flex-wrap gap-2.5 border-t border-line/10 pt-6">

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                uploadingCover ||
                uploadingPreview ||
                uploadingImages
              }
              className="rk-btn rk-btn-primary"
            >
              {saving
                ? "Guardando..."
                : "Guardar imágenes"}
            </button>

            <Link
              href={`/creadores/productos/${id}`}
              className="rk-btn rk-btn-glass"
            >
              Cancelar
            </Link>

          </div>

        </section>
      </div>
    </main>
  );
}