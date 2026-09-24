"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import PreviewProtegido from "@/components/PreviewProtegido";
import VisorStory, { type ImagenStory } from "./VisorStory";

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  createdAt: Date | string;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

type ProductGalleryProps = {
  name: string;
  coverUrl: string | null;
  coverWidth?: number | null;
  coverHeight?: number | null;
  previewUrl: string | null;
  images: ProductImage[];
  /** Datos para el modo story. Sin ellos el botón no aparece. */
  story?: {
    id: string;
    slug: string;
    price: number;
    creador: {
      nombre: string;
      username: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
    };
  };
};

/**
 * Galería del recurso.
 *
 * El contenido visual es vertical 9:16 (1080 × 1920).
 * La imagen se muestra SIEMPRE nítida; el desenfoque se
 * aplica únicamente a los controles de vidrio que flotan
 * encima de ella.
 */
export default function ProductGallery({
  name,
  coverUrl,
  coverWidth,
  coverHeight,
  previewUrl,
  images: additionalImages,
  story,
}: ProductGalleryProps) {
  /*
    Cada imagen viaja con su tamaño real cuando se conoce. Sin
    él se sigue recortando al marco, como antes: no se inventa
    una proporción.
  */
  const images = [
    coverUrl
      ? {
          key: "cover",
          url: coverUrl,
          label: "Portada",
          ancho: coverWidth ?? null,
          alto: coverHeight ?? null,
        }
      : null,

    previewUrl
      ? {
          key: "preview",
          url: previewUrl,
          label: "Preview",
          ancho: null,
          alto: null,
        }
      : null,

    ...additionalImages.map((image, index) => ({
      key: image.id,
      url: image.url,
      label: image.alt?.trim() || `Imagen ${index + 1}`,
      ancho: image.imageWidth ?? null,
      alto: image.imageHeight ?? null,
    })),
  ].filter(Boolean) as ImagenStory[];

  const [storyAbierta, setStoryAbierta] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const total = images.length;

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;

      setSelectedIndex(((index % total) + total) % total);
    },
    [total]
  );

  /*
    Navegación con teclado entre imágenes.

    Se APAGA mientras el modo story está abierto. Los dos
    componentes escuchaban las flechas en `window`, así que con
    la story abierta una flecha movía la galería de debajo —que
    ni siquiera se ve— en lugar de la story. Mientras hay un
    diálogo a pantalla completa, el teclado es suyo.
  */
  useEffect(() => {
    if (total < 2 || storyAbierta) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setSelectedIndex((i) => ((i - 1 + total) % total));
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((i) => (i + 1) % total);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total, storyAbierta]);

  if (total === 0) {
    return (
      <div className="rk-card mx-auto w-full max-w-[16rem] overflow-hidden rounded-rk-xl p-2 sm:max-w-sm lg:max-w-none">
        <div className="rk-media rk-aspect-product flex w-full items-center justify-center rounded-rk-lg">
          <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
            RCKTDMG
          </span>
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] || images[0];

  return (
    <div className="w-full min-w-0">

      {/* IMAGEN PRINCIPAL 9:16 */}
      <div className="rk-card mx-auto w-full max-w-[16rem] overflow-hidden rounded-rk-xl p-2 sm:max-w-sm lg:max-w-none">
        <div className="rk-media rk-aspect-product relative overflow-hidden rounded-rk-lg">
          {/*
            Con dimensiones conocidas la imagen se enseña
            ENTERA, con su forma. Sin ellas se recorta al
            marco, que es el comportamiento de siempre. En
            ningún caso se estira.
          */}
          <PreviewProtegido
            key={selectedImage.key}
            src={selectedImage.url}
            alt={`${selectedImage.label} de ${name}`}
            contener={Boolean(selectedImage.ancho && selectedImage.alto)}
            priority
            sizes="(max-width: 1024px) 90vw, 45vw"
            className="animate-scale-in"
          />

          {/* CONTROLES: vidrio sobre imagen nítida */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(selectedIndex - 1)}
                aria-label="Imagen anterior"
                className="rk-press rk-glass-on-image absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => goTo(selectedIndex + 1)}
                aria-label="Imagen siguiente"
                className="rk-press rk-glass-on-image absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <ChevronRight size={18} />
              </button>

              {/* CONTADOR */}
              <span className="rk-glass-on-image absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] font-medium tabular-nums">
                {selectedIndex + 1} / {total}
              </span>
            </>
          )}

          {/* ETIQUETA DE LA IMAGEN */}
          <span className="rk-glass-on-image absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-medium">
            {selectedImage.label}
          </span>
        </div>
      </div>

      {/*
        VER COMO STORY

        A pantalla completa, sin el resto de la página. Se
        ofrece en todos los tamaños, pero en móvil ocupa el
        ancho completo porque es donde más se usa.
      */}
      {story && (
        <button
          type="button"
          onClick={() => setStoryAbierta(true)}
          className="rk-btn rk-btn-line mx-auto mt-3 flex w-full max-w-[16rem] sm:max-w-sm lg:max-w-none"
        >
          <Maximize2 size={15} aria-hidden />
          Ver como Story
        </button>
      )}

      {/*
        MINIATURAS

        Solo a partir de 768px. En móvil la tira robaba altura
        a la imagen para repetir lo que ya hacen las flechas y
        el contador, así que desaparece por completo: no queda
        hueco, porque el bloque entero no se pinta.
      */}
      {total > 1 && (
        <div
          role="tablist"
          aria-label="Imágenes del recurso"
          className="mx-auto mt-3 hidden max-w-[16rem] gap-2.5 overflow-x-auto pb-1 sm:max-w-sm md:flex lg:max-w-none"
        >
          {images.map((image, index) => {
            const active = index === selectedIndex;

            return (
              <button
                key={image.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Ver ${image.label}`}
                onClick={() => setSelectedIndex(index)}
                className={`rk-press rk-media rk-aspect-product relative w-16 shrink-0 overflow-hidden rounded-rk-sm transition-all duration-normal ease-rk sm:w-20 ${
                  active
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-transparent"
                    : "opacity-55 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.label}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}

      {story && (
        <VisorStory
          abierto={storyAbierta}
          alCerrar={() => setStoryAbierta(false)}
          imagenes={images}
          producto={{ ...story, name }}
        />
      )}
    </div>
  );
}
