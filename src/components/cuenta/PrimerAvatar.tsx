"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ElegirFoto from "@/components/cuenta/ElegirFoto";

/** «Más tarde»: no vuelve a salir en esta sesión del navegador. */
const CLAVE_MAS_TARDE = "rcktdmg-foto-mas-tarde";

/**
 * Primer ingreso del cliente sin foto: le propone elegir avatar o
 * subir su foto. Solo se monta si aún no tiene foto, así que una vez
 * elegida no vuelve a salir. «Más tarde» lo deja para otra visita.
 */
export default function PrimerAvatar() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let pospuesto = false;

    try {
      pospuesto = sessionStorage.getItem(CLAVE_MAS_TARDE) === "1";
    } catch {
      // Sin almacenamiento, se pregunta: es solo una sugerencia.
    }

    if (!pospuesto) setAbierto(true);
  }, []);

  return (
    <ElegirFoto
      abierto={abierto}
      titulo="Ponle cara a tu cuenta"
      textoCerrar="Más tarde"
      alCerrar={() => {
        try {
          sessionStorage.setItem(CLAVE_MAS_TARDE, "1");
        } catch {
          // Si no se puede guardar, solo se cierra.
        }
        setAbierto(false);
      }}
      alGuardar={() => {
        setAbierto(false);
        router.refresh();
      }}
    />
  );
}
