"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserActionsProps = {
  userId: string;
  role: "ADMIN" | "CREATOR" | "CLIENT";
  creatorStatus:
    | "PENDING"
    | "APPROVED"
    | "SUSPENDED"
    | "REJECTED"
    | null;
  isVerified: boolean;
};

type Action = {
  action: string;
  label: string;
  confirm: string;
  tone?: "danger";
};

export default function UserActions({
  userId,
  role,
  creatorStatus,
  isVerified,
}: UserActionsProps) {
  const router = useRouter();

  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (role === "ADMIN") {
    return (
      <span className="text-xs text-ink/60">
        Sin acciones
      </span>
    );
  }

  const actions: Action[] = [];

  if (role === "CLIENT") {
    actions.push({
      action: "MAKE_CREATOR",
      label: "Convertir en creador",
      confirm:
        "¿Convertir a este usuario en creador aprobado?",
    });
  }

  if (role === "CREATOR") {
    if (creatorStatus !== "APPROVED") {
      actions.push({
        action: "APPROVE_CREATOR",
        label: "Aprobar",
        confirm: "¿Aprobar a este creador?",
      });
    }

    if (creatorStatus !== "SUSPENDED") {
      actions.push({
        action: "SUSPEND_CREATOR",
        label: "Suspender",
        confirm:
          "¿Suspender a este creador? No podrá seguir operando.",
        tone: "danger",
      });
    }

    if (creatorStatus === "APPROVED" && !isVerified) {
      actions.push({
        action: "VERIFY",
        label: "Verificar",
        confirm: "¿Verificar a este creador?",
      });
    }

    if (isVerified) {
      actions.push({
        action: "UNVERIFY",
        label: "Quitar verificación",
        confirm:
          "¿Retirar la verificación de este creador?",
        tone: "danger",
      });
    }

    actions.push({
      action: "MAKE_CLIENT",
      label: "Pasar a cliente",
      confirm:
        "¿Convertir a este creador en cliente? Perderá el acceso al Creator Studio y su verificación.",
      tone: "danger",
    });
  }

  async function runAction(item: Action) {
    if (!window.confirm(item.confirm)) {
      return;
    }

    setError("");
    setPending(item.action);

    try {
      const response = await fetch(
        `/api/admin/usuarios/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: item.action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "No se pudo actualizar el usuario."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            disabled={pending !== null}
            onClick={() => runAction(item)}
            className={`rk-btn rk-btn-compact !px-3.5 !py-2 !text-xs ${
              item.tone === "danger"
                ? "border border-danger/25 text-danger hover:bg-danger/10"
                : "rk-btn-glass"
            }`}
          >
            {pending === item.action ? "Guardando..." : item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
