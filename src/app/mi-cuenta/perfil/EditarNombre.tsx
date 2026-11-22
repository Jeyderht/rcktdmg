"use client";

import { useActionState } from "react";
import { guardarNombre } from "./acciones";

export default function EditarNombre({ nombre }: { nombre: string }) {
  const [mensaje, enviar, pendiente] = useActionState(guardarNombre, "");
  return (
    <form action={enviar} className="mt-5">
      <label htmlFor="nombre-perfil" className="text-xs text-ink/60">Nombre</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="nombre-perfil" name="nombre" autoComplete="name" required maxLength={100}
          defaultValue={nombre} className="rk-input min-w-0 flex-1" />
        <button className="rk-btn rk-btn-line" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar nombre"}
        </button>
      </div>
      <p role="status" className="mt-2 text-sm">{mensaje}</p>
    </form>
  );
}
