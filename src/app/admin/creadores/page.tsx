import type { Metadata } from "next";

import SolicitudesManager from "./SolicitudesManager";

export const metadata: Metadata = {
  title: "Solicitudes de creadores",
};

/**
 * Solicitudes de creadores.
 *
 * El acceso lo resuelve el middleware para todo /admin, y la
 * API vuelve a comprobar el rol: la interfaz nunca es la única
 * barrera. No existe ninguna versión pública de esta cola.
 */
export default function AdminSolicitudesPage() {
  return (
    <div data-vista="otra" className="rk-fade-up">
      <header className="rk-vh">
        <h1 className="rk-title">
          Solicitudes de creadores
        </h1>

        <p>
          Quién ha pedido publicar en RcktX, con su portafolio.
          Aprobar abre su perfil público y le da acceso al Creator
          Studio; rechazar exige un motivo, que él verá.
        </p>
      </header>

      <div className="mt-7">
        <SolicitudesManager />
      </div>
    </div>
  );
}
