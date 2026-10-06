"use client";

import { useState } from "react";

/**
 * Tarjetas de planes con el interruptor Mensual / Anual.
 *
 * Recibe los planes ya convertidos a números desde la página
 * (servidor). Solo muestra precios reales: el ahorro anual se
 * calcula con esos mismos datos y no aparece si no lo hay.
 */
export type PlanVista = {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  downloadLimit: number | null;
};

type Periodo = "mensual" | "anual";

export default function PlanesLista({ plans }: { plans: PlanVista[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("mensual");

  // Mayor ahorro real entre los planes de pago (para el aviso).
  const ahorroMaximo = plans.reduce((max, plan) => {
    const anualSiMensual = plan.monthlyPrice * 12;

    if (anualSiMensual <= 0 || plan.yearlyPrice <= 0) return max;

    const ahorro = Math.round((1 - plan.yearlyPrice / anualSiMensual) * 100);

    return Math.max(max, ahorro);
  }, 0);

  return (
    <>
      {/* INTERRUPTOR */}
      <div className="mt-10 flex flex-col items-center gap-2">
        <div className="rk-segment" role="group" aria-label="Periodo de pago">
          <button
            type="button"
            className="rk-segment-option"
            aria-pressed={periodo === "mensual"}
            onClick={() => setPeriodo("mensual")}
          >
            Mensual
          </button>

          <button
            type="button"
            className="rk-segment-option"
            aria-pressed={periodo === "anual"}
            onClick={() => setPeriodo("anual")}
          >
            Anual
          </button>
        </div>

        {ahorroMaximo > 0 && (
          <p className="text-xs text-ink/60">
            Ahorra hasta {ahorroMaximo}% pagando al año
          </p>
        )}
      </div>

      <div className="rk-plans rk-fade-up rk-enter-1 mt-8">
        {plans.map((plan, index) => {
          const featured =
            plans.length > 1 && index === Math.floor(plans.length / 2);

          const anual = periodo === "anual";
          const precio = anual ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <article
              key={plan.id}
              className={`rk-plan${featured ? " rk-plan-featured" : ""}`}
            >
              <header className="rk-plan-head">
                <h2 className="rk-plan-name">{plan.name}</h2>
              </header>

              <div className="rk-plan-body">
                <p className="rk-plan-desc">{plan.description ?? ""}</p>

                <div className="rk-plan-pricebox">
                  <p className="rk-plan-price" aria-live="polite">
                    <span className="rk-plan-cur">S/</span>
                    {precio.toFixed(0)}
                    <span className="rk-plan-per">
                      PEN /<br />
                      {anual ? "año" : "mes"}
                    </span>
                  </p>

                  <button
                    type="button"
                    disabled
                    title="Las suscripciones estarán disponibles próximamente"
                    className={`rk-btn rk-btn-block ${
                      featured ? "rk-btn-primary" : "rk-btn-ink"
                    }`}
                  >
                    Próximamente
                  </button>
                </div>

                <ul className="rk-plan-features">
                  <li>
                    {anual
                      ? `Equivale a S/ ${(plan.yearlyPrice / 12).toFixed(0)} al mes`
                      : `S/ ${plan.yearlyPrice.toFixed(0)} si pagas al año`}
                  </li>

                  {plan.downloadLimit !== null ? (
                    <li>Hasta {plan.downloadLimit} descargas al mes</li>
                  ) : (
                    <li>Descargas ilimitadas</li>
                  )}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
