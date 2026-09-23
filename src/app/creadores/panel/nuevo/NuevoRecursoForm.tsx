"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { subirArchivoDeProducto } from "@/lib/storage/client-upload";
import { COLORES } from "@/lib/catalogo";
import {
  CheckCircle2,
  ChevronLeft,
  FileUp,
  ImageIcon,
  Info,
  UploadCloud,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
};

/**
 * Formulario de creación de recurso.
 *
 * La lógica es exactamente la anterior: mismos campos, mismas
 * validaciones y el mismo POST a /api/creadores/productos. Lo
 * que cambia es la organización visual en tres bloques:
 * información, archivos y publicación.
 */
export default function NuevoRecursoForm({
  categories,
}: {
  categories: Category[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [accessType, setAccessType] = useState("BOTH");
  const [color, setColor] = useState("");
  const [esPack, setEsPack] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      setMessage("Archivo subido correctamente.");
    } catch (error) {
      console.error(error);

      setFileUrl("");
      setFileName("");

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fileUrl) {
      setError(
        "Debes subir el archivo del producto antes de guardarlo."
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/creadores/productos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          categoryId,
          price,
          accessType,
          color: color || null,
          esPack,
          coverUrl,
          previewUrl,
          fileUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo crear el recurso.");
        return;
      }

      setMessage("Recurso creado correctamente.");

      setName("");
      setDescription("");
      setCategoryId("");
      setPrice("");
      setAccessType("BOTH");
      setColor("");
      setEsPack(false);
      setCoverUrl("");
      setPreviewUrl("");
      setFileUrl("");
      setFileName("");
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up">
        <Link
          href="/creadores/panel"
          className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
        >
          <ChevronLeft size={15} />
          Creator Studio
        </Link>

        <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl">
          Nuevo recurso
        </h1>

        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
          Completa la información y sube el archivo para
          publicarlo en RCKTDMG.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-3">

        {/* ========== INFORMACIÓN ========== */}
        <section className="rk-fade-up rk-enter-1 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 1</p>

          <h2 className="rk-title mt-2 text-xl">Información</h2>

          <div className="rk-divider mt-4" />

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Nombre
              </label>

              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Pack Social Media Pro"
                required
                className="rk-input w-full"
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
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué incluye tu recurso y para quién es."
                required
                rows={5}
                className="rk-textarea w-full resize-y"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium"
                >
                  Categoría
                </label>

                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="rk-select w-full"
                >
                  <option value="">
                    Selecciona una categoría
                  </option>

                  {/* Categorías reales de la base de datos. */}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium"
                >
                  Precio
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/60">
                    S/
                  </span>

                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rk-input w-full !pl-10 tabular-nums"
                  />
                </div>
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
                onChange={(e) => setAccessType(e.target.value)}
                className="rk-select w-full"
              >
                <option value="INDIVIDUAL">
                  Compra individual
                </option>

                <option value="PLAN">Incluido en planes</option>

                <option value="BOTH">Compra + planes</option>
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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
                  Ayuda a que tu recurso aparezca al filtrar por
                  color en la tienda.
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
                      Marca esta casilla si el archivo reúne varios
                      recursos en un solo paquete.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/*
              El formato no se escribe a mano: se toma del archivo
              que subas en el paso 2.
            */}
          </div>
        </section>

        {/* ========== ARCHIVOS ========== */}
        <section className="rk-fade-up rk-enter-2 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 2</p>

          <h2 className="rk-title mt-2 text-xl">Archivos</h2>

          <div className="rk-divider mt-4" />

          <div className="mt-5 space-y-5">
            {/* ARCHIVO PRINCIPAL */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Archivo del recurso
              </p>

              <div className="rounded-rk-md border border-dashed border-line/20 bg-ink/[0.02] p-6 text-center transition-colors duration-normal ease-rk hover:border-ink/40">
                <span
                  aria-hidden
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink"
                >
                  <UploadCloud size={22} />
                </span>

                <input
                  id="product-file"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />

                <label
                  htmlFor="product-file"
                  className="rk-btn rk-btn-primary mt-4 cursor-pointer rk-btn-compact !px-5 !py-2.5 !text-sm"
                >
                  <FileUp size={15} />
                  {uploadingFile
                    ? "Subiendo archivo..."
                    : "Seleccionar archivo"}
                </label>

                <p className="mt-3 text-xs text-ink/60">
                  Máximo 100 MB
                </p>

                {fileName && (
                  <div className="rk-fade mx-auto mt-5 max-w-md rounded-rk-sm border border-success/25 bg-success/10 p-4 text-left">
                    <p className="rk-eyebrow !text-success/80">
                      Archivo cargado
                    </p>

                    <p className="mt-2 break-all text-sm font-medium">
                      {fileName}
                    </p>

                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 size={13} />
                      Listo para asociar al recurso
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* IMÁGENES POR URL */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coverUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  URL de portada
                </label>

                <input
                  id="coverUrl"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="rk-input w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="previewUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  URL de vista previa
                </label>

                <input
                  id="previewUrl"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  placeholder="https://..."
                  className="rk-input w-full"
                />
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs leading-5 text-ink/60">
              <ImageIcon size={14} className="mt-0.5 shrink-0" />
              La galería completa se gestiona desde el recurso,
              una vez creado.
            </p>
          </div>
        </section>

        {/* ========== PUBLICACIÓN ========== */}
        <section className="rk-fade-up rk-enter-3 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 3</p>

          <h2 className="rk-title mt-2 text-xl">Publicación</h2>

          <div className="rk-divider mt-4" />

          {/* Comportamiento real del backend, no una promesa. */}
          <p className="mt-5 flex items-start gap-2.5 text-sm leading-6 text-ink/60">
            <Info size={16} className="mt-0.5 shrink-0 text-ink" />
            El recurso se guarda como borrador. Desde “Mis
            recursos” podrás enviarlo a revisión para que el
            equipo lo publique.
          </p>

          {error && (
            <div
              role="alert"
              className="rk-fade mt-5 rounded-rk-sm border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rk-fade mt-5 rounded-rk-sm border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
            >
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Link
              href="/creadores/panel/recursos"
              className="rk-btn rk-btn-glass"
            >
              Mis recursos
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rk-btn rk-btn-primary"
            >
              {loading ? "Guardando..." : "Guardar recurso"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
