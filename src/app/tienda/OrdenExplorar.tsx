"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Selector de orden de Explorar.
 *
 * Las URL de cada orden llegan ya hechas desde el servidor
 * (urlTienda conserva los filtros y vuelve a la página 1); aquí
 * solo se navega a la elegida.
 */
export default function OrdenExplorar({
  actual,
  opciones,
}: {
  actual: string;
  opciones: { valor: string; etiqueta: string; href: string }[];
}) {
  const router = useRouter();

  return (
    <label className="rk-ex-orden">
      <span className="sr-only">Ordenar por</span>

      <select
        value={actual}
        onChange={(e) => {
          const opcion = opciones.find((o) => o.valor === e.target.value);

          if (opcion) router.push(opcion.href, { scroll: false });
        }}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>

      <ChevronDown size={16} aria-hidden />
    </label>
  );
}
