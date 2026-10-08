"use client";

import { useState } from "react";

type Mes = {
  key: string;
  label: string;
  gross: number;
  platformFee: number;
  creatorAmount: number;
};

type Vista = "general" | "comision" | "creadores";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "general", label: "General" },
  { id: "comision", label: "Comisión" },
  { id: "creadores", label: "Creadores" },
];

/* Series del gráfico: bruto, comisión y creadores, con los colores
   de marca (frío, cálido y perla). */
const SERIES = [
  { id: "gross", label: "Bruto", clase: "is-bruto" },
  { id: "platformFee", label: "Comisión", clase: "is-comision" },
  { id: "creatorAmount", label: "Creadores", clase: "is-creadores" },
] as const;

function soles(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(valor);
}

function corto(valor: number) {
  if (valor >= 1000) return `${(valor / 1000).toFixed(1)}k`;
  return valor.toFixed(0);
}

/**
 * Tarjeta «Ingresos» del dashboard admin: orbe de marca arriba,
 * pestañas General / Comisión / Creadores y, en un vidrio, la cifra
 * del mes con barras de los últimos 6 meses. Todo son datos reales
 * de pedidos pagados (getAdminStats).
 */
export default function BalanceAdmin({
  meses,
  hoy,
  anio,
}: {
  meses: Mes[];
  hoy: number;
  anio: number;
}) {
  const [vista, setVista] = useState<Vista>("general");

  const ultimos = meses.slice(-6);
  const actual = ultimos[ultimos.length - 1];

  const series =
    vista === "general"
      ? SERIES
      : SERIES.filter((s) =>
          vista === "comision"
            ? s.id === "platformFee"
            : s.id === "creatorAmount"
        );

  const maximo = Math.max(
    ...ultimos.flatMap((m) => series.map((s) => m[s.id])),
    0
  );

  const titulo =
    vista === "general"
      ? "Ingresos de"
      : vista === "comision"
        ? "Comisión de"
        : "Para creadores en";

  const cifra =
    vista === "general"
      ? actual?.gross ?? 0
      : vista === "comision"
        ? actual?.platformFee ?? 0
        : actual?.creatorAmount ?? 0;

  return (
    <section className="rk-card rk-adm-balance">
      <div className="rk-adm-balance-cabeza">
        <h2 className="rk-adm-card-titulo">Ingresos</h2>
      </div>

      {/* Orbe de marca: anillo iridiscente que gira despacio */}
      <div aria-hidden className="rk-adm-orbe">
        <span className="rk-adm-orbe-anillo" />
        <span className="rk-adm-orbe-brillo" />
      </div>

      <div role="tablist" aria-label="Vista" className="rk-adm-pestanas">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            className="rk-adm-pestana"
            onClick={() => setVista(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="rk-adm-vidrio">
        <p className="rk-adm-mini-etiqueta">
          {titulo} <span className="capitalize">{actual?.label.replace(".", "")}</span>
        </p>
        <p className="rk-adm-cifra">{soles(cifra)}</p>

        <dl className="rk-adm-dos">
          <div>
            <dt>Hoy</dt>
            <dd>{soles(hoy)}</dd>
          </div>
          <div>
            <dt>Este año</dt>
            <dd>{soles(anio)}</dd>
          </div>
        </dl>

        {maximo === 0 ? (
          <p className="rk-adm-vacio">Todavía no hay ventas en estos meses.</p>
        ) : (
          <div className="rk-adm-barras" aria-hidden>
            {ultimos.map((m) => (
              <div key={m.key} className="rk-adm-barras-mes">
                <div className="rk-adm-barras-grupo">
                  {series.map((s) => (
                    <span
                      key={s.id}
                      className={`rk-adm-barra ${s.clase}`}
                      style={{
                        height: `${
                          m[s.id] > 0
                            ? Math.max((m[s.id] / maximo) * 100, 4)
                            : 0
                        }%`,
                      }}
                      title={`${m.label} · ${s.label}: ${corto(m[s.id])}`}
                    />
                  ))}
                </div>
                <span className="rk-adm-barras-label">
                  {m.label.replace(".", "")}
                </span>
              </div>
            ))}
          </div>
        )}

        <ul className="rk-adm-leyenda">
          {series.map((s) => (
            <li key={s.id}>
              <i className={`rk-adm-barra ${s.clase}`} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
