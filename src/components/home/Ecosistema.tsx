import type React from "react";
import { LogoFigma } from "@/components/programas/LogosProgramas";

/**
 * Ecosistema creativo.
 *
 * Fila simétrica de programas con el cohete de RcktX en un
 * círculo de marca al centro. Todos los programas van en círculos
 * blancos con su logo real: más grandes cerca del centro y
 * tenues en los bordes. Detrás: retícula de puntos,
 * dos arcos grandes.
 *
 * Animación (solo CSS, sección AW de globals.css): entrada del
 * centro hacia afuera y, después, solo se mueve el centro: el
 * cohete se mece y un neón fino gira alrededor. Al fondo,
 * los puntos se prenden en pulso del centro hacia afuera. Respeta el
 * movimiento reducido.
 *
 * Indica con qué programas se abren los archivos del catálogo;
 * no es una alianza ni una integración.
 *
 * Todo va en porcentaje dentro de una caja con proporción fija,
 * así se ve igual en móvil y escritorio.
 */

type Nivel = "fuerte-frio" | "fuerte-calido" | "blanco" | "tenue";

type Programa = {
  nombre: string;
  /** Centro del círculo, en % del ancho. */
  x: number;
  nivel: Nivel;
  sigla?: string;
  /** Color de las letras del ícono (token --rk-eco-letra: monocromo, cambia con el tema). */
  letra?: string;
  figma?: boolean;
};

const PROGRAMAS: Programa[] = [
  { nombre: "InDesign", x: 5.5, nivel: "tenue", sigla: "Id", letra: "rgb(var(--rk-eco-letra))" },
  { nombre: "Illustrator", x: 18, nivel: "blanco", sigla: "Ai", letra: "rgb(var(--rk-eco-letra))" },
  { nombre: "Photoshop", x: 33, nivel: "fuerte-frio", sigla: "Ps", letra: "rgb(var(--rk-eco-letra))" },
  { nombre: "Figma", x: 67, nivel: "fuerte-calido", figma: true },
  { nombre: "After Effects", x: 82, nivel: "blanco", sigla: "Ae", letra: "rgb(var(--rk-eco-letra))" },
  { nombre: "Premiere Pro", x: 94.5, nivel: "tenue", sigla: "Pr", letra: "rgb(var(--rk-eco-letra))" },
];

export default function Ecosistema() {
  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        {/* Solo el dibujo; el título queda para lectores de pantalla. */}
        <h2 className="sr-only">Ecosistema creativo RcktX</h2>

        <div className="rk-fade-up rk-enter-1 rk-eco">
          {/* Fondo: puntos (con pulso del centro hacia afuera) y arcos. */}
          <div aria-hidden className="rk-eco-puntos" />
          <div aria-hidden className="rk-eco-pulso" />
          <div aria-hidden className="rk-eco-arco is-arriba" />
          <div aria-hidden className="rk-eco-arco is-abajo" />

          {/* Núcleo: cohete blanco sobre el degradado de marca. */}
          <div className="rk-eco-hexwrap">
          <div className="rk-eco-hex">
            <div className="rk-eco-nucleo">
              <span className="rk-eco-isotipo-wrap">
                <span role="img" aria-label="RcktX" className="rk-eco-isotipo" />
              </span>
            </div>
          </div>
          </div>

          {/* Programas */}
          <ul aria-label="Programas compatibles">
            {PROGRAMAS.map((p) => (
              <li
                key={p.nombre}
                className={`rk-eco-app is-${p.nivel}`}
                style={
                  {
                    left: `${p.x}%`,
                    // distancia al centro: ordena la entrada y el flote
                    "--rk-eco-i": Math.ceil(Math.abs(p.x - 50) / 17),
                  } as React.CSSProperties
                }
                title={p.nombre}
              >
                {p.figma ? (
                  <LogoFigma className="rk-eco-figma" />
                ) : (
                  <span
                    className="rk-eco-adobe"
                    style={{ color: p.letra }}
                  >
                    {p.sigla}
                  </span>
                )}
                <span className="sr-only">{p.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
