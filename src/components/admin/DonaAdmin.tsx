"use client";

import { useState } from "react";

export type TramoDona = { label: string; valor: number };

const COLORES = ["#9d97ff", "#c9a2c9", "#f0a98a", "#c8c9d6", "#8e8ad8"];

/**
 * Dona con pestañas tipo carpeta: «Pedidos» y «Recursos» por
 * estado. Cifras reales; el total va al centro.
 */
export default function DonaAdmin({
  pedidos,
  recursos,
}: {
  pedidos: TramoDona[];
  recursos: TramoDona[];
}) {
  const [pestana, setPestana] = useState<"pedidos" | "recursos">("pedidos");
  const tramos = pestana === "pedidos" ? pedidos : recursos;
  const total = tramos.reduce((s, t) => s + t.valor, 0);

  // Dona en SVG: cada tramo es un arco del mismo círculo.
  const r = 52;
  const circ = 2 * Math.PI * r;
  const hueco = total > 0 && tramos.filter((t) => t.valor > 0).length > 1 ? 6 : 0;
  let acumulado = 0;

  return (
    <section className="rk-adm-dona">
      <div role="tablist" aria-label="Datos" className="rk-adm-carpeta">
        {(["pedidos", "recursos"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={pestana === p}
            className="rk-adm-carpeta-pestana"
            onClick={() => setPestana(p)}
          >
            {p === "pedidos" ? "Pedidos" : "Recursos"}
            <span className="rk-adm-carpeta-num">
              {(p === "pedidos" ? pedidos : recursos).reduce(
                (s, t) => s + t.valor,
                0
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="rk-card rk-adm-dona-cuerpo">
        <div className="rk-adm-dona-fila">
          <div className="rk-adm-dona-grafico">
            <svg viewBox="0 0 140 140" aria-hidden>
              <circle
                cx="70"
                cy="70"
                r={r}
                className="rk-adm-dona-fondo"
              />
              {total > 0 &&
                tramos.map((t, i) => {
                  if (t.valor === 0) return null;
                  const largo = (t.valor / total) * circ;
                  const tramo = (
                    <circle
                      key={t.label}
                      cx="70"
                      cy="70"
                      r={r}
                      fill="none"
                      stroke={COLORES[i % COLORES.length]}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(largo - hueco, 0.01)} ${circ}`}
                      strokeDashoffset={-acumulado}
                      transform="rotate(-90 70 70)"
                    />
                  );
                  acumulado += largo;
                  return tramo;
                })}
            </svg>
            <div className="rk-adm-dona-centro">
              <span>Total</span>
              <b>{total}</b>
            </div>
          </div>

          <ul className="rk-adm-dona-leyenda">
            {tramos.map((t, i) => (
              <li key={t.label}>
                <i style={{ background: COLORES[i % COLORES.length] }} />
                <span>{t.label}</span>
                <b>{t.valor}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
