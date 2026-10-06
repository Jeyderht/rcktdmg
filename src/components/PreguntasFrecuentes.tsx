import Link from "next/link";

/**
 * Preguntas frecuentes.
 *
 * Acordeón sin JavaScript: cada pregunta es un <details>, así que
 * funciona aunque el cliente no haya hidratado y es accesible con
 * teclado de serie. El estilo vive en globals.css, sección S (rk-faq).
 *
 * Las respuestas describen cómo funciona hoy la tienda (pago con
 * tarjeta o Yape, descarga permanente, licencias en Mi cuenta). Si
 * cambia una regla del negocio, se cambia aquí.
 */

type Pregunta = {
  pregunta: string;
  respuesta: React.ReactNode;
};

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: "¿Qué recibo al comprar un recurso?",
    respuesta: (
      <p>
        El archivo del recurso en el formato indicado en su ficha (por
        ejemplo PSD, AI o JPEG), listo para editar y usar. Lo descargas
        desde <Link href="/mi-cuenta/descargas">Mi cuenta · Descargas</Link>.
      </p>
    ),
  },
  {
    pregunta: "¿Puedo volver a descargar lo que compré?",
    respuesta: (
      <p>
        Sí. La descarga es permanente: tus compras quedan guardadas en tu
        cuenta y puedes descargarlas otra vez cuando lo necesites.
      </p>
    ),
  },
  {
    pregunta: "¿Cómo puedo pagar?",
    respuesta: (
      <p>
        Con tarjeta de crédito o débito, o con Yape. El pago es seguro y
        se procesa en soles. Al confirmarse, el recurso aparece en tu
        cuenta al instante.
      </p>
    ),
  },
  {
    pregunta: "¿Qué puedo hacer con el recurso que compré?",
    respuesta: (
      <p>
        Cada compra genera una licencia que indica qué puedes hacer con
        ese recurso. Puedes consultarla en{" "}
        <Link href="/mi-cuenta/licencias">Mi cuenta · Licencias</Link>.
      </p>
    ),
  },
  {
    pregunta: "¿Qué es un pack?",
    respuesta: (
      <p>
        Un conjunto de recursos agrupados en un solo paquete, con un
        precio para todo el grupo. Mira los disponibles en{" "}
        <Link href="/packs">Packs</Link>.
      </p>
    ),
  },
  {
    pregunta: "¿Necesito una cuenta para comprar?",
    respuesta: (
      <p>
        Sí. La cuenta es gratuita y es donde quedan tus compras, descargas
        y licencias. <Link href="/registro">Crea tu cuenta aquí</Link>.
      </p>
    ),
  },
  {
    pregunta: "¿Puedo vender mis diseños en RCKTDMG?",
    respuesta: (
      <p>
        Sí. Envía tu solicitud en{" "}
        <Link href="/creadores/unete">Únete como creador</Link>. Cuando se
        apruebe, publicas tus recursos desde el panel de creador.
      </p>
    ),
  },
];

export default function PreguntasFrecuentes({
  className = "",
}: {
  className?: string;
}) {
  return (
    <section
      aria-labelledby="faq-titulo"
      className={`mx-auto w-full max-w-3xl px-4 py-16 sm:px-5 lg:py-20 ${className}`}
    >
      <header className="rk-faq-intro">
        <span className="rk-faq-eyebrow">FAQ</span>

        <h2 id="faq-titulo" className="rk-faq-title">
          Preguntas frecuentes
        </h2>

        <p className="rk-faq-sub">
          Lo que más nos preguntan sobre compras, descargas y licencias.
        </p>
      </header>

      <div className="rk-faq mt-8">
        {PREGUNTAS.map(({ pregunta, respuesta }, indice) => (
          <details
            key={pregunta}
            className="rk-faq-item"
            open={indice === 0}
          >
            <summary className="rk-faq-q">
              {pregunta}
              <span className="rk-faq-icon" aria-hidden />
            </summary>

            <div className="rk-faq-a">{respuesta}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
