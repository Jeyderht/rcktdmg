"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function NuevoRecursoPage() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [price, setPrice] = useState("");
    const [accessType, setAccessType] = useState("BOTH");
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
            const formData = new FormData();

            formData.append("file", file);

            const response = await fetch("/api/uploads/product", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudo subir el archivo."
                );
            }

            setFileUrl(data.fileUrl);
            setFileName(data.fileName);

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
            setError("Debes subir el archivo del producto antes de guardarlo.");
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
        <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/creadores/panel"
                    className="text-sm text-ink/50 hover:text-ink"
                >
                    ← Volver al Creator Studio
                </Link>

                <div className="mt-8">
                    <p className="text-sm font-medium uppercase tracking-wider text-ink/40">
                        Creator Studio
                    </p>

                    <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                        Nuevo recurso
                    </h1>

                    <p className="mt-3 text-ink/50">
                        Crea un recurso para publicarlo en RCKTDMG.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                    <section className="rk-card p-7">
                        <h2 className="text-xl font-semibold">
                            Información del recurso
                        </h2>

                        <div className="mt-6 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Nombre
                                </label>

                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Pack Social Media Pro"
                                    required
                                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none focus:border-accent/45"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Descripción
                                </label>

                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe tu recurso..."
                                    required
                                    rows={5}
                                    className="w-full resize-none rounded-2xl border border-ink/10 px-4 py-3 outline-none focus:border-accent/45"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Categoría
                                </label>

                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    required
                                    className="w-full rk-card px-4 py-3 outline-none focus:border-accent/45"
                                >
                                    <option value="">Selecciona una categoría</option>

                                    <option value="cmteq0qqs0003b6c833pg4x41">
                                        Plantillas
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="rk-card p-7">
                        <h2 className="text-xl font-semibold">
                            Precio y acceso
                        </h2>

                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Precio
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none focus:border-accent/45"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Tipo de acceso
                                </label>

                                <select
                                    value={accessType}
                                    onChange={(e) => setAccessType(e.target.value)}
                                    className="w-full rk-card px-4 py-3 outline-none focus:border-accent/45"
                                >
                                    <option value="INDIVIDUAL">
                                        Compra individual
                                    </option>

                                    <option value="PLAN">
                                        Incluido en planes
                                    </option>

                                    <option value="BOTH">
                                        Compra + planes
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="rk-card p-7">
                        <h2 className="text-xl font-semibold">
                            Archivos
                        </h2>

                        <div className="mt-6 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    URL de portada
                                </label>

                                <input
                                    value={coverUrl}
                                    onChange={(e) => setCoverUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none focus:border-accent/45"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    URL de vista previa
                                </label>

                                <input
                                    value={previewUrl}
                                    onChange={(e) => setPreviewUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none focus:border-accent/45"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Archivo del producto
                                </label>

                                <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-ink/[0.05] p-8 text-center transition hover:border-ink/20">
                                    <input
                                        id="product-file"
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                        className="hidden"
                                    />

                                    <label
                                        htmlFor="product-file"
                                        className="inline-flex cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium text-onprimary transition hover:opacity-90"
                                    >
                                        {uploadingFile
                                            ? "Subiendo archivo..."
                                            : "Seleccionar archivo"}
                                    </label>

                                    <p className="mt-4 text-sm text-ink/40">
                                        Máximo 100 MB
                                    </p>

                                    {fileName && (
                                        <div className="mx-auto mt-5 max-w-md rounded-2xl bg-surface p-4 text-left shadow-sm">
                                            <p className="text-xs uppercase tracking-wider text-ink/40">
                                                Archivo cargado
                                            </p>

                                            <p className="mt-2 break-all text-sm font-medium">
                                                {fileName}
                                            </p>

                                            <p className="mt-1 text-xs text-success">
                                                ✓ Archivo listo para asociar al producto
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div className="rounded-2xl bg-danger/10 px-5 py-4 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="rounded-2xl bg-success/12 px-5 py-4 text-sm text-success">
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-full bg-primary px-8 py-3 font-medium text-onprimary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Guardando..." : "Guardar recurso"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}