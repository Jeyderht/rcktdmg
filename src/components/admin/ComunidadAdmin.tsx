"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * Tarjeta «Comunidad» del Dashboard: usuarios y creadores en
 * dos pestañas. Lo único de cliente es qué pestaña se ve; las
 * cifras llegan del servidor (getAdminStats).
 *
 * «Nuevos por mes» pinta una barra por mes con su altura
 * relativa al mes con más altas. Sin ninguna alta en el año
 * queda solo el marco punteado.
 */

type Mes = { key: string; label: string; count: number };

export default function ComunidadAdmin({
  usuarios,
  creadores,
}: {
  usuarios: {
    total: number;
    clients: number;
    admins: number;
    newByMonth: Mes[];
  };
  creadores: {
    approved: number;
    pending: number;
    suspended: number;
    rejected: number;
  };
}) {
  const base = useId();
  const [pestana, setPestana] = useState<"u" | "c">("u");
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const pestanas = [
    { clave: "u" as const, nombre: "Usuarios" },
    { clave: "c" as const, nombre: "Creadores" },
  ];

  // Con dos pestañas, cualquier flecha (o Inicio/Fin) cambia a la otra.
  const alPulsarTecla = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const destino =
      e.key === "ArrowRight" || e.key === "ArrowLeft"
        ? 1 - i
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? 1
            : null;
    if (destino === null) return;
    e.preventDefault();
    setPestana(pestanas[destino].clave);
    botones.current[destino]?.focus();
  };

  const meses = usuarios.newByMonth;
  const maximo = Math.max(...meses.map((m) => m.count), 0);
  const resumenMeses =
    maximo === 0
      ? "Sin altas en los últimos 12 meses"
      : `Nuevos usuarios por mes: ${meses
          .map((m) => `${m.label} ${m.count}`)
          .join(", ")}`;

  return (
    <section className="rk-card rk-k2c" aria-label="Comunidad">
      <div className="rk-k2-h">
        <h3>Comunidad</h3>
        <span className="rk-k2-chip">{usuarios.total} usuarios</span>
      </div>

      <div className="rk-k2-tabs" role="tablist" aria-label="Comunidad" data-t={pestana}>
        <span className="rk-k2-ind" aria-hidden="true" />
        {pestanas.map((p, i) => (
          <button
            key={p.clave}
            ref={(el) => {
              botones.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-t${p.clave}`}
            aria-controls={`${base}-p${p.clave}`}
            aria-selected={pestana === p.clave}
            tabIndex={pestana === p.clave ? 0 : -1}
            data-t={p.clave}
            onClick={() => setPestana(p.clave)}
            onKeyDown={(e) => alPulsarTecla(e, i)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${base}-pu`}
        aria-labelledby={`${base}-tu`}
        data-p="u"
        hidden={pestana !== "u"}
      >
        <div className="rk-k2-g">
          <div className="rk-k2">
            <span className="rk-k2-e">Clientes</span>
            <b>{usuarios.clients}</b>
          </div>
          <div className="rk-k2">
            <span className="rk-k2-e">Administradores</span>
            <b>{usuarios.admins}</b>
          </div>
        </div>

        <p className="rk-k2-s">Nuevos por mes</p>

        <div className="rk-k2-graf" role="img" aria-label={resumenMeses}>
          <div className="rk-k2-zona">
            <div className="rk-k2-lin">
              <i />
              <i />
              <i />
            </div>

            {maximo > 0 && (
              <div className="rk-k2-barras">
                {meses.map((m) => (
                  <i
                    key={m.key}
                    style={{
                      height: `${(m.count / maximo) * 100}%`,
                      visibility: m.count > 0 ? "visible" : "hidden",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rk-k2-mes" aria-hidden="true">
            {meses.map((m) => (
              <span key={m.key}>{m.label.charAt(0).toUpperCase()}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${base}-pc`}
        aria-labelledby={`${base}-tc`}
        data-p="c"
        hidden={pestana !== "c"}
      >
        <div className="rk-k2-g">
          {[
            ["Aprobados", creadores.approved],
            ["Pendientes", creadores.pending],
            ["Suspendidos", creadores.suspended],
            ["Rechazados", creadores.rejected],
          ].map(([nombre, valor], i) => (
            <div key={nombre} className="rk-k2">
              <span className="rk-k2-e">
                <i data-c={i + 1} />
                {nombre}
              </span>
              <b>{valor}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
