"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Lock,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { IconoBasura, IconoBuscar } from "@/components/iconos";

type TagAdmin = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  recursos: number;
  protegida: boolean;
};

/**
 * Administración de etiquetas.
 *
 * Las etiquetas protegidas se muestran, pero sin acciones: el
 * servidor las rechaza igualmente, y esconderlas del todo
 * dejaría al administrador sin saber por qué existe una
 * etiqueta "Pack" que él no creó.
 */
export default function TagsManager() {
  const [tags, setTags] = useState<TagAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [nueva, setNueva] = useState("");
  const [creando, setCreando] = useState(false);

  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");

  const cargar = useCallback(async (consulta: string) => {
    setCargando(true);

    try {
      const respuesta = await fetch(
        `/api/admin/tags?q=${encodeURIComponent(consulta)}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar.");
      }

      setTags(datos.tags ?? []);
      setError("");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron cargar las etiquetas."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => cargar(busqueda), 250);

    return () => clearTimeout(temporizador);
  }, [busqueda, cargar]);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();

    const nombre = nueva.trim();

    if (!nombre || creando) return;

    setCreando(true);
    setError("");
    setAviso("");

    try {
      const respuesta = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo crear.");
      }

      setNueva("");
      setAviso(`Etiqueta “${datos.tag.name}” creada.`);
      await cargar(busqueda);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo crear."
      );
    } finally {
      setCreando(false);
    }
  }

  async function guardar(id: string) {
    const nombre = borrador.trim();

    if (!nombre) return;

    setError("");
    setAviso("");

    try {
      const respuesta = await fetch(`/api/admin/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo guardar.");
      }

      setEditando(null);
      setAviso("Etiqueta actualizada.");
      await cargar(busqueda);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo guardar."
      );
    }
  }

  async function borrar(tag: TagAdmin) {
    setError("");
    setAviso("");

    /*
      Primer intento sin forzar. Si la etiqueta está en uso, el
      servidor responde 409 y solo entonces se pregunta: así el
      aviso dice cuántos recursos se verían afectados en lugar
      de una advertencia genérica.
    */
    const primera = await fetch(`/api/admin/tags/${tag.id}`, {
      method: "DELETE",
    });

    const datos = await primera.json();

    if (primera.ok) {
      setAviso(`Etiqueta “${tag.name}” eliminada.`);
      await cargar(busqueda);
      return;
    }

    if (datos.error !== "ETIQUETA_EN_USO") {
      setError(datos.error || "No se pudo eliminar.");
      return;
    }

    const confirmado = window.confirm(
      `“${tag.name}” está en ${datos.recursos} ${
        datos.recursos === 1 ? "recurso" : "recursos"
      }. Si la eliminas, se quitará de todos ellos. Esta acción no se puede deshacer.\n\n¿Continuar?`
    );

    if (!confirmado) return;

    const segunda = await fetch(
      `/api/admin/tags/${tag.id}?forzar=true`,
      { method: "DELETE" }
    );

    if (!segunda.ok) {
      const fallo = await segunda.json();
      setError(fallo.error || "No se pudo eliminar.");
      return;
    }

    setAviso(`Etiqueta “${tag.name}” eliminada.`);
    await cargar(busqueda);
  }

  return (
    <div>
      {/* CREAR */}
      <form onSubmit={crear} className="flex flex-wrap gap-2.5">
        <input
          type="text"
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
          placeholder="Nueva etiqueta"
          aria-label="Nombre de la nueva etiqueta"
          maxLength={40}
          className="rk-input min-w-0 flex-1 sm:max-w-xs"
        />

        <button
          type="submit"
          disabled={!nueva.trim() || creando}
          className="rk-btn rk-btn-ink disabled:opacity-50"
        >
          <Plus size={15} aria-hidden />
          {creando ? "Creando…" : "Crear"}
        </button>
      </form>

      {/* BUSCAR */}
      <div className="relative mt-3">
        <IconoBuscar
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45"
        />

        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar etiquetas"
          aria-label="Buscar etiquetas"
          className="rk-input !pl-11"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rk-upload-error mt-4"
        >
          {error}
        </p>
      )}

      {aviso && (
        <p
          role="status"
          className="mt-4 rounded-rk-sm border border-line/15 bg-ink/[0.04] px-4 py-3 text-sm"
        >
          {aviso}
        </p>
      )}

      {/* LISTA */}
      <div className="rk-divider mt-6" />

      {cargando ? (
        <div aria-busy="true" className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, indice) => (
            <div
              key={indice}
              className="h-14 animate-pulse rounded-rk-sm bg-ink/[0.05]"
            />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/60">
          {busqueda
            ? "Ninguna etiqueta coincide con la búsqueda."
            : "Todavía no hay etiquetas."}
        </p>
      ) : (
        <ul className="mt-5 space-y-1.5">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex flex-wrap items-center gap-3 rounded-rk-sm border border-line/12 px-4 py-3"
            >
              {editando === tag.id ? (
                <>
                  <input
                    type="text"
                    value={borrador}
                    onChange={(evento) => setBorrador(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter") guardar(tag.id);
                      if (evento.key === "Escape") setEditando(null);
                    }}
                    aria-label={`Nuevo nombre para ${tag.name}`}
                    maxLength={40}
                    autoFocus
                    className="rk-input min-w-0 flex-1"
                  />

                  <button
                    type="button"
                    onClick={() => guardar(tag.id)}
                    aria-label="Guardar"
                    className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm hover:bg-ink/[0.06]"
                  >
                    <Check size={16} aria-hidden />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    aria-label="Cancelar"
                    className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-ink/[0.06]"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {tag.name}

                      {tag.protegida && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink/55">
                          <Lock size={10} aria-hidden />
                          Sistema
                        </span>
                      )}
                    </p>

                    <p className="truncate text-xs text-ink/50">
                      /{tag.slug} · {tag.recursos}{" "}
                      {tag.recursos === 1 ? "recurso" : "recursos"}
                    </p>
                  </div>

                  {tag.protegida ? (
                    <p className="max-w-xs text-xs leading-5 text-ink/55">
                      Marca qué recursos son packs en toda la
                      tienda. No se puede renombrar ni eliminar.
                    </p>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(tag.id);
                          setBorrador(tag.name);
                        }}
                        aria-label={`Renombrar ${tag.name}`}
                        className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                      >
                        <Pencil size={15} aria-hidden />
                      </button>

                      <button
                        type="button"
                        onClick={() => borrar(tag)}
                        aria-label={`Eliminar ${tag.name}`}
                        className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-danger/10 hover:text-danger"
                      >
                        <IconoBasura size={15} aria-hidden />
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
