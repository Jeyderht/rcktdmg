"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import ElegirFoto from "@/components/cuenta/ElegirFoto";

/**
 * La foto del perfil y su botón «Cambiar foto». Al guardar refresca
 * la página para que el encabezado y el panel la muestren ya.
 */
export default function CambiarFoto({
  avatarUrl,
  nombre,
}: {
  avatarUrl: string | null;
  nombre: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [foto, setFoto] = useState(avatarUrl);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="rk-avatar-anillo relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-semibold">
        {foto ? (
          <Image src={foto} alt={`Foto de ${nombre}`} fill unoptimized sizes="80px" className="object-cover" />
        ) : (
          nombre.slice(0, 2).toUpperCase()
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{nombre}</p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rk-btn rk-btn-line rk-btn-compact mt-2"
        >
          Cambiar foto
        </button>
      </div>

      <ElegirFoto
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        alGuardar={(url) => {
          setFoto(url);
          setAbierto(false);
          router.refresh();
        }}
      />
    </div>
  );
}
