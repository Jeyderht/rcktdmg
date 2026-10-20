import { COLORES_ADMIN } from "@/lib/admin-colores";
import CifraAnimada from "@/components/admin/CifraAnimada";

/**
 * Tarjeta de anillo del Dashboard (rk-k2c + rk-k2-dona).
 *
 * Es el mismo marcado que la tarjeta «Pedidos» del admin, sacado a
 * un componente para que el panel del cliente y el del creador
 * pinten exactamente el mismo gráfico. Un círculo de
 * circunferencia 100: cada arco mide lo que su parte del total.
 */
export type ParteAnillo = { label: string; valor: number };

export default function AnilloAdmin({
  titulo,
  unidad,
  partes,
  vacio = "Sin datos",
  cargando = false,
}: {
  titulo: string;
  /** Texto bajo la cifra central: «pedidos», «recursos»… */
  unidad: string;
  partes: ParteAnillo[];
  vacio?: string;
  cargando?: boolean;
}) {
  const total = partes.reduce((s, p) => s + p.valor, 0);

  /* Con más de un tramo se deja un hueco para que las puntas
     redondas no se pisen. */
  const conValor = partes.filter((p) => p.valor > 0).length;
  const hueco = conValor > 1 ? 3 : 0;
  let acumulado = 0;

  const arcos = partes.flatMap((p, i) => {
    if (p.valor === 0 || total === 0) return [];
    const parte = (p.valor / total) * 100;
    const arco = {
      color: COLORES_ADMIN[i % COLORES_ADMIN.length],
      largo: Math.max(parte - hueco, 0.01),
      desde: acumulado + (acumulado > 0 ? hueco : 0),
    };
    acumulado += parte;
    return [arco];
  });

  const resumen =
    total === 0
      ? vacio
      : partes
          .filter((p) => p.valor > 0)
          .map((p) => `${p.valor} ${p.label.toLowerCase()}`)
          .join(", ")
          .replace(/, ([^,]*)$/, " y $1");

  return (
    <section className="rk-card rk-k2c" aria-label={titulo}>
      <div className="rk-k2-h">
        <h3>{titulo}</h3>
      </div>
      <div className="rk-k2-dona">
        <div className="rk-k2-anillo">
          <svg viewBox="0 0 36 36" width="124" height="124" role="img" aria-label={resumen}>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgb(var(--rk-foreground)/.07)" strokeWidth="3.2" />
            {arcos.map((a) => (
              <circle
                key={a.color}
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke={a.color}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${a.largo.toFixed(1)} ${(100 - a.largo).toFixed(1)}`}
                strokeDashoffset={a.desde ? (-a.desde).toFixed(1) : undefined}
                transform="rotate(-90 18 18)"
              />
            ))}
          </svg>
          <div>
            <b>
              <CifraAnimada texto={cargando ? "—" : String(total)} />
            </b>
            <span>{unidad}</span>
          </div>
        </div>
        <ul className="rk-k2-ley">
          {partes.map((p, i) => (
            <li key={p.label}>
              <i data-c={(i % COLORES_ADMIN.length) + 1} />
              {p.label}
              <b>
                <CifraAnimada texto={cargando ? "—" : String(p.valor)} />
              </b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
