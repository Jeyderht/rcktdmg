"use client";

import { useEffect, useState } from "react";
type PaymentMethod = {
  id: string;
  type: "BANK" | "YAPE" | "PLIN";
  holderName: string;
  documentNumber: string;
  bankName: string | null;
  accountNumber: string | null;
  cci: string | null;
  phone: string | null;
  isDefault: boolean;
};

type Withdrawal = {
  id: string;
  amount: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
    creatorStatus: string | null;
  };
  paymentMethod: PaymentMethod | null;
};

const statusLabels: Record<Withdrawal["status"], string> = {
  REQUESTED: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  PAID: "Pagado",
};

const statusClasses: Record<Withdrawal["status"], string> = {
  REQUESTED: "bg-warning/12 text-warning",
  APPROVED: "bg-accent/12 text-accent",
  REJECTED: "bg-danger/10 text-danger",
  PAID: "bg-success/12 text-success",
};

function getPaymentMethodLabel(type: PaymentMethod["type"]) {
  const labels = {
    BANK: "Cuenta bancaria",
    YAPE: "Yape",
    PLIN: "Plin",
  };

  return labels[type];
}

export default function AdminRetirosPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadWithdrawals() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/retiros", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los retiros");
      }

      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los retiros"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function handleAction(
    id: string,
    action: "APPROVE" | "REJECT" | "PAY"
  ) {
    let note: string | undefined;

    if (action === "REJECT") {
      const reason = window.prompt("Indica el motivo del rechazo:");

      if (reason === null) {
        return;
      }

      if (!reason.trim()) {
        window.alert("Debes indicar un motivo para rechazar el retiro.");
        return;
      }

      note = reason.trim();
    }

    const messages = {
      APPROVE: "¿Deseas aprobar este retiro?",
      REJECT: "¿Deseas rechazar este retiro?",
      PAY: "¿Confirmas que este retiro ya fue pagado?",
    };

    if (!window.confirm(messages[action])) {
      return;
    }

    try {
      setProcessingId(id);
      setError("");

      const response = await fetch(`/api/admin/retiros/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...(note ? { note } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar el retiro");
      }

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar el retiro"
      );
    } finally {
      setProcessingId(null);
    }
  }

  const pending = withdrawals.filter(
    (withdrawal) => withdrawal.status === "REQUESTED"
  );

  const approved = withdrawals.filter(
    (withdrawal) => withdrawal.status === "APPROVED"
  );

  const paid = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PAID"
  );

  const totalPending = pending.reduce(
    (total, withdrawal) => total + Number(withdrawal.amount),
    0
  );

  const totalApproved = approved.reduce(
    (total, withdrawal) => total + Number(withdrawal.amount),
    0
  );

  const totalPaid = paid.reduce(
    (total, withdrawal) => total + Number(withdrawal.amount),
    0
  );

  return (
    <main className="min-h-screen bg-ink/[0.05] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-ink/50">
              Administración
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Retiros de creadores
            </h1>

            <p className="mt-2 text-ink/60">
              Gestiona las solicitudes de retiro de los creadores.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWithdrawals}
            disabled={loading}
            className="rk-btn rk-btn-glass disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Solicitudes</p>
            <p className="mt-2 text-3xl font-bold">{withdrawals.length}</p>
          </div>

          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Pendiente</p>
            <p className="mt-2 text-3xl font-bold">
              S/ {totalPending.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {pending.length} solicitud(es)
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Aprobado</p>
            <p className="mt-2 text-3xl font-bold">
              S/ {totalApproved.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {approved.length} solicitud(es)
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Pagado</p>
            <p className="mt-2 text-3xl font-bold">
              S/ {totalPaid.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {paid.length} solicitud(es)
            </p>
          </div>
        </div>

        <div className="overflow-hidden rk-card">
          <div className="border-b border-ink/10 px-6 py-5">
            <h2 className="text-lg font-semibold text-ink">
              Solicitudes de retiro
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-ink/50">
              Cargando solicitudes...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-ink/50">
                No existen solicitudes de retiro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] text-left text-sm">
                <thead className="border-b border-ink/10 bg-ink/[0.05]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Creador</th>
                    <th className="px-6 py-4 font-semibold">Monto</th>
                    <th className="px-6 py-4 font-semibold">Método de pago</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 font-semibold">Fecha</th>
                    <th className="px-6 py-4 font-semibold">Nota</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink/10">
                  {withdrawals.map((withdrawal) => {
                    const isProcessing =
                      processingId === withdrawal.id;

                    return (
                      <tr
                        key={withdrawal.id}
                        className="transition hover:bg-ink/[0.05]"
                      >
                        <td className="px-6 py-5">
                          <div className="font-medium text-ink">
                            {withdrawal.creator.name || "Sin nombre"}
                          </div>

                          <div className="mt-1 text-xs text-ink/50">
                            {withdrawal.creator.email}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-semibold text-ink">
                            S/ {Number(withdrawal.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {withdrawal.paymentMethod ? (
                            <div className="min-w-[220px]">
                              <div className="font-semibold text-ink">
                                {getPaymentMethodLabel(withdrawal.paymentMethod.type)}
                              </div>

                              <div className="mt-1 text-xs text-ink/50">
                                Titular: {withdrawal.paymentMethod.holderName}
                              </div>

                              <div className="text-xs text-ink/50">
                                DNI/RUC: {withdrawal.paymentMethod.documentNumber}
                              </div>

                              {withdrawal.paymentMethod.type === "BANK" ? (
                                <>
                                  {withdrawal.paymentMethod.bankName && (
                                    <div className="text-xs text-ink/50">
                                      Banco: {withdrawal.paymentMethod.bankName}
                                    </div>
                                  )}

                                  {withdrawal.paymentMethod.accountNumber && (
                                    <div className="text-xs text-ink/50">
                                      Cuenta: {withdrawal.paymentMethod.accountNumber}
                                    </div>
                                  )}

                                  {withdrawal.paymentMethod.cci && (
                                    <div className="text-xs text-ink/50">
                                      CCI: {withdrawal.paymentMethod.cci}
                                    </div>
                                  )}
                                </>
                              ) : (
                                withdrawal.paymentMethod.phone && (
                                  <div className="text-xs text-ink/50">
                                    Celular: {withdrawal.paymentMethod.phone}
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-ink/40">
                              Sin método registrado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClasses[withdrawal.status]}`}
                          >
                            {statusLabels[withdrawal.status]}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-ink/60">
                          {new Date(
                            withdrawal.createdAt
                          ).toLocaleString("es-PE")}
                        </td>

                        <td className="max-w-[220px] px-6 py-5 text-ink/60">
                          {withdrawal.note || "—"}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            {withdrawal.status === "REQUESTED" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleAction(
                                      withdrawal.id,
                                      "APPROVE"
                                    )
                                  }
                                  className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-onprimary transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isProcessing
                                    ? "Procesando..."
                                    : "Aprobar"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleAction(
                                      withdrawal.id,
                                      "REJECT"
                                    )
                                  }
                                  className="rounded-full border border-danger/25 bg-surface px-4 py-2 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}

                            {withdrawal.status === "APPROVED" && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleAction(
                                    withdrawal.id,
                                    "PAY"
                                  )
                                }
                                className="rounded-full bg-success px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "Procesando..."
                                  : "Marcar pagado"}
                              </button>
                            )}

                            {withdrawal.status === "REJECTED" && (
                              <span className="text-xs text-ink/40">
                                Sin acciones
                              </span>
                            )}

                            {withdrawal.status === "PAID" && (
                              <span className="text-xs font-medium text-success">
                                ✓ Completado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}