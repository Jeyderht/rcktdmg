import Link from "next/link";
import { ArrowUp, Headphones, Mail, MessageCircle } from "lucide-react";

/**
 * Preguntas frecuentes.
 *
 * Acordeón sin JavaScript: cada pregunta es un <details> con el mismo
 * `name`, así que solo queda una abierta a la vez. Como no usa JS,
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


/* ══════════════ ¿AÚN TIENES DUDAS? ══════════════ */

/*
  Canales de contacto. Se leen de variables de entorno para no dejar
  datos fijos en el código:
    NEXT_PUBLIC_CONTACTO_CORREO     → soporte@tudominio.com
    NEXT_PUBLIC_CONTACTO_WHATSAPP   → 51999999999 (con código de país, sin +)
  Si falta una, su botón no se muestra. El campo de pregunta abre
  WhatsApp con el texto escrito (o el correo si no hay WhatsApp), sin
  JavaScript: es un formulario GET normal.
*/
const CORREO = process.env.NEXT_PUBLIC_CONTACTO_CORREO?.trim() || "";
const WHATSAPP = (process.env.NEXT_PUBLIC_CONTACTO_WHATSAPP || "").replace(
  /\D/g,
  ""
);

function AyudaDirecta() {
  const canales = [
    CORREO && {
      href: `mailto:${CORREO}`,
      label: "Correo",
      Icono: Mail,
    },
    WHATSAPP && {
      href: `https://wa.me/${WHATSAPP}`,
      label: "WhatsApp",
      Icono: MessageCircle,
    },
    {
      href: "#faq-titulo",
      label: "Ayuda",
      Icono: Headphones,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    Icono: typeof Mail;
  }[];

  /* El formulario manda la pregunta por WhatsApp; si no hay
     WhatsApp configurado, por correo. Sin ninguno, no se muestra. */
  const destino = WHATSAPP
    ? { action: `https://wa.me/${WHATSAPP}`, campo: "text" }
    : CORREO
      ? { action: `mailto:${CORREO}`, campo: "body" }
      : null;

  return (
    <section className="rk-help mt-10" aria-labelledby="ayuda-titulo">
      <div className="rk-help-scene">
        <div className="rk-help-chat">
          <p className="rk-help-bubble">
            ¿Qué licencia tiene el flyer que compré?
          </p>

          <p className="rk-help-reply">
            Cada recurso indica su licencia en la ficha y en Mi cuenta. Si
            aún tienes dudas, escríbenos por cualquiera de estos canales.
          </p>

          <p className="rk-help-label">
            {canales.length}{" "}
            {canales.length === 1 ? "canal disponible" : "canales disponibles"}
          </p>

          <div className="rk-help-chips">
            {canales.map(({ href, label, Icono }) => {
              const externo = href.startsWith("http");

              return (
                <a
                  key={label}
                  href={href}
                  className="rk-help-chip"
                  {...(externo
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <Icono aria-hidden />
                  {label}
                </a>
              );
            })}
          </div>

          {destino && (
            <form
              className="rk-help-input"
              action={destino.action}
              method="get"
              target={WHATSAPP ? "_blank" : undefined}
            >
              <label htmlFor="ayuda-pregunta" className="sr-only">
                Escribe tu pregunta
              </label>

              <input
                id="ayuda-pregunta"
                name={destino.campo}
                type="text"
                required
                autoComplete="off"
                placeholder="Escribe tu pregunta"
              />

              <button
                type="submit"
                className="rk-help-btn rk-help-btn-send"
                aria-label="Enviar pregunta"
              >
                <ArrowUp aria-hidden />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="rk-help-caption">
        <span className="rk-help-dot">Ayuda directa</span>

        <h3 id="ayuda-titulo" className="rk-help-title">
          ¿Aún tienes dudas? Te respondemos en minutos.
        </h3>

        <p className="rk-help-text">
          Escríbenos por correo o WhatsApp y una persona del equipo te ayuda
          con tu compra, tu licencia o tu cuenta.
        </p>
      </div>
    </section>
  );
}

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
            /* Mismo `name` en todas: el navegador deja una sola
               abierta y cierra la anterior al abrir otra. */
            name="rk-faq"
          >
            <summary className="rk-faq-q">
              {pregunta}
              <span className="rk-faq-icon" aria-hidden />
            </summary>

            <div className="rk-faq-a">{respuesta}</div>
          </details>
        ))}
      </div>

      <AyudaDirecta />
    </section>
  );
}
