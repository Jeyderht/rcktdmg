"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import TagsInput from "@/components/creador/TagsInput";

type Props = {
  id: string;
  nombre: string;
  descripcion: string;
  /** Precio con 2 decimales, como texto. */
  precio: string;
  categoryId: string;
  categorias: { id: string; name: string }[];
  /** Etiquetas descriptivas (sin las protegidas, como «pack»). */
  etiquetas: string[];
  status: "PUBLISHED" | "ARCHIVED";
  /** Packs y colecciones PUBLICADOS que incluyen el recurso. */
  enPacks: number;
  enColecciones: number;
};

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Gestión de un recurso publicado o archivado (solo ADMIN):
 * editar sus datos, archivarlo y restaurarlo. Todo va a
 * PATCH /api/admin/recursos/[id], que valida y deja registro.
 */
export default function GestionRecurso(props: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState(props.nombre);
  const [descripcion, setDescripcion] = useState(props.descripcion);
  const [precio, setPrecio] = useState(props.precio);
  const [categoryId, setCategoryId] = useState(props.categoryId);
  const [etiquetas, setEtiquetas] = useState<string[]>(props.etiquetas);

  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  async function enviar(cuerpo: Record<string, unknown>) {
    setEnviando(true);
    setAviso(null);

    try {
      const respuesta = await fetch(`/api/admin/recursos/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });

      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error || "No se pudieron guardar los cambios." });
        return;
      }

      setAviso({ tipo: "ok", texto: datos.message || "Cambios guardados." });
      router.refresh();
    } catch {
      setAviso({ tipo: "error", texto: "No hay conexión con el servidor. Inténtalo de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  function guardar(e: FormEvent) {
    e.preventDefault();

    void enviar({ name: nombre, description: descripcion, price: precio, categoryId, tags: etiquetas });
  }

  function archivar() {
    const enOtros =
      props.enPacks + props.enColecciones > 0
        ? `Está en ${plural(props.enPacks, "pack publicado", "packs publicados")} y ${plural(props.enColecciones, "colección publicada", "colecciones publicadas")}: seguirán vendiéndose con los demás recursos, sin este.`
        : "No está en ningún pack ni colección publicados.";

    const ok = window.confirm(
      `¿Archivar «${props.nombre}»?\n\nDejará de verse en la tienda, el buscador, el inicio y el sitemap. Quien ya lo compró lo seguirá descargando.\n\n${enOtros}\n\nPodrás restaurarlo después.`
    );

    if (ok) void enviar({ status: "ARCHIVED" });
  }

  function restaurar() {
    const ok = window.confirm(
      `¿Restaurar «${props.nombre}»?\n\nVolverá a estar publicado y a verse en la tienda.`
    );

    if (ok) void enviar({ status: "PUBLISHED" });
  }

  return (
    <div className="mt-4 space-y-4">
      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={
            aviso.tipo === "error"
              ? "rk-upload-error rk-fade"
              : "rk-fade rounded-rk-sm border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
          }
        >
          {aviso.texto}
        </div>
      )}

      <form onSubmit={guardar} className="rk-card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="adm-nombre" className="rk-label mb-2 block">
              Nombre
            </label>
            <input
              id="adm-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={150}
              className="rk-input w-full"
            />
          </div>

          <div>
            <label htmlFor="adm-precio" className="rk-label mb-2 block">
              Precio (S/)
            </label>
            <input
              id="adm-precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              title="Un número mayor o igual a 0, con hasta 2 decimales"
              className="rk-input w-full"
            />
          </div>

          <div>
            <label htmlFor="adm-categoria" className="rk-label mb-2 block">
              Categoría
            </label>
            <select
              id="adm-categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="rk-select w-full"
            >
              {props.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="adm-descripcion" className="rk-label mb-2 block">
              Descripción
            </label>
            <textarea
              id="adm-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              maxLength={5000}
              rows={5}
              className="rk-textarea w-full"
            />
          </div>

          <div className="sm:col-span-2">
            <p className="rk-label mb-2 block">Etiquetas</p>
            <TagsInput valor={etiquetas} onChange={setEtiquetas} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="submit" disabled={enviando} className="rk-btn rk-btn-primary">
            {enviando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      <div className="rk-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="max-w-md text-sm leading-6 text-ink/65">
          {props.status === "PUBLISHED"
            ? "Archivar lo oculta de la tienda, el buscador y el inicio sin borrarlo. Quien lo compró lo sigue descargando."
            : "Este recurso está archivado: no se ve en la tienda. Restaurarlo lo vuelve a publicar."}
        </p>

        {props.status === "PUBLISHED" ? (
          <button type="button" disabled={enviando} onClick={archivar} className="rk-btn rk-btn-line">
            Archivar
          </button>
        ) : (
          <button type="button" disabled={enviando} onClick={restaurar} className="rk-btn rk-btn-primary">
            Restaurar
          </button>
        )}
      </div>
    </div>
  );
}
