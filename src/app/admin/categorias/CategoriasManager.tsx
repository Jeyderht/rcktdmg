"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Power, Trash2, X } from "lucide-react";

import SubirPortada from "@/components/SubirPortada";
import { esSlugDelSistema } from "@/lib/tipos-publicacion";
import {
  LARGO_DESCRIPCION_CATEGORIA,
  LARGO_NOMBRE_CATEGORIA,
} from "@/lib/categorias";

type Categoria = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isActive: boolean;
  _count: { products: number };
};

/**
 * Categorías del catálogo.
 *
 * Solo administración las crea, renombra o retira. Los
 * creadores ELIGEN de esta lista al publicar: no hay ninguna
 * ruta que les permita añadir una.
 *
 * Retirar una categoría con recursos la DESACTIVA en lugar de
 * borrarla, porque sus productos seguirían necesitándola.
 */
export default function CategoriasManager() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [portada, setPortada] = useState<string | null>(null);

  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [slugEdit, setSlugEdit] = useState("");
  const [descripcionEdit, setDescripcionEdit] = useState("");
  const [portadaEdit, setPortadaEdit] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const respuesta = await fetch("/api/admin/categorias", {
        cache: "no-store",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar.");
      }

      setCategorias(datos.categorias);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudieron cargar."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function llamar(
    url: string,
    opciones: RequestInit,
    id: string
  ): Promise<Record<string, unknown> | null> {
    setEnCurso(id);
    setError("");
    setAviso("");

    try {
      const respuesta = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opciones,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo completar.");
      }

      await cargar();

      return datos;
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo completar."
      );

      return null;
    } finally {
      setEnCurso(null);
    }
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();

    const datos = await llamar(
      "/api/admin/categorias",
      {
        method: "POST",
        body: JSON.stringify({
          name: nombre,
          description: descripcion,
          coverUrl: portada ?? "",
        }),
      },
      "nueva"
    );

    if (datos) {
      setNombre("");
      setDescripcion("");
      setPortada(null);
      setCreando(false);
    }
  }

  async function retirar(categoria: Categoria) {
    const datos = await llamar(
      `/api/admin/categorias/${categoria.id}`,
      { method: "DELETE" },
      categoria.id
    );

    if (datos?.mensaje) setAviso(String(datos.mensaje));
  }

  return (
    <div>
      {/* ══════════ CREAR ══════════ */}
      {creando ? (
        <form onSubmit={crear} className="rk-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cat-nombre" className="rk-label">
                Nombre
              </label>

              <input
                id="cat-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={LARGO_NOMBRE_CATEGORIA}
                required
                className="rk-input mt-1.5 w-full"
              />
            </div>

            <div>
              <label htmlFor="cat-desc" className="rk-label">
                Descripción (opcional)
              </label>

              <input
                id="cat-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={LARGO_DESCRIPCION_CATEGORIA}
                className="rk-input mt-1.5 w-full"
              />
            </div>
          </div>

          <div className="mt-4">
            <SubirPortada
              valor={portada}
              alCambiar={setPortada}
              ayuda="Se ve en la tienda y en la portada del sitio. Es pública."
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={enCurso === "nueva"}
              className="rk-btn rk-btn-ink disabled:opacity-60"
            >
              {enCurso === "nueva" ? (
                <Loader2 size={15} aria-hidden className="animate-spin" />
              ) : (
                <Check size={15} aria-hidden />
              )}
              Crear categoría
            </button>

            <button
              type="button"
              onClick={() => setCreando(false)}
              className="rk-btn rk-btn-line"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="rk-btn rk-btn-ink"
        >
          <Plus size={15} aria-hidden />
          Nueva categoría
        </button>
      )}

      {error && (
        <p role="alert" className="rk-upload-error mt-4">
          {error}
        </p>
      )}

      {aviso && (
        <p role="status" className="mt-4 text-sm text-ink/70">
          {aviso}
        </p>
      )}

      {/* ══════════ LISTA ══════════ */}
      {cargando ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-ink/55">
          <Loader2 size={15} aria-hidden className="animate-spin" />
          Cargando…
        </p>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {categorias.map((categoria) => (
            <li
              key={categoria.id}
              className={`rk-row-card flex flex-wrap items-center justify-between gap-4 ${
                categoria.isActive ? "" : "opacity-60"
              }`}
            >
              {/* Miniatura de la portada, si la tiene. */}
              {categoria.coverUrl && (
                <span className="rk-frame relative block h-12 w-20 shrink-0 overflow-hidden rounded-rk-sm">
                  <Image
                    src={categoria.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </span>
              )}

              <div className="min-w-0 flex-1">
                {editando === categoria.id ? (
                  <div className="space-y-3">
                    <input
                      value={nombreEdit}
                      onChange={(e) => setNombreEdit(e.target.value)}
                      maxLength={LARGO_NOMBRE_CATEGORIA}
                      aria-label="Nuevo nombre"
                      className="rk-input w-full max-w-sm"
                    />

                    {/*
                      El slug es la dirección de la categoría.
                      Las cuatro de las que depende el sistema
                      —eventos, corporativos, general y social
                      media— no lo cambian: de él salen las
                      medidas que se exigen a sus recursos. El
                      nombre sí se puede cambiar en todas.
                    */}
                    <div className="max-w-sm">
                      <input
                        value={slugEdit}
                        onChange={(e) => setSlugEdit(e.target.value)}
                        disabled={esSlugDelSistema(categoria.slug)}
                        aria-label="Slug de la categoría"
                        placeholder="slug-de-la-categoria"
                        className="rk-input w-full disabled:opacity-60"
                      />

                      <p className="mt-1 text-[12px] leading-5 text-ink/55">
                        {esSlugDelSistema(categoria.slug)
                          ? "Esta dirección no se puede cambiar: de ella dependen las medidas que se exigen a sus recursos."
                          : "Es la dirección pública. Cambiarla rompe los enlaces que ya se hayan compartido."}
                      </p>
                    </div>

                    <textarea
                      value={descripcionEdit}
                      onChange={(e) => setDescripcionEdit(e.target.value)}
                      rows={2}
                      aria-label="Descripción de la categoría"
                      placeholder="Para qué sirve esta categoría."
                      className="rk-textarea w-full max-w-sm"
                    />

                    <SubirPortada
                      valor={portadaEdit}
                      alCambiar={setPortadaEdit}
                    />
                  </div>
                ) : (
                  <p className="truncate text-[15px] font-semibold">
                    {categoria.name}
                  </p>
                )}

                <p className="mt-0.5 truncate text-[13px] tabular-nums text-ink/55">
                  /{categoria.slug} · {categoria._count.products}{" "}
                  {categoria._count.products === 1 ? "recurso" : "recursos"}
                  {!categoria.isActive && " · retirada"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-1.5">
                {editando === categoria.id ? (
                  <>
                    <button
                      type="button"
                      disabled={enCurso === categoria.id}
                      onClick={async () => {
                        const ok = await llamar(
                          `/api/admin/categorias/${categoria.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              name: nombreEdit,
                              slug: slugEdit,
                              description: descripcionEdit,
                              coverUrl: portadaEdit ?? "",
                            }),
                          },
                          categoria.id
                        );

                        if (ok) setEditando(null);
                      }}
                      aria-label="Guardar nombre"
                      className="rk-notif-check" style={{ margin: 0, width: 40, height: 40 }}
                    >
                      <Check size={16} aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      aria-label="Cancelar"
                      className="rk-notif-check" style={{ margin: 0, width: 40, height: 40 }}
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(categoria.id);
                        setNombreEdit(categoria.name);
                        setSlugEdit(categoria.slug);
                        setDescripcionEdit(categoria.description ?? "");
                        setPortadaEdit(categoria.coverUrl);
                      }}
                      className="rk-btn rk-btn-line"
                    >
                      Renombrar
                    </button>

                    <button
                      type="button"
                      disabled={enCurso === categoria.id}
                      onClick={() =>
                        llamar(
                          `/api/admin/categorias/${categoria.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              isActive: !categoria.isActive,
                            }),
                          },
                          categoria.id
                        )
                      }
                      aria-label={
                        categoria.isActive ? "Retirar" : "Reactivar"
                      }
                      title={categoria.isActive ? "Retirar" : "Reactivar"}
                      className="rk-notif-check" style={{ margin: 0, width: 40, height: 40 }}
                    >
                      <Power size={16} aria-hidden />
                    </button>

                    {categoria._count.products === 0 && (
                      <button
                        type="button"
                        disabled={enCurso === categoria.id}
                        onClick={() => retirar(categoria)}
                        aria-label="Eliminar"
                        title="Eliminar"
                        className="rk-icon-button-danger"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
