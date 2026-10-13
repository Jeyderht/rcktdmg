"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Menú del administrador (rk-mn): barra con «Admin Center», el
 * tema y «Abrir menú», y un panel lateral con las secciones en
 * un arco que se desliza.
 *
 * El arco se mueve con la rueda, arrastrando, con las flechas
 * (Inicio/Fin) o tocando un elemento; con un muelle lo centra.
 * Al elegir, el panel se cierra y se navega a la ruta real. Se
 * abre también deslizando desde el borde izquierdo y se cierra
 * con Escape, el velo o la ×.
 *
 * Las posiciones del arco se escriben directamente en el estilo
 * de cada fila (60 veces por segundo): React solo pinta la
 * estructura una vez.
 */

export type ItemMenuAdmin = {
  label: string;
  href: string;
  /** Contenido del <svg> 24×24 del icono (constante, no del usuario). */
  icono: string;
  exacto?: boolean;
  /** La ruta es una vista filtrada: se enciende solo con esta consulta. */
  consulta?: { ruta: string; query: string };
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Índice de la sección que corresponde a la URL actual. */
function seccionActual(items: ItemMenuAdmin[], ruta: string, query: string) {
  const conConsulta = items.findIndex(
    (it) =>
      it.consulta &&
      it.consulta.ruta === ruta &&
      new URLSearchParams(query).toString().includes(it.consulta.query)
  );
  if (conConsulta >= 0) return conConsulta;

  let mejor = -1;
  let largo = -1;
  items.forEach((it, i) => {
    if (it.consulta) return;
    const base = it.href.split("?")[0];
    const vale = it.exacto ? ruta === base : ruta === base || ruta.startsWith(base + "/");
    if (vale && base.length > largo) {
      mejor = i;
      largo = base.length;
    }
  });
  return Math.max(mejor, 0);
}

export default function AdminMenu({
  items,
  usuario,
}: {
  items: ItemMenuAdmin[];
  usuario: { nombre: string; rol: string };
}) {
  const router = useRouter();
  const ruta = usePathname();
  const query = useSearchParams().toString();
  const actual = seccionActual(items, ruta, query);

  const { resolved, setPreference } = useTheme();

  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState({ texto: "", visible: false });

  const escena = useRef<HTMLElement>(null);
  const bandas = useRef<SVGSVGElement>(null);
  const filas = useRef<(HTMLLIElement | null)[]>([]);
  const enlaces = useRef<(HTMLAnchorElement | null)[]>([]);
  const panel = useRef<HTMLElement>(null);
  const velo = useRef<HTMLDivElement>(null);
  const abrirBtn = useRef<HTMLButtonElement>(null);

  /* Estado del arco (no provoca renders). */
  const arco = useRef({
    pos: actual,
    meta: actual,
    vel: 0,
    anim: 0,
    tPrev: 0,
    step: 44,
    W: 0,
    H: 0,
    BX: 0,
    cy: 0,
    R: 210,
    centrado: -1,
    arrastro: false,
  });

  const N = items.length;
  const reducido = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Pintar el arco ─────────────────────────────────────── */
  const render = useCallback(() => {
    const a = arco.current;
    for (let i = 0; i < N; i++) {
      const li = filas.current[i];
      if (!li) continue;
      const o = i - a.pos;
      const d = Math.abs(o);
      const y = o * a.step;
      const yy = Math.min(Math.abs(y), a.R - 1);
      const sh = a.R - Math.sqrt(a.R * a.R - yy * yy);
      li.style.visibility =
        d > 4.4 && enlaces.current[i] !== document.activeElement ? "hidden" : "visible";
      li.style.transform = `translate(${(a.BX - 20 - sh).toFixed(1)}px,${(a.cy + y - 20).toFixed(1)}px)`;
      li.style.opacity = Math.max(0, 1 - d * 0.24).toFixed(3);
      li.style.setProperty("--c", Math.max(0, 1 - d).toFixed(3));
      li.style.zIndex = d < 0.5 ? "3" : "1";
    }
    const centro = clamp(Math.round(a.pos), 0, N - 1);
    if (centro !== a.centrado) {
      if (a.centrado >= 0) enlaces.current[a.centrado]?.setAttribute("tabindex", "-1");
      a.centrado = centro;
      enlaces.current[centro]?.setAttribute("tabindex", "0");
    }
  }, [N]);

  const medir = useCallback(() => {
    const el = escena.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const a = arco.current;
    a.W = r.width;
    a.H = r.height;
    a.step = clamp(a.H / 6.6, 52, 62);
    a.R = a.step * 4.8;
    a.BX = clamp(a.W * 0.37, 104, 128);
    a.cy = a.H / 2;
    const c = bandas.current?.querySelector("circle");
    if (c) {
      c.setAttribute("cx", String(a.BX - a.R));
      c.setAttribute("cy", String(a.cy));
      c.setAttribute("r", String(a.R));
      c.setAttribute("stroke-width", String(a.step * 1.1));
    }
    render();
  }, [render]);

  /* ── Muelle hacia la meta ───────────────────────────────── */
  const paso = useCallback(
    (t: number) => {
      const a = arco.current;
      const dt = Math.min(0.05, (t - a.tPrev) / 1000);
      a.tPrev = t;
      const k = 170;
      const c = 2 * Math.sqrt(k) * 0.94;
      a.vel += (k * (a.meta - a.pos) - c * a.vel) * dt;
      a.pos += a.vel * dt;
      render();
      if (Math.abs(a.meta - a.pos) < 0.0006 && Math.abs(a.vel) < 0.008) {
        a.pos = a.meta;
        a.vel = 0;
        render();
        a.anim = 0;
        return;
      }
      a.anim = requestAnimationFrame(paso);
    },
    [render]
  );

  const ir = useCallback(
    (i: number, foco = false) => {
      const a = arco.current;
      a.meta = clamp(i, 0, N - 1);
      if (foco) {
        const li = filas.current[a.meta];
        if (li) li.style.visibility = "visible";
        enlaces.current[a.meta]?.focus({ preventScroll: true });
      }
      if (reducido()) {
        a.pos = a.meta;
        a.vel = 0;
        render();
        return;
      }
      if (!a.anim) {
        a.tPrev = performance.now();
        a.anim = requestAnimationFrame(paso);
      }
    },
    [N, paso, render]
  );

  /* Al cambiar de ruta, el arco se centra en la sección actual. */
  useEffect(() => {
    const a = arco.current;
    a.pos = a.meta = actual;
    render();
  }, [actual, render]);

  /* Medidas: al montar, al cambiar de tamaño y con las fuentes. */
  useEffect(() => {
    medir();
    const a = arco.current;
    const el = escena.current;
    const ro = typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(medir) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("resize", medir);
    document.fonts?.ready.then(medir);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", medir);
      cancelAnimationFrame(a.anim);
    };
  }, [medir]);

  /* ── Rueda, arrastre y teclado sobre el arco ─────────────── */
  useEffect(() => {
    const el = escena.current;
    if (!el) return;
    const a = arco.current;
    let acc = 0;
    let ult = 0;
    let dr: { y: number; p: number; mov: boolean; id: number; lp: number; lt: number; v: number } | null = null;

    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const t = performance.now();
      acc += e.deltaY;
      if (Math.abs(acc) > 36 && t - ult > 110) {
        ir(a.meta + (acc > 0 ? 1 : -1));
        acc = 0;
        ult = t;
      }
    };
    const baja = (e: PointerEvent) => {
      if (e.button > 0) return;
      dr = { y: e.clientY, p: a.pos, mov: false, id: e.pointerId, lp: a.pos, lt: performance.now(), v: 0 };
      cancelAnimationFrame(a.anim);
      a.anim = 0;
      a.vel = 0;
    };
    const mueve = (e: PointerEvent) => {
      if (!dr) return;
      const dy = e.clientY - dr.y;
      if (!dr.mov && Math.abs(dy) > 6) {
        dr.mov = true;
        a.arrastro = true;
        try {
          el.setPointerCapture(dr.id);
        } catch {}
      }
      if (dr.mov) {
        const np = clamp(dr.p - dy / a.step, 0, N - 1);
        const now = performance.now();
        const dtm = Math.max(1, now - dr.lt);
        dr.v = 0.6 * dr.v + 0.4 * (((np - dr.lp) / dtm) * 1000);
        dr.lp = np;
        dr.lt = now;
        a.pos = np;
        render();
      }
    };
    const suelta = () => {
      if (!dr) return;
      const d0 = dr;
      dr = null;
      if (d0.mov) {
        a.vel = performance.now() - d0.lt > 100 ? 0 : clamp(d0.v, -14, 14);
        ir(clamp(Math.round(a.pos + a.vel * 0.14), 0, N - 1));
        setTimeout(() => {
          a.arrastro = false;
        }, 0);
      } else {
        a.meta = Math.round(a.pos);
      }
    };
    const tecla = (e: KeyboardEvent) => {
      const k = e.key;
      let d = 0;
      if (k === "ArrowDown" || k === "ArrowRight") d = 1;
      else if (k === "ArrowUp" || k === "ArrowLeft") d = -1;
      else if (k === "Home") {
        e.preventDefault();
        ir(0, true);
        return;
      } else if (k === "End") {
        e.preventDefault();
        ir(N - 1, true);
        return;
      } else return;
      e.preventDefault();
      ir(a.meta + d, true);
    };

    el.addEventListener("wheel", rueda, { passive: false });
    el.addEventListener("pointerdown", baja);
    el.addEventListener("pointermove", mueve);
    el.addEventListener("pointerup", suelta);
    el.addEventListener("pointercancel", suelta);
    el.addEventListener("keydown", tecla);
    return () => {
      el.removeEventListener("wheel", rueda);
      el.removeEventListener("pointerdown", baja);
      el.removeEventListener("pointermove", mueve);
      el.removeEventListener("pointerup", suelta);
      el.removeEventListener("pointercancel", suelta);
      el.removeEventListener("keydown", tecla);
    };
  }, [N, ir, render]);

  /* ── Abrir y cerrar ──────────────────────────────────────── */
  useEffect(() => {
    const p = panel.current;
    if (!p) return;
    if (abierto) p.removeAttribute("inert");
    else p.setAttribute("inert", "");
  }, [abierto]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abierto) {
        setAbierto(false);
        abrirBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [abierto]);

  /* Gesto: deslizar desde la izquierda abre; hacia la izquierda cierra. */
  useEffect(() => {
    const p = panel.current;
    const v = velo.current;
    if (!p || !v) return;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let xl = 0;
    let modo = 0;
    let pw = 0;
    let prog = 0;
    let activo = false;
    const estaAbierto = () => p.dataset.abierto === "true";

    const pinta = (px: number) => {
      const f = clamp(px / pw, 0, 1);
      p.style.transition = "none";
      v.style.transition = "none";
      p.style.transform = `translateX(${(f - 1) * 104}%)`;
      v.style.opacity = String(f);
      v.style.pointerEvents = "none";
    };
    const termina = (on: boolean) => {
      p.style.transition = "";
      v.style.transition = "";
      void p.offsetWidth;
      p.style.transform = "";
      v.style.opacity = "";
      v.style.pointerEvents = "";
      setAbierto(on);
    };
    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        activo = false;
        return;
      }
      const t = e.touches[0];
      const objetivo = e.target as Element | null;
      if (!estaAbierto() && objetivo?.closest?.("svg,.rk-cal,button,a,input")) {
        activo = false;
        return;
      }
      x0 = xl = t.clientX;
      y0 = t.clientY;
      t0 = e.timeStamp;
      modo = 0;
      activo = true;
      pw = p.getBoundingClientRect().width || 360;
      prog = estaAbierto() ? pw : 0;
    };
    const mueve = (e: TouchEvent) => {
      if (!activo) return;
      const t = e.touches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      const ab = estaAbierto();
      if (!modo) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.4 || (ab ? dx > 0 : dx < 0)) {
          activo = false;
          return;
        }
        modo = 1;
      }
      if (e.cancelable) e.preventDefault();
      xl = t.clientX;
      prog = clamp((ab ? pw : 0) + dx, 0, pw);
      pinta(prog);
    };
    const fin = (e: TouchEvent) => {
      if (!activo || modo !== 1) {
        activo = false;
        return;
      }
      activo = false;
      const vel = (xl - x0) / Math.max(1, e.timeStamp - t0);
      const ab = estaAbierto();
      termina(ab ? !(vel < -0.35 || prog < pw * 0.65) : vel > 0.35 || prog > pw * 0.35);
    };

    document.addEventListener("touchstart", inicio, { passive: true });
    document.addEventListener("touchmove", mueve, { passive: false });
    document.addEventListener("touchend", fin);
    document.addEventListener("touchcancel", fin);
    return () => {
      document.removeEventListener("touchstart", inicio);
      document.removeEventListener("touchmove", mueve);
      document.removeEventListener("touchend", fin);
      document.removeEventListener("touchcancel", fin);
    };
  }, []);

  /* ── Elegir una sección ─────────────────────────────────── */
  const espera = useRef(0);
  const elegir = (e: ReactMouseEvent<HTMLAnchorElement>, i: number) => {
    // Con modificadores (nueva pestaña) se deja al navegador.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (arco.current.arrastro) return;
    ir(i);
    setAviso({ texto: `Abriendo: ${items[i].label}`, visible: true });
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(
      () => {
        setAbierto(false);
        abrirBtn.current?.focus({ preventScroll: true });
        router.push(items[i].href);
      },
      reducido() ? 120 : 520
    );
  };

  useEffect(() => {
    if (!aviso.visible) return;
    const t = window.setTimeout(() => setAviso((a) => ({ ...a, visible: false })), 1600);
    return () => window.clearTimeout(t);
  }, [aviso]);

  useEffect(() => () => window.clearTimeout(espera.current), []);

  return (
    <>
      <div className="rk-mn-barra">
        <p className="rk-eyebrow">Admin Center</p>
        <div className="rk-mn-acc">
          <button
            className="rk-btn rk-btn-icono rk-btn-line"
            type="button"
            aria-label="Cambiar tema"
            onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
          >
            ◐
          </button>
          <button
            ref={abrirBtn}
            className="rk-btn rk-btn-line"
            type="button"
            aria-expanded={abierto}
            aria-controls="mnPanel"
            onClick={() => setAbierto((v) => !v)}
          >
            Abrir menú
          </button>
        </div>
      </div>

      <div
        ref={velo}
        className="rk-mn-velo"
        data-abierto={abierto}
        onClick={() => setAbierto(false)}
      />
      <span className="rk-mn-asa" aria-hidden="true" />

      <aside
        ref={panel}
        className="rk-mn"
        id="mnPanel"
        data-abierto={abierto}
        aria-label="Menú de administración"
      >
        <header className="rk-mn-cab">
          <span className="rk-mn-logo">
            <span className="rk-isotipo" aria-hidden="true" />
          </span>
          <button
            className="rk-btn rk-btn-icono rk-btn-ghost"
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <nav ref={escena} className="rk-mn-escena" aria-label="Secciones de administración">
          <svg ref={bandas} className="rk-mn-bandas" aria-hidden="true">
            <circle className="bd" />
          </svg>
          <ul className="rk-mn-lista">
            {items.map((it, i) => (
              <li
                key={it.href}
                ref={(el) => {
                  filas.current[i] = el;
                }}
                className="rk-mn-fila"
                style={{ "--k": i } as CSSProperties}
              >
                <a
                  ref={(el) => {
                    enlaces.current[i] = el;
                  }}
                  className="rk-mn-item"
                  href={it.href}
                  tabIndex={-1}
                  aria-current={i === actual ? "page" : undefined}
                  onClick={(e) => elegir(e, i)}
                >
                  <span className="rk-mn-burbuja">
                    <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: it.icono }} />
                  </span>
                  <span className="rk-mn-txt">{it.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="rk-mn-pie">
          <div className="rk-mn-user">
            <span className="rk-mn-avatar">
              <span className="rk-isotipo" aria-hidden="true" />
            </span>
            <div>
              <b>{usuario.nombre}</b>
              <span>{usuario.rol}</span>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="rk-btn rk-btn-danger" type="submit">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </footer>
      </aside>

      <div
        className="rk-mn-aviso"
        role="status"
        aria-live="polite"
        data-v={aviso.visible}
      >
        {aviso.texto}
      </div>
    </>
  );
}
