"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Check, ImagePlus } from "lucide-react";

import {
  AVATARES,
  MAX_FOTO_CLIENTE,
  TIPOS_FOTO_CLIENTE,
} from "@/lib/avatares";

/** Lado del recorte en pantalla y de la imagen que se sube. */
const VISOR = 240;
const SALIDA = 512;

type Recorte = {
  url: string;
  ancho: number;
  alto: number;
  zoom: number;
  x: number;
  y: number;
};

/**
 * «Tu foto de perfil»: elegir uno de los 12 avatares o subir una
 * foto propia, con recorte cuadrado y vista redonda.
 *
 * Mismo diálogo que el resto del sitio (un <dialog> nativo con
 * showModal: capa superior, foco atrapado y Escape) y mismas clases
 * de vidrio y botones que los diálogos propios.
 *
 * Guarda él mismo: el avatar con PATCH /api/cuenta/avatar y la foto
 * con POST /api/uploads/creator-avatar. Al terminar llama a
 * `alGuardar` con la URL nueva.
 */
export default function ElegirFoto({
  abierto,
  alCerrar,
  alGuardar,
  textoCerrar = "Cancelar",
  titulo = "Tu foto de perfil",
}: {
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: (avatarUrl: string) => void;
  /** «Más tarde» en el primer ingreso, «Cancelar» al cambiarla. */
  textoCerrar?: string;
  titulo?: string;
}) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const [elegido, setElegido] = useState<string | null>(null);
  const [recorte, setRecorte] = useState<Recorte | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = dialogo.current;

    if (!el) return;

    if (abierto && !el.open) el.showModal();
    else if (!abierto && el.open) el.close();
  }, [abierto]);

  // La URL temporal de la foto se libera al cambiar de foto o al salir
  // (no al encuadrar: depende solo de la URL, no del zoom ni la posición).
  const urlRecorte = recorte?.url;

  useEffect(() => {
    return () => {
      if (urlRecorte) URL.revokeObjectURL(urlRecorte);
    };
  }, [urlRecorte]);

  function cerrar() {
    setElegido(null);
    setRecorte(null);
    setError("");
    alCerrar();
  }

  /* ── Foto propia ─────────────────────────────────────────── */

  function elegirArchivo(file: File | undefined) {
    setError("");

    if (!file) return;

    if (!(TIPOS_FOTO_CLIENTE as readonly string[]).includes(file.type)) {
      setError("Formato no permitido. Usa JPG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_FOTO_CLIENTE) {
      setError("La foto no puede superar los 2 MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const escala = VISOR / Math.min(img.naturalWidth, img.naturalHeight);

      setElegido(null);
      setRecorte({
        url,
        ancho: img.naturalWidth,
        alto: img.naturalHeight,
        zoom: 1,
        x: (VISOR - img.naturalWidth * escala) / 2,
        y: (VISOR - img.naturalHeight * escala) / 2,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("No se pudo leer la imagen.");
    };
    img.src = url;
  }

  /** Escala en pantalla de la foto con el zoom actual. */
  const escalaDe = (r: Recorte) => (VISOR / Math.min(r.ancho, r.alto)) * r.zoom;

  /** Mantiene la foto cubriendo el recorte entero. */
  function encajar(r: Recorte): Recorte {
    const s = escalaDe(r);
    const min = (lado: number) => VISOR - lado * s;

    return {
      ...r,
      x: Math.min(0, Math.max(min(r.ancho), r.x)),
      y: Math.min(0, Math.max(min(r.alto), r.y)),
    };
  }

  function cambiarZoom(zoom: number) {
    setRecorte((r) => {
      if (!r) return r;

      // El zoom se hace desde el centro del recorte.
      const s0 = escalaDe(r);
      const s1 = escalaDe({ ...r, zoom });
      const cx = (VISOR / 2 - r.x) / s0;
      const cy = (VISOR / 2 - r.y) / s0;

      return encajar({ ...r, zoom, x: VISOR / 2 - cx * s1, y: VISOR / 2 - cy * s1 });
    });
  }

  function empezarArrastre(e: PointerEvent<HTMLDivElement>) {
    if (!recorte) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { px: e.clientX, py: e.clientY, x: recorte.x, y: recorte.y };
  }

  function moverArrastre(e: PointerEvent<HTMLDivElement>) {
    const a = arrastre.current;

    if (!a) return;

    setRecorte((r) =>
      r ? encajar({ ...r, x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py }) : r
    );
  }

  /** El cuadrado visible, a 512 × 512, en JPEG. */
  async function exportar(r: Recorte): Promise<Blob> {
    const img = new window.Image();
    img.src = r.url;
    await img.decode();

    const lienzo = document.createElement("canvas");
    lienzo.width = SALIDA;
    lienzo.height = SALIDA;

    const s = escalaDe(r);
    lienzo.getContext("2d")?.drawImage(img, -r.x / s, -r.y / s, VISOR / s, VISOR / s, 0, 0, SALIDA, SALIDA);

    return new Promise((resolver, rechazar) =>
      lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("lienzo"))), "image/jpeg", 0.9)
    );
  }

  /* ── Guardar ─────────────────────────────────────────────── */

  async function guardar() {
    setGuardando(true);
    setError("");

    try {
      let respuesta: Response;

      if (recorte) {
        const datos = new FormData();
        datos.append("file", new File([await exportar(recorte)], "foto.jpg", { type: "image/jpeg" }));
        respuesta = await fetch("/api/uploads/creator-avatar", { method: "POST", body: datos });
      } else {
        respuesta = await fetch("/api/cuenta/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: elegido }),
        });
      }

      const datos = (await respuesta.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };

      if (!respuesta.ok || !datos.avatarUrl) {
        setError(datos.error || "No se pudo guardar la foto.");
        return;
      }

      alGuardar(datos.avatarUrl);
      setElegido(null);
      setRecorte(null);
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const listo = Boolean(elegido || recorte);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
      className="rk-glass-strong m-auto w-[min(28rem,calc(100vw-2rem))] rounded-rk-md p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <h2 id={`${id}-titulo`} className="text-base font-semibold leading-6">
          {titulo}
        </h2>

        {recorte ? (
          <>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              Arrastra para encuadrar y usa el zoom. Se verá redonda.
            </p>

            {/* RECORTE: cuadrado, con la vista redonda marcada encima. */}
            <div
              className="relative mx-auto mt-4 touch-none overflow-hidden rounded-rk-sm"
              style={{ width: VISOR, height: VISOR, cursor: "grab" }}
              onPointerDown={empezarArrastre}
              onPointerMove={moverArrastre}
              onPointerUp={() => (arrastre.current = null)}
              onPointerCancel={() => (arrastre.current = null)}
            >
              <div
                className="absolute"
                style={{
                  left: recorte.x,
                  top: recorte.y,
                  width: recorte.ancho * escalaDe(recorte),
                  height: recorte.alto * escalaDe(recorte),
                }}
              >
                <Image src={recorte.url} alt="Tu foto, para recortar" fill unoptimized draggable={false} className="select-none object-fill" />
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(var(--pal-negro)/0.45)] ring-2 ring-[rgb(var(--pal-blanco)/0.85)]"
              />
            </div>

            <label htmlFor={`${id}-zoom`} className="rk-label mb-2 mt-4 block">
              Zoom
            </label>
            <input
              id={`${id}-zoom`}
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={recorte.zoom}
              onChange={(e) => cambiarZoom(Number(e.target.value))}
              className="w-full accent-[rgb(var(--rk-foreground))]"
            />
          </>
        ) : (
          <>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              Elige uno de nuestros avatares o sube tu propia foto.
            </p>

            <div role="group" aria-label="Avatares" className="mt-4 grid grid-cols-4 gap-2.5">
              {AVATARES.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={elegido === a.id}
                  aria-label={`Avatar ${i + 1}`}
                  onClick={() => setElegido(a.id)}
                  className={`rk-press relative aspect-square overflow-hidden rounded-full border-2 ${
                    elegido === a.id ? "border-ink" : "border-transparent"
                  }`}
                >
                  <Image src={a.src} alt="" fill unoptimized sizes="80px" className="object-cover" />
                  {elegido === a.id && (
                    <span className="absolute bottom-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-background">
                      <Check size={12} aria-hidden />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="rk-divider mt-4" />

            <button
              type="button"
              onClick={() => archivo.current?.click()}
              className="rk-btn rk-btn-line mt-4 w-full"
            >
              <ImagePlus size={16} aria-hidden />
              Subir mi foto
            </button>
            <p className="mt-2 text-center text-xs text-ink/60">JPG, PNG o WEBP · máximo 2 MB</p>
            <input
              ref={archivo}
              type="file"
              accept={TIPOS_FOTO_CLIENTE.join(",")}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                elegirArchivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        )}

        {error && (
          <p role="alert" className="rk-upload-error rk-fade mt-4">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          {recorte ? (
            <button type="button" onClick={() => setRecorte(null)} className="rk-btn rk-btn-line rk-btn-compact">
              Elegir otra
            </button>
          ) : (
            <button type="button" onClick={cerrar} className="rk-btn rk-btn-line rk-btn-compact">
              {textoCerrar}
            </button>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={!listo || guardando}
            className="rk-btn rk-btn-primary rk-btn-compact"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
