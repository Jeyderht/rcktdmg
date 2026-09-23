"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";

import EmptyState from "@/components/EmptyState";

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

const statusBadges: Record<Withdrawal["status"], string> = {
  REQUESTED: "rk-badge-warning",
  APPROVED: "rk-badge-accent",
  REJECTED: "rk-badge-danger",
  PAID: "rk-badge-success",
};

function getPaymentMethodLabel(type: PaymentMethod["type"]) {
  const labels = {
    BANK: "Cuenta bancaria",
    YAPE: "Yape",
    PLIN: "Plin",
  };

  return labels[type];
}

function formatMoney(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Datos del método de pago, tal como los entrega la API. */
function PaymentMethodDetails({
  method,
}: {
  method: PaymentMethod | null;
}) {
  if (!method) {
    return (
      <span className="text-xs text-ink/60">
        Sin método registrado
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold">
        {getPaymentMethodLabel(method.type)}
      </p>

      <p className="mt-1 text-xs text-ink/60">
        Titular: {method.holderName}
      </p>

      <p className="text-xs text-ink/60">
        DNI/RUC: {method.documentNumber}
      </p>

      {method.type === "BANK" ? (
        <>
          {method.bankName && (
            <p className="text-xs text-ink/60">
              Banco: {method.bankName}
            </p>
          )}

          {method.accountNumber && (
            <p className="text-xs tabular-nums text-ink/60">
              Cuenta: {method.accountNumber}
            </p>
          )}

          {method.cci && (
            <p className="text-xs tabular-nums text-ink/60">
              CCI: {method.cci}
            </p>
          )}
        </>
      ) : (
        method.phone && (
          <p className="text-xs tabular-nums text-ink/60">
            Celular: {method.phone}
          </p>
        )
      )}
    </div>
  );
}

export default function AdminRetirosPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );
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
        throw new Error(
          data.error || "No se pudieron cargar los retiros"
        );
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
        window.alert(
          "Debes indicar un motivo para rechazar el retiro."
        );
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
        throw new Error(
          data.error || "No se pudo actualizar el retiro"
        );
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

  const sumOf = (rows: Withdrawal[]) =>
    rows.reduce(
      (total, withdrawal) => total + Number(withdrawal.amount),
      0
    );

  const totals = [
    {
      label: "Solicitudes",
      value: String(withdrawals.length),
      hint: "Total registradas",
      accent: false,
    },
    {
      label: "Pendiente",
      value: formatMoney(sumOf(pending)),
      hint: `${pending.length} ${
        pending.length === 1 ? "solicitud" : "solicitudes"
      }`,
      accent: true,
    },
    {
      label: "Aprobado",
      value: formatMoney(sumOf(approved)),
      hint: `${approved.length} ${
        approved.length === 1 ? "solicitud" : "solicitudes"
      }`,
      accent: false,
    },
    {
      label: "Pagado",
      value: formatMoney(sumOf(paid)),
      hint: `${paid.length} ${
        paid.length === 1 ? "solicitud" : "solicitudes"
      }`,
      accent: false,
    },
  ];

  /** Mismos botones y mismas acciones en escritorio y móvil. */
  function Actions({ withdrawal }: { withdrawal: Withdrawal }) {
    const isProcessing = processingId === withdrawal.id;

    if (withdrawal.status === "REQUESTED") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleAction(withdrawal.id, "APPROVE")}
            className="rk-btn rk-btn-primary rk-btn-compact !px-3.5 !py-2 !text-xs"
          >
            {isProcessing ? "Procesando..." : "Aprobar"}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleAction(withdrawal.id, "REJECT")}
            className="rk-btn rk-btn-compact border border-danger/25 !px-3.5 !py-2 !text-xs text-danger hover:bg-danger/10"
          >
            Rechazar
          </button>
        </div>
      );
    }

    if (withdrawal.status === "APPROVED") {
      return (
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => handleAction(withdrawal.id, "PAY")}
          className="rk-btn rk-btn-success rk-btn-compact !px-3.5 !py-2 !text-xs"
        >
          {isProcessing ? "Procesando..." : "Marcar pagado"}
        </button>
      );
    }

    if (withdrawal.status === "PAID") {
      return (
        <span className="text-xs font-medium text-success">
          Completado
        </span>
      );
    }

    return (
      <span className="text-xs text-ink/60">Sin acciones</span>
    );
  }

  return (
    <main className="w-full px-4 pb-16 pt-6 sm:px-5 lg:px-0 lg:pb-20">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="rk-eyebrow">Admin Center</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Retiros
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Gestiona las solicitudes de retiro de los creadores.
          </p>
        </div>

        <button
          type="button"
          onClick={loadWithdrawals}
          disabled={loading}
          className="rk-btn rk-btn-glass shrink-0"
        >
          <RefreshCw size={15} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rk-fade mt-6 rounded-rk-md border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* ========== TOTALES REALES ========== */}
      <section className="rk-fade-up rk-enter-1 mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {totals.map((item) => (
          <div
            key={item.label}
            className={`rk-card p-4 sm:p-5 ${
              item.accent
                ? "border-ink/20 bg-ink/[0.04]"
                : ""
            }`}
          >
            <p
              className={`rk-eyebrow ${
                item.accent ? "!text-ink" : ""
              }`}
            >
              {item.label}
            </p>

            <p
              className={`mt-3 text-[1.6rem] font-semibold tabular-nums leading-tight tracking-tight ${
                item.accent ? "text-ink" : ""
              }`}
            >
              {loading ? (
                <span className="inline-block h-7 w-24 animate-pulse rounded-full bg-ink/[0.07] align-middle" />
              ) : (
                item.value
              )}
            </p>

            <p className="mt-1.5 text-xs text-ink/60">
              {item.hint}
            </p>
          </div>
        ))}
      </section>

      {/* ========== SOLICITUDES ========== */}
      <section className="rk-fade-up rk-enter-2 mt-10">
        <p className="rk-eyebrow">Solicitudes</p>

        <h2 className="rk-title mt-2 text-2xl">
          Historial de retiros
        </h2>

        <div className="rk-divider mt-4" />

        {loading ? (
          <div className="mt-5 space-y-2.5" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rk-card p-5">
                <div className="h-4 w-40 animate-pulse rounded-full bg-ink/[0.06]" />
                <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
              </div>
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Wallet}
              title="No hay solicitudes de retiro"
              description="Cuando un creador solicite un retiro aparecerá aquí para su revisión."
            />
          </div>
        ) : (
          <>
            {/* ESCRITORIO: tabla */}
            <div className="rk-card mt-5 hidden overflow-hidden !p-0 xl:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line/10">
                    <tr className="text-[11px] uppercase tracking-wider text-ink/60">
                      <th className="px-5 py-3 font-medium">
                        Creador
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Monto
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Método de pago
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Estado
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Fecha
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Nota
                      </th>
                      <th className="px-5 py-3 text-right font-medium">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line/10">
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium">
                            {withdrawal.creator.name ||
                              "Sin nombre"}
                          </p>

                          <p className="mt-1 text-xs text-ink/60">
                            {withdrawal.creator.email}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-top font-semibold tabular-nums">
                          {formatMoney(Number(withdrawal.amount))}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <PaymentMethodDetails
                            method={withdrawal.paymentMethod}
                          />
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span
                            className={`rk-badge ${
                              statusBadges[withdrawal.status]
                            }`}
                          >
                            {statusLabels[withdrawal.status]}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-top text-ink/60">
                          {formatDate(withdrawal.createdAt)}

                          {/* Solo si el registro tiene fecha real. */}
                          {withdrawal.processedAt && (
                            <span className="mt-1 block text-xs text-ink/60">
                              Procesado{" "}
                              {formatDate(withdrawal.processedAt)}
                            </span>
                          )}
                        </td>

                        <td className="max-w-[16rem] px-5 py-4 align-top text-ink/60">
                          {withdrawal.note || "—"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex justify-end">
                            <Actions withdrawal={withdrawal} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/*
              MÓVIL Y TABLET: la misma información en tarjetas.
              La tabla llegaba a 1300 px y desbordaba la pantalla.
            */}
            <div className="mt-5 space-y-2.5 xl:hidden">
              {withdrawals.map((withdrawal) => (
                <article key={withdrawal.id} className="rk-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">
                        {withdrawal.creator.name || "Sin nombre"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-ink/60">
                        {withdrawal.creator.email}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {formatMoney(Number(withdrawal.amount))}
                      </p>

                      <span
                        className={`rk-badge mt-1 ${
                          statusBadges[withdrawal.status]
                        }`}
                      >
                        {statusLabels[withdrawal.status]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-rk-sm bg-ink/[0.03] p-3.5">
                    <PaymentMethodDetails
                      method={withdrawal.paymentMethod}
                    />
                  </div>

                  <p className="mt-3 text-xs text-ink/60">
                    Solicitado el{" "}
                    {formatDate(withdrawal.createdAt)}

                    {withdrawal.processedAt && (
                      <>
                        {" · Procesado el "}
                        {formatDate(withdrawal.processedAt)}
                      </>
                    )}
                  </p>

                  {withdrawal.note && (
                    <p className="mt-2 text-xs leading-5 text-ink/60">
                      {withdrawal.note}
                    </p>
                  )}

                  <div className="mt-4 border-t border-line/10 pt-3.5">
                    <Actions withdrawal={withdrawal} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
