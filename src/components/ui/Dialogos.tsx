"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Diálogos propios en lugar de window.confirm / alert / prompt.
 *
 *   const { confirmar, avisar, pedirTexto } = useDialogo();
 *   if (!(await confirmar({ titulo: "¿Borrar?", peligro: true }))) return;
 *
 * Un solo <dialog> nativo para todo el sitio, montado en el layout
 * raíz (DialogosProvider). `showModal()` da la capa superior, el
 * foco atrapado y Escape para cancelar; el estilo es el vidrio y
 * los botones de siempre, en claro y en oscuro.
 */

type Base = {
  titulo: string;
  mensaje?: string;
};

export type OpcionesConfirmar = Base & {
  /** Texto del botón que acepta. Por defecto «Aceptar». */
  aceptar?: string;
  /** Texto del botón que cancela. Por defecto «Cancelar». */
  cancelar?: string;
  /** Acción destructiva: el botón que acepta va en rojo. */
  peligro?: boolean;
};

export type OpcionesAvisar = Base & {
  aceptar?: string;
};

export type OpcionesTexto = OpcionesConfirmar & {
  etiqueta?: string;
  valorInicial?: string;
  /** Si es obligatorio, no se puede aceptar con el campo vacío. */
  obligatorio?: boolean;
  placeholder?: string;
};

type Pedido =
  | { tipo: "confirmar"; opciones: OpcionesConfirmar; resolver: (v: boolean) => void }
  | { tipo: "avisar"; opciones: OpcionesAvisar; resolver: () => void }
  | { tipo: "texto"; opciones: OpcionesTexto; resolver: (v: string | null) => void };

type Api = {
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>;
  avisar: (opciones: OpcionesAvisar | string) => Promise<void>;
  pedirTexto: (opciones: OpcionesTexto) => Promise<string | null>;
};

const Contexto = createContext<Api | null>(null);

export function useDialogo(): Api {
  const api = useContext(Contexto);

  if (!api) {
    throw new Error("useDialogo necesita DialogosProvider en el layout.");
  }

  return api;
}

export function DialogosProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [texto, setTexto] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  /* Uno a la vez: si llega otro con uno abierto, el abierto se cancela. */
  const abrir = useCallback((nuevo: Pedido) => {
    setPedido((anterior) => {
      if (anterior) cerrarCon(anterior, false);
      return nuevo;
    });
  }, []);

  const api = useMemo<Api>(
    () => ({
      confirmar: (opciones) =>
        new Promise<boolean>((resolver) => abrir({ tipo: "confirmar", opciones, resolver })),
      avisar: (opciones) =>
        new Promise<void>((resolver) =>
          abrir({
            tipo: "avisar",
            opciones: typeof opciones === "string" ? { titulo: opciones } : opciones,
            resolver,
          })
        ),
      pedirTexto: (opciones) =>
        new Promise<string | null>((resolver) => {
          setTexto(opciones.valorInicial ?? "");
          abrir({ tipo: "texto", opciones, resolver });
        }),
    }),
    [abrir]
  );

  useEffect(() => {
    const el = dialogo.current;

    if (!el) return;

    if (pedido && !el.open) {
      el.showModal();
      if (pedido.tipo === "texto") campo.current?.focus();
    } else if (!pedido && el.open) {
      el.close();
    }
  }, [pedido]);

  function terminar(aceptado: boolean) {
    if (!pedido) return;

    cerrarCon(pedido, aceptado, texto);
    setPedido(null);
  }

  const vacio =
    pedido?.tipo === "texto" && pedido.opciones.obligatorio && !texto.trim();

  return (
    <Contexto.Provider value={api}>
      {children}

      <dialog
        ref={dialogo}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={pedido?.opciones.mensaje ? `${id}-mensaje` : undefined}
        onCancel={(e) => {
          // Escape: cancela (en un aviso, equivale a aceptar).
          e.preventDefault();
          terminar(pedido?.tipo === "avisar");
        }}
        className="rk-glass-strong m-auto w-[min(26rem,calc(100vw-2rem))] rounded-rk-md p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        {pedido && (
          <form
            method="dialog"
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!vacio) terminar(true);
            }}
          >
            <h2 id={`${id}-titulo`} className="text-base font-semibold leading-6">
              {pedido.opciones.titulo}
            </h2>

            {pedido.opciones.mensaje && (
              <p
                id={`${id}-mensaje`}
                className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70"
              >
                {pedido.opciones.mensaje}
              </p>
            )}

            {pedido.tipo === "texto" && (
              <div className="mt-4">
                {pedido.opciones.etiqueta && (
                  <label htmlFor={`${id}-campo`} className="rk-label mb-2 block">
                    {pedido.opciones.etiqueta}
                  </label>
                )}
                <textarea
                  id={`${id}-campo`}
                  ref={campo}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={pedido.opciones.placeholder}
                  rows={3}
                  className="rk-textarea w-full"
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              {pedido.tipo !== "avisar" && (
                <button
                  type="button"
                  onClick={() => terminar(false)}
                  className="rk-btn rk-btn-line rk-btn-compact"
                >
                  {pedido.opciones.cancelar ?? "Cancelar"}
                </button>
              )}

              <button
                type="submit"
                autoFocus={pedido.tipo !== "texto"}
                disabled={vacio}
                className={`rk-btn rk-btn-compact ${
                  pedido.tipo !== "avisar" && pedido.opciones.peligro
                    ? "rk-btn-danger"
                    : "rk-btn-primary"
                }`}
              >
                {pedido.opciones.aceptar ?? "Aceptar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </Contexto.Provider>
  );
}

function cerrarCon(pedido: Pedido, aceptado: boolean, texto = "") {
  if (pedido.tipo === "confirmar") pedido.resolver(aceptado);
  else if (pedido.tipo === "avisar") pedido.resolver();
  else pedido.resolver(aceptado ? texto.trim() : null);
}
