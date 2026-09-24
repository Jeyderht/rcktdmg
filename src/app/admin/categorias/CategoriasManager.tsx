"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Power, Trash2, X } from "lucide-react";

import SubirPortada from "@/components/SubirPortada";
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
              <label htmlFor="cat-nombre" className="text-sm font-medium">
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
              <label htmlFor="cat-desc" className="text-sm font-medium">
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
              className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-60"
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
              className="rk-btn rk-btn-line !px-5 !py-2.5 !text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px]"
        >
          <Plus size={15} aria-hidden />
          Nueva categoría
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
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
              className={`rk-card flex flex-wrap items-center justify-between gap-4 p-4 ${
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
                              coverUrl: portadaEdit ?? "",
                            }),
                          },
                          categoria.id
                        );

                        if (ok) setEditando(null);
                      }}
                      aria-label="Guardar nombre"
                      className="rk-press rk-touch grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5"
                    >
                      <Check size={16} aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      aria-label="Cancelar"
                      className="rk-press rk-touch grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5"
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
                        setPortadaEdit(categoria.coverUrl);
                      }}
                      className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px]"
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
                      className="rk-press rk-touch grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5"
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
                        className="rk-press rk-touch grid h-11 w-11 place-items-center rounded-full text-danger hover:bg-danger/10"
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
