import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Lista del Dashboard (rk-k3): icono circular, título,
 * subtítulo y un valor a la derecha.
 *
 * Sin filas pinta el estado vacío del encargo: tres filas de
 * esqueleto con «—» y la nota «Aún no hay datos».
 */

export type FilaAdmin = {
  id: string;
  titulo: string;
  subtitulo: string;
  valor: string;
  href?: string;
};

/* Iconos de cada lista, los del marcado aprobado. */
const ICONOS: Record<"recurso" | "creador" | "venta" | "actividad", ReactNode> = {
  recurso: (
    <path d="m7.5 4.27 9 5.15M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8zM3.3 7 12 12l8.7-5M12 22V12" />
  ),
  creador: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  venta: (
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
  ),
  actividad: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
};

/* Anchos de los esqueletos del estado vacío, como en el encargo. */
const ESQUELETOS = ["62%", "54%", "46%"];

export default function ListaAdmin({
  titulo,
  icono,
  filas,
}: {
  titulo: string;
  icono: keyof typeof ICONOS;
  filas: FilaAdmin[];
}) {
  const avatar = (
    <span className="rk-k3-av">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONOS[icono]}
      </svg>
    </span>
  );

  return (
    <section className="rk-card rk-k2c" aria-label={titulo}>
      <div className="rk-k2-h">
        <h3>{titulo}</h3>
      </div>

      {filas.length === 0 ? (
        <>
          <ul className="rk-k3-l">
            {ESQUELETOS.map((ancho) => (
              <li key={ancho} className="rk-k3">
                {avatar}
                <span className="rk-k3-t" aria-hidden="true">
                  <i className="rk-k3-sk" style={{ width: ancho }} />
                  <i className="rk-k3-sk rk-k3-sk2" style={{ width: "34%" }} />
                </span>
                <b>—</b>
              </li>
            ))}
          </ul>
          <p className="rk-k3-nota">Aún no hay datos</p>
        </>
      ) : (
        <ul className="rk-k3-l">
          {filas.map((fila) => (
            <li key={fila.id} className="rk-k3">
              {avatar}
              <span className="rk-k3-t">
                {fila.href ? (
                  <Link href={fila.href} className="rk-k3-tit">
                    {fila.titulo}
                  </Link>
                ) : (
                  <span className="rk-k3-tit">{fila.titulo}</span>
                )}
                <span className="rk-k3-sub">{fila.subtitulo}</span>
              </span>
              <b>{fila.valor}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
