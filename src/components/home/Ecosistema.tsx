import type React from "react";

/**
 * Ecosistema creativo.
 *
 * Fila simétrica de programas con el cohete de RCKTDMG en un
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
  /** Color oficial de las letras del ícono de Adobe. */
  letra?: string;
  figma?: boolean;
};

const PROGRAMAS: Programa[] = [
  { nombre: "InDesign", x: 5.5, nivel: "tenue", sigla: "Id", letra: "#FF3366" },
  { nombre: "Illustrator", x: 18, nivel: "blanco", sigla: "Ai", letra: "#FF9A00" },
  { nombre: "Photoshop", x: 33, nivel: "fuerte-frio", sigla: "Ps", letra: "#31A8FF" },
  { nombre: "Figma", x: 67, nivel: "fuerte-calido", figma: true },
  { nombre: "After Effects", x: 82, nivel: "blanco", sigla: "Ae", letra: "#D291FF" },
  { nombre: "Premiere Pro", x: 94.5, nivel: "tenue", sigla: "Pr", letra: "#9999FF" },
];

function LogoFigma() {
  return (
    <svg viewBox="0 0 38 57" aria-hidden className="rk-eco-figma">
      <path fill="#1ABCFE" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" />
      <path fill="#0ACF83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" />
      <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" />
      <path fill="#F24E1E" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" />
      <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" />
    </svg>
  );
}

export default function Ecosistema() {
  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up mx-auto max-w-2xl text-center">
          <p className="rk-kicker justify-center">El sitio</p>

          <h2 className="rk-title mt-3 text-[1.75rem] sm:text-4xl">
            Ecosistema creativo RCKTDMG
          </h2>

          <p className="mt-3 text-[15px] leading-7 text-ink/60">
            Archivos listos para abrir y editar en los programas que ya usas.
          </p>
        </div>

        <div className="rk-fade-up rk-enter-1 rk-eco mt-8 sm:mt-10">
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
                <span role="img" aria-label="RCKTDMG" className="rk-eco-isotipo" />
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
                  <LogoFigma />
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
