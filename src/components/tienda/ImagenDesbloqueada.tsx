"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * Imagen real de un recurso solo para registrados, ya con sesión.
 *
 * La URL real solo llega aquí porque el servidor ya confirmó la
 * sesión (vista-recurso.ts): este componente no pide nada, solo
 * enseña lo que recibe. Pasa de la miniatura desenfocada a la
 * imagen nítida con una transición CSS corta (img.rk-desbloqueo,
 * --rx-t-entrada), sin saltos: las dos ocupan el mismo marco.
 *
 * Devuelve las dos imágenes como hermanas, sin envoltorio, para no
 * cambiar la estructura que el CSS de la tarjeta espera
 * (.rk-frame > img + chip). La miniatura va primero, detrás.
 *
 * Solo se carga UNA imagen completa: la miniatura es un data URI
 * de unos cientos de bytes que ya venía en la página.
 */
export default function ImagenDesbloqueada({
  miniatura,
  alt,
  className = "",
  ...props
}: ImageProps & {
  /** Data URI desenfocado; sin él, la imagen aparece sobre el fondo del marco. */
  miniatura: string | null;
}) {
  const [cargada, setCargada] = useState(false);

  return (
    <>
      {miniatura && (
        <Image
          src={miniatura}
          alt=""
          aria-hidden
          fill
          unoptimized
          className="object-cover"
        />
      )}

      <Image
        {...props}
        alt={alt}
        className={`${className} rk-desbloqueo`}
        data-cargada={cargada ? "" : undefined}
        onLoad={() => setCargada(true)}
      />
    </>
  );
}
