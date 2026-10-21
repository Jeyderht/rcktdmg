/**
 * Tarjeta KPI de los inicios (rk-cx-k): rótulo, valor con cifras
 * tabulares y una línea de contexto. El mini-gráfico solo se pinta
 * si llega una serie real (al menos dos puntos); sin serie, nada.
 */
export default function KpiCx({
  rotulo,
  valor,
  contexto,
  chip,
  serie,
}: {
  rotulo: string;
  valor: string;
  contexto: string;
  /** Cifra destacada antes del contexto (variación, %, recuento). */
  chip?: string;
  serie?: number[] | null;
}) {
  return (
    <div className="rk-cx-k">
      <span>{rotulo}</span>
      <b>{valor}</b>
      <em>
        {chip && <i>{chip}</i>}
        {contexto}
      </em>
      {serie && serie.length > 1 && <MiniGrafico serie={serie} />}
    </div>
  );
}

function MiniGrafico({ serie }: { serie: number[] }) {
  const W = 84;
  const H = 30;
  const max = Math.max(...serie, 1);
  const paso = W / (serie.length - 1);
  const pts = serie.map((v, i) => [i * paso, H - 3 - (v / max) * (H - 6)] as const);
  const linea = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path className="a" d={`${linea} L${W} ${H} L0 ${H} Z`} />
      <path className="l" d={linea} />
      <circle cx={ux} cy={uy} r="2.6" />
    </svg>
  );
}
