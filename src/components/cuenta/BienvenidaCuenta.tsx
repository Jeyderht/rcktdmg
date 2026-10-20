"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Clave de «recién registrado». La pone /registro al crear la
 * cuenta y la quita este aviso al cerrarlo, así que solo lo ve
 * quien acaba de darse de alta, y una sola vez.
 */
export const CLAVE_BIENVENIDA = "rcktdmg-bienvenida";

/**
 * Saludo de primera vez en /mi-cuenta. Descartable; sin
 * almacenamiento disponible (modo privado, bloqueado) no sale.
 */
export default function BienvenidaCuenta({ nombre }: { nombre: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(CLAVE_BIENVENIDA) === "1");
    } catch {}
  }, []);

  if (!visible) return null;

  function cerrar() {
    setVisible(false);

    try {
      localStorage.removeItem(CLAVE_BIENVENIDA);
    } catch {}
  }

  return (
    <section
      className="rk-card rk-fade-up relative mt-4 p-4 pr-14 sm:p-5 sm:pr-16"
      aria-label="Bienvenida"
    >
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar la bienvenida"
        className="rk-press absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-ink/60 hover:text-ink"
      >
        <X size={18} aria-hidden />
      </button>

      <p className="text-[15px] font-semibold">
        Te damos la bienvenida a RcktX{nombre ? `, ${nombre}` : ""}
      </p>

      <p className="mt-1.5 text-[13px] leading-6 text-ink/65">
        Tu cuenta ya está lista. En este menú tendrás tus compras,
        descargas y licencias en cuanto compres tu primer recurso.
      </p>

      <Link href="/tienda" className="rk-btn rk-btn-ink rk-btn-compact mt-3">
        Explorar recursos
      </Link>
    </section>
  );
}
