"use client";

import { FormEvent, useEffect, useState } from "react";

type WithdrawalStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
type PaymentMethodType = "BANK" | "YAPE" | "PLIN";

type PaymentMethod = {
  id: string;
  type: PaymentMethodType;
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
  amount: number;
  status: WithdrawalStatus;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
};

type FinancialData = {
  summary: {
    totalEarnings: number;
    withdrawnAmount: number;
    pendingAmount: number;
    availableBalance: number;
  };
  withdrawals: Withdrawal[];
};

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

function getStatusLabel(status: WithdrawalStatus) {
  switch (status) {
    case "REQUESTED":
      return "Pendiente";
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
    case "PAID":
      return "Pagado";
    default:
      return status;
  }
}

function getStatusClass(status: WithdrawalStatus) {
  switch (status) {
    case "REQUESTED":
      return "bg-warning/12 text-warning";
    case "APPROVED":
      return "bg-accent/12 text-accent";
    case "REJECTED":
      return "bg-danger/10 text-danger";
    case "PAID":
      return "bg-success/12 text-success";
    default:
      return "bg-ink/[0.05] text-ink";
  }
}

export default function RetirosPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");

  async function loadWithdrawals() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/creadores/retiros", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudieron cargar los retiros");
      }

      setData(result);
      const paymentResponse = await fetch(
        "/api/creadores/metodos-pago",
        {
          cache: "no-store",
        }
      );

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentResult.error ||
          "No se pudieron cargar los métodos de pago"
        );
      }

      const loadedMethods: PaymentMethod[] =
        paymentResult.paymentMethods || [];

      setPaymentMethods(loadedMethods);

      const defaultMethod = loadedMethods.find(
        (method) => method.isDefault
      );

      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else if (loadedMethods.length > 0) {
        setSelectedPaymentMethodId(loadedMethods[0].id);
      }
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    if (numericAmount < 50) {
      setError("El retiro mínimo es de S/ 50.00.");
      return;
    }
    if (!selectedPaymentMethodId) {
      setError("Selecciona un método de pago.");
      return;
    }
    try {
      setSubmitting(true);

      const response = await fetch("/api/creadores/retiros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          paymentMethodId: selectedPaymentMethodId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo solicitar el retiro");
      }

      setAmount("");
      setMessage("Tu solicitud de retiro fue enviada correctamente.");

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al solicitar el retiro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ink/[0.05] p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rk-card p-8">
            <p className="text-sm text-ink/50">
              Cargando información de retiros...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-ink/[0.05] p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rk-card p-8">
            <p className="text-danger">
              {error || "No se pudo cargar la información."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { summary, withdrawals } = data;

  return (
    <main className="min-h-screen bg-ink/[0.05] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Retiros y ganancias
          </h1>

          <p className="mt-1 text-sm text-ink/50">
            Administra tus ganancias y solicita el retiro de tu saldo disponible.
          </p>
        </div>

        {/* Resumen */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Ganancias totales</p>
            <p className="mt-2 text-2xl font-bold text-ink">
              {formatMoney(summary.totalEarnings)}
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Total retirado</p>
            <p className="mt-2 text-2xl font-bold text-ink">
              {formatMoney(summary.withdrawnAmount)}
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="text-sm text-ink/50">Pendiente de retiro</p>
            <p className="mt-2 text-2xl font-bold text-warning">
              {formatMoney(summary.pendingAmount)}
            </p>
          </div>

          <div className="rounded-2xl border border-success/25 bg-success/12 p-5 shadow-sm">
            <p className="text-sm text-success">Saldo disponible</p>
            <p className="mt-2 text-2xl font-bold text-success">
              {formatMoney(summary.availableBalance)}
            </p>
          </div>
        </section>

        {/* Solicitar retiro */}
        <section className="rk-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-ink">
              Solicitar retiro
            </h2>

            <p className="mt-1 text-sm text-ink/50">
              El monto mínimo para solicitar un retiro es de S/ 50.00.
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-xl border border-success/25 bg-success/12 px-4 py-3 text-sm text-success">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="paymentMethod"
                className="mb-2 block text-sm font-medium text-ink/70"
              >
                Método para recibir el pago
              </label>

              {paymentMethods.length === 0 ? (
                <div className="rounded-xl border border-warning/25 bg-warning/12 px-4 py-3 text-sm text-warning">
                  No tienes métodos de pago registrados. Registra uno antes de
                  solicitar un retiro.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`block cursor-pointer rounded-xl border p-4 transition ${selectedPaymentMethodId === method.id
                          ? "border-primary bg-ink/[0.05]"
                          : "border-ink/10 bg-surface hover:border-ink/25"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethodId === method.id}
                          onChange={() =>
                            setSelectedPaymentMethodId(method.id)
                          }
                          disabled={submitting}
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-ink">
                              {method.type === "BANK"
                                ? "Cuenta bancaria"
                                : method.type === "YAPE"
                                  ? "Yape"
                                  : "Plin"}
                            </p>

                            {method.isDefault && (
                              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-onprimary">
                                Predeterminado
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-ink/70">
                            {method.holderName}
                          </p>

                          <p className="mt-1 text-xs text-ink/50">
                            DNI/RUC: {method.documentNumber}
                          </p>

                          {method.type === "BANK" ? (
                            <div className="mt-2 text-xs text-ink/50">
                              <p>Banco: {method.bankName}</p>
                              <p>Cuenta: {method.accountNumber}</p>
                              <p>CCI: {method.cci}</p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-ink/50">
                              Celular: {method.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-xs">
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm font-medium text-ink/70"
                >
                  Monto a retirar
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">
                    S/
                  </span>

                  <input
                    id="amount"
                    type="number"
                    min="50"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="50.00"
                    disabled={
                      submitting ||
                      summary.availableBalance < 50 ||
                      paymentMethods.length === 0
                    }
                    className="w-full rounded-xl border border-ink/10 py-3 pl-10 pr-3 outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/20 disabled:bg-ink/[0.05]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  summary.availableBalance < 50 ||
                  !amount ||
                  !selectedPaymentMethodId ||
                  paymentMethods.length === 0
                }
                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-onprimary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Solicitar retiro"}
              </button>
            </div>
          </form>

          {summary.availableBalance < 50 && (
            <p className="mt-3 text-sm text-ink/50">
              Necesitas tener al menos S/ 50.00 disponibles para solicitar un
              retiro.
            </p>
          )}
        </section>

        {/* Historial */}
        <section className="rk-card">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-ink">
              Historial de retiros
            </h2>
          </div>

          {withdrawals.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-ink/50">
                Todavía no tienes solicitudes de retiro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b bg-ink/[0.05] text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-6 py-4 font-semibold">Fecha</th>
                    <th className="px-6 py-4 font-semibold">Monto</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 font-semibold">Nota</th>
                    <th className="px-6 py-4 font-semibold">
                      Procesado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 text-sm text-ink/70">
                        {formatDate(withdrawal.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-ink">
                        {formatMoney(withdrawal.amount)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            withdrawal.status
                          )}`}
                        >
                          {getStatusLabel(withdrawal.status)}
                        </span>
                      </td>

                      <td className="max-w-xs px-6 py-4 text-sm text-ink/50">
                        {withdrawal.note || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-ink/50">
                        {withdrawal.processedAt
                          ? formatDate(withdrawal.processedAt)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}