"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { IngresoMes } from "@/lib/admin-stats";
import Odometro from "@/components/admin/Odometro";

/**
 * Ingresos del Dashboard (rk-ing).
 *
 * Tres vistas —General (bruto), Comisión y Creadores— sobre los
 * 6 meses que terminan en el mes elegido con el calendario (rk-cal).
 * Arriba, la cifra del mes con su variación frente al anterior y
 * el total del año hasta ese mes; abajo, el gráfico de línea con
 * un punto por serie, la burbuja con las tres cifras y la fila
 * de meses.
 *
 * Todas las cifras salen de ingresosPorMes() (órdenes pagadas).
 * Un mes sin ventas vale 0.
 */

const NOM = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
const NOML = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

/*
  Colores de las series: tokens --rk-serie-N de globals.css (§0 PALETA),
  los mismos que el resto del panel. «suave» es el punto de la serie no
  activa: el mismo color al 55 % (antes, el hex con «8c»).
*/
const serie = (n: number) => ({ c: `rgb(var(--rk-serie-${n}))`, suave: `rgb(var(--rk-serie-${n}) / 0.549)` });

const SERIES = [
  { n: "General", ...serie(1) },
  { n: "Comisión", ...serie(3) },
  { n: "Creadores", ...serie(4) },
];

const W = 300;
const soles = (x: number) => `S/ ${x.toFixed(2)}`;
const clave = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;

export default function BalanceAdmin({
  datos,
  etiquetas,
}: {
  datos: Record<string, IngresoMes>;
  /**
   * Nombres de las tres series, si no son los del admin. El panel
   * del creador las llama «Ventas / Comisión / Para ti»: ahí
   * «Creadores» es solo su parte.
   */
  etiquetas?: readonly [string, string, string];
}) {
  const series = etiquetas
    ? SERIES.map((s, i) => ({ ...s, n: etiquetas[i] }))
    : SERIES;

  /* Mes de referencia: el actual al cargar (en el reloj del navegador). */
  const [hoy] = useState(() => new Date());
  const [ref, setRef] = useState({ a: hoy.getFullYear(), m: hoy.getMonth() });
  const [vista, setVista] = useState(1);
  const [mes, setMes] = useState(5);
  const [vis, setVis] = useState(5);
  const [vivo, setVivo] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [abiertaCaja, setAbiertaCaja] = useState<number | null>(null);
  const [movil, setMovil] = useState(false);

  const [cal, setCal] = useState(false);
  const [anoVista, setAnoVista] = useState(ref.a);
  const [isla, setIsla] = useState(false);
  const [anchoIsla, setAnchoIsla] = useState<{ c: number; a: number } | null>(null);
  const [indicador, setIndicador] = useState<{ left: number; width: number } | null>(null);

  const grafica = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const islaEl = useRef<HTMLDivElement>(null);
  const islaBtn = useRef<HTMLButtonElement>(null);
  const opsEl = useRef<HTMLDivElement>(null);
  const calEl = useRef<HTMLDivElement>(null);
  const fechaBtn = useRef<HTMLButtonElement>(null);

  /* ── Datos de los 6 meses ─────────────────────────────── */
  const meses = useMemo(() => {
    const lista = [];
    for (let k = 5; k >= 0; k--) {
      const f = new Date(ref.a, ref.m - k, 1);
      lista.push({ clave: clave(f.getFullYear(), f.getMonth()), nom: NOM[f.getMonth()] });
    }
    return lista;
  }, [ref]);
  const n = meses.length;
  const valores = series.map((_, i) => meses.map((x) => datos[x.clave]?.[i] ?? 0));
  const totalAno = (i: number) => {
    let t = 0;
    for (let mm = 0; mm <= ref.m; mm++) t += datos[clave(ref.a, mm)]?.[i] ?? 0;
    return t;
  };

  /* ── Geometría del gráfico (más bajo en móvil) ────────── */
  const H = movil ? 112 : 170;
  const tope = movil ? 22 : 84;
  const base = H - 40;
  const max = Math.max(...valores.flat()) || 1;
  const pts = valores.map((v) => v.map((x, i) => [((i + 0.5) * W) / n, base - (x / max) * (base - tope)]));
  const trazo = (P: number[][]) => {
    let d = `M0,${P[0][1]} L${P[0][0]},${P[0][1]}`;
    for (let i = 1; i < n; i++) {
      const a = P[i - 1];
      const b = P[i];
      const mx = (a[0] + b[0]) / 2;
      d += ` C${mx},${a[1]} ${mx},${b[1]} ${b[0]},${b[1]}`;
    }
    return `${d} L${W},${P[n - 1][1]}`;
  };

  useEffect(() => {
    setMovil(window.matchMedia("(pointer:coarse),(max-width:640px)").matches);
  }, []);

  /* ── Isla de pestañas e indicador ─────────────────────── */
  const medirIsla = useCallback(() => {
    if (!islaBtn.current || !opsEl.current) return;
    setAnchoIsla({
      c: Math.ceil(islaBtn.current.getBoundingClientRect().width) + 28,
      a: Math.ceil(opsEl.current.getBoundingClientRect().width) + 20,
    });
  }, []);
  const ubicar = useCallback(() => {
    const t = tabs.current[vista];
    if (t) setIndicador({ left: t.offsetLeft, width: t.offsetWidth });
  }, [vista]);

  useLayoutEffect(() => {
    medirIsla();
    ubicar();
  }, [vista, medirIsla, ubicar]);

  useEffect(() => {
    const todo = () => {
      medirIsla();
      ubicar();
    };
    window.addEventListener("resize", todo);
    document.fonts?.ready.then(todo);
    return () => window.removeEventListener("resize", todo);
  }, [medirIsla, ubicar]);

  /* Cerrar isla y calendario al tocar fuera o con Escape. */
  useEffect(() => {
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (isla && islaEl.current && !islaEl.current.contains(t)) setIsla(false);
      if (cal && calEl.current && !calEl.current.contains(t) && !fechaBtn.current?.contains(t)) setCal(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cal) {
        setCal(false);
        fechaBtn.current?.focus();
      } else if (isla) {
        setIsla(false);
        islaBtn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [isla, cal]);

  /* Al abrir el calendario, el foco va al mes elegido. */
  useEffect(() => {
    if (!cal) return;
    const dialogo = calEl.current;
    (
      dialogo?.querySelector<HTMLButtonElement>('.rk-cal-mes[aria-pressed="true"]') ??
      dialogo?.querySelector<HTMLButtonElement>(".rk-cal-mes:not(:disabled)")
    )?.focus();
  }, [cal, anoVista]);

  /* ── Gráfico: el puntero elige mes ────────────────────── */
  const indice = (e: ReactPointerEvent) => {
    const r = grafica.current!.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
  };
  const soltarRef = useRef(0);
  const suelta = () => {
    setVivo(false);
    setVis(mes);
  };

  const recargar = (a: number, m: number) => {
    setRef({ a, m });
    setMes(5);
    setVis(5);
    setCal(false);
  };
  const esFuturo = (a: number, m: number) =>
    a > hoy.getFullYear() || (a === hoy.getFullYear() && m > hoy.getMonth());

  /* Variación del mes frente al anterior, en la vista activa. */
  const v = valores[vista];
  const actualV = v[n - 1];
  const anteriorV = v[n - 2];
  const sube = actualV > anteriorV;

  const x = (pts[0][vis][0] / W) * 100;

  return (
    <section className="rk-ing" aria-label="Ingresos">
      <header className="rk-ing-cabeza">
        <h2 className="rk-ing-saludo rk-title">Ingresos</h2>
        <div className="rk-ing-fecha-caja">
          <button
            ref={fechaBtn}
            className="rk-ing-fecha-btn"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={cal}
            aria-controls="ingCal"
            onClick={() => {
              setAnoVista(ref.a);
              setCal((c) => !c);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="3" />
              <path d="M8 3v4M16 3v4M4 10h16" />
            </svg>
            <span>
              {NOML[ref.m]} {ref.a}
            </span>
          </button>

          <div ref={calEl} className="rk-ing-cal" id="ingCal" role="dialog" aria-label="Elegir mes" hidden={!cal}>
            <div className="rk-cal-cab">
              <button className="rk-cal-nav" type="button" aria-label="Año anterior" onClick={() => setAnoVista((a) => a - 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <span className="rk-cal-ano">{anoVista}</span>
              <button
                className="rk-cal-nav"
                type="button"
                aria-label="Año siguiente"
                disabled={anoVista >= hoy.getFullYear()}
                onClick={() => setAnoVista((a) => a + 1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="rk-cal-grid">
              {NOM.map((nm, m) => (
                <button
                  key={nm}
                  className="rk-cal-mes"
                  type="button"
                  aria-pressed={anoVista === ref.a && m === ref.m}
                  data-hoy={anoVista === hoy.getFullYear() && m === hoy.getMonth() ? "true" : undefined}
                  disabled={esFuturo(anoVista, m)}
                  onClick={() => {
                    recargar(anoVista, m);
                    fechaBtn.current?.focus();
                  }}
                >
                  {nm}
                </button>
              ))}
            </div>
            <button
              className="rk-cal-hoy"
              type="button"
              onClick={() => {
                recargar(hoy.getFullYear(), hoy.getMonth());
                fechaBtn.current?.focus();
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      </header>

      <div className="rk-ing-panel">
        <div
          ref={islaEl}
          className="rk-ing-isla"
          data-abierta={isla}
          style={anchoIsla ? { width: `${isla ? anchoIsla.a : anchoIsla.c}px` } : undefined}
        >
          <button
            ref={islaBtn}
            className="rk-ing-isla-act"
            type="button"
            aria-expanded={isla}
            aria-controls="ingTabs"
            aria-label="Cambiar vista de ingresos"
            onClick={() => setIsla(true)}
          >
            <span>{series[vista].n}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={isla ? { transform: "rotate(180deg)" } : undefined}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div ref={opsEl} className="rk-ing-tabs" id="ingTabs" role="tablist" aria-label="Vista de ingresos">
            <span
              className="rk-ing-ind"
              aria-hidden="true"
              style={indicador ? { left: `${indicador.left}px`, width: `${indicador.width}px` } : undefined}
            />
            {series.map((s, k) => (
              <button
                key={s.n}
                ref={(el) => {
                  tabs.current[k] = el;
                }}
                className="rk-ing-tab"
                role="tab"
                type="button"
                aria-selected={vista === k}
                onClick={() => {
                  setVista(k);
                  setMes(n - 1);
                  setVis(n - 1);
                  setIsla(false);
                }}
              >
                {s.n}
              </button>
            ))}
          </div>
        </div>

        <div className="rk-ing-info">
          <div style={{ minWidth: 0 }}>
            <h3>{series[vista].n}</h3>
            <p className="rk-ing-desc rk-muted">
              <span>{meses[n - 1].nom}</span>
              <span className="rk-ing-sep" aria-hidden="true">
                ·
              </span>
              <b>
                <Odometro texto={soles(actualV)} />
              </b>
              {actualV !== anteriorV && (
                <span
                  className="rk-ing-tend"
                  data-t={sube ? "sube" : "baja"}
                  role="img"
                  aria-label={`${sube ? "Sube" : "Baja"} respecto a ${meses[n - 2].nom}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {sube ? (
                      <>
                        <path d="M7 17 17 7" />
                        <path d="M9 7h8v8" />
                      </>
                    ) : (
                      <>
                        <path d="M7 7l10 10" />
                        <path d="M17 9v8H9" />
                      </>
                    )}
                  </svg>
                </span>
              )}
            </p>
          </div>
          <div className="rk-ing-total">
            <p className="rk-ing-monto">
              <Odometro texto={soles(totalAno(vista))} />
            </p>
            <p className="rk-ing-etq rk-muted">Este año</p>
          </div>
        </div>

        <div className="rk-ing-lienzo">
          <div
            ref={grafica}
            className="rk-ing-grafica"
            style={{ height: `${H}px` }}
            onPointerMove={(e) => {
              setVivo(true);
              setVis(indice(e));
            }}
            onPointerDown={(e) => {
              if (e.pointerType !== "mouse") {
                setAbiertaCaja(null);
                setOculta(false);
              }
              const i = indice(e);
              setMes(i);
              setVis(i);
              setVivo(true);
            }}
            onPointerLeave={suelta}
            onPointerUp={(e) => {
              if (e.pointerType !== "mouse") {
                window.clearTimeout(soltarRef.current);
                soltarRef.current = window.setTimeout(suelta, 600);
              }
            }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                {series.map((s, k) => (
                  <linearGradient key={s.n} id={`rk-ing-r${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s.c} stopOpacity={k === 0 ? ".42" : ".45"} />
                    <stop offset="1" stopColor={s.c} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {series.map((s, k) => (
                <path
                  key={`a${k}`}
                  className="rk-ing-area"
                  data-s={k}
                  data-activa={k === vista}
                  fill={`url(#rk-ing-r${k})`}
                  d={`${trazo(pts[k])} L${W},${H} L0,${H} Z`}
                />
              ))}
              {series.map((s, k) => (
                <path key={`l${k}`} className="rk-ing-linea" data-s={k} data-activa={k === vista} stroke={s.c} d={trazo(pts[k])} />
              ))}
            </svg>

            {series.map((s, k) => (
              <span
                key={s.n}
                className="rk-ing-punto"
                data-abierta={abiertaCaja === k ? "true" : undefined}
                style={{
                  ["--c" as string]: s.c,
                  left: `${x}%`,
                  top: `${(pts[k][vis][1] / H) * 100}%`,
                  background: k === vista ? s.c : s.suave,
                }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setOculta(true)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setOculta(false)}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse") return;
                  e.stopPropagation();
                  const abre = abiertaCaja !== k;
                  setAbiertaCaja(abre ? k : null);
                  setOculta(abre);
                }}
              >
                <span className="rk-ing-caja">
                  <Odometro texto={soles(valores[k][vis])} />
                </span>
              </span>
            ))}

            <span
              className="rk-ing-burbuja"
              data-vivo={vivo}
              data-oculta={oculta}
              style={{ left: `${Math.min(Math.max(x, 28), 70)}%` }}
            >
              {series.map((s, k) => (
                <p key={s.n} data-activa={k === vista}>
                  <i style={{ ["--c" as string]: s.c }} />
                  {s.n}
                  <b>
                    <Odometro texto={soles(valores[k][vis])} />
                  </b>
                </p>
              ))}
            </span>
          </div>

          <div className="rk-ing-meses">
            {meses.map((m, i) => (
              <button
                key={m.clave}
                type="button"
                className="rk-ing-mes"
                aria-pressed={i === vis}
                onClick={() => {
                  setMes(i);
                  setVis(i);
                }}
              >
                {m.nom}
              </button>
            ))}
          </div>
        </div>

        <div className="rk-ing-leyenda" aria-live="polite">
          {series.map((s, k) => (
            <div key={s.n} className="rk-ing-ley" data-activa={k === vista}>
              <span>
                <i style={{ ["--c" as string]: s.c }} />
                {s.n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
