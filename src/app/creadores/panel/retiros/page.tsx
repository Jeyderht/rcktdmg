"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Wallet } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

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

/** Mínimo real que valida el formulario. */
const MINIMUM_WITHDRAWAL = 50;

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

function getStatusBadge(status: WithdrawalStatus) {
  switch (status) {
    case "REQUESTED":
      return "rk-badge-warning";
    case "APPROVED":
      return "rk-badge-accent";
    case "REJECTED":
      return "rk-badge-danger";
    case "PAID":
      return "rk-badge-success";
    default:
      return "rk-badge-neutral";
  }
}

function getMethodLabel(type: PaymentMethodType) {
  return type === "BANK"
    ? "Cuenta bancaria"
    : type === "YAPE"
      ? "Yape"
      : "Plin";
}

export default function RetirosPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethod[]
  >([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState("");

  async function loadWithdrawals() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/creadores/retiros", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar los retiros"
        );
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

    if (numericAmount < MINIMUM_WITHDRAWAL) {
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
        throw new Error(
          result.error || "No se pudo solicitar el retiro"
        );
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
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div className="h-4 w-28 animate-pulse rounded-full bg-ink/[0.06]" />
        <div className="mt-5 h-9 w-56 animate-pulse rounded-full bg-ink/[0.06]" />

        <div
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
        >
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rk-card p-5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-ink/[0.06]" />
              <div className="mt-4 h-7 w-24 animate-pulse rounded-full bg-ink/[0.07]" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">
        <div
          role="alert"
          className="rk-upload-error rk-fade"
        >
          <p className="rk-upload-error">
            {error || "No se pudo cargar la información."}
          </p>

          <button
            type="button"
            onClick={loadWithdrawals}
            className="rk-btn rk-btn-primary mt-5 rk-btn-compact"
          >
            Intentar nuevamente
          </button>
        </div>
      </main>
    );
  }

  const { summary, withdrawals } = data;

  const canRequest =
    summary.availableBalance >= MINIMUM_WITHDRAWAL &&
    paymentMethods.length > 0;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up">
          <p className="rk-eyebrow">Creator Studio</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Retiros
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Consulta tu saldo y solicita el retiro de tus
            ganancias.
          </p>
        </header>

        {/* ========== SALDO ========== */}
        <section className="rk-fade-up rk-enter-1 mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <div className="rk-card border-ink/20 bg-ink/[0.04] p-5">
            <p className="rk-eyebrow !text-ink">
              Saldo disponible
            </p>

            <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight text-ink">
              {formatMoney(summary.availableBalance)}
            </p>

            <p className="mt-2 text-xs text-ink/60">
              Listo para retirar
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="rk-eyebrow">Ganancias totales</p>

            <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight">
              {formatMoney(summary.totalEarnings)}
            </p>

            <p className="mt-2 text-xs text-ink/60">
              Desde el inicio
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="rk-eyebrow">Pendiente</p>

            <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight text-warning">
              {formatMoney(summary.pendingAmount)}
            </p>

            <p className="mt-2 text-xs text-ink/60">
              Solicitudes en proceso
            </p>
          </div>

          <div className="rk-card p-5">
            <p className="rk-eyebrow">Retirado</p>

            <p className="mt-3 text-[1.75rem] font-semibold tabular-nums leading-tight tracking-tight">
              {formatMoney(summary.withdrawnAmount)}
            </p>

            <p className="mt-2 text-xs text-ink/60">
              Pagos completados
            </p>
          </div>
        </section>

        {/* ========== SOLICITAR RETIRO ========== */}
        <section className="rk-fade-up rk-enter-2 mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rk-eyebrow">Solicitud</p>

              <h2 className="rk-title mt-2 text-2xl">
                Solicitar retiro
              </h2>
            </div>

            <p className="text-sm text-ink/60">
              Mínimo {formatMoney(MINIMUM_WITHDRAWAL)}
            </p>
          </div>

          <div className="rk-divider mt-4" />

          <div className="rk-card mt-5 p-5 sm:p-6">
            {message && (
              <div
                role="status"
                className="rk-fade mb-5 rounded-rk-sm border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rk-upload-error rk-fade mb-5"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* MÉTODO DE PAGO */}
              <div>
                <p className="mb-2.5 text-sm font-medium">
                  Método para recibir el pago
                </p>

                {paymentMethods.length === 0 ? (
                  <div className="rounded-rk-md border border-dashed border-line/20 p-5 text-center">
                    <span
                      aria-hidden
                      className="mx-auto flex h-11 w-11 items-center justify-center rounded-rk-sm bg-warning/12 text-warning"
                    >
                      <CreditCard size={19} />
                    </span>

                    <p className="mt-3 text-sm text-ink/60">
                      Necesitas un método de pago registrado
                      antes de solicitar un retiro.
                    </p>

                    <Link
                      href="/creadores/panel/metodos-pago"
                      className="rk-btn rk-btn-primary mt-4 rk-btn-compact"
                    >
                      Registrar método de pago
                    </Link>
                  </div>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="Método para recibir el pago"
                    className="space-y-2.5"
                  >
                    {paymentMethods.map((method) => {
                      const selected =
                        selectedPaymentMethodId === method.id;

                      return (
                        <label
                          key={method.id}
                          className={`block cursor-pointer rounded-rk-md border p-4 transition-colors duration-fast ease-rk ${
                            selected
                              ? "border-ink/40 bg-ink/[0.05]"
                              : "border-line/10 hover:border-line/25"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={method.id}
                              checked={selected}
                              onChange={() =>
                                setSelectedPaymentMethodId(
                                  method.id
                                )
                              }
                              disabled={submitting}
                              className="mt-1 accent-[rgb(var(--rk-foreground))]"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                  {getMethodLabel(method.type)}
                                </p>

                                {method.isDefault && (
                                  <span className="rk-badge rk-badge-accent">
                                    Predeterminado
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-ink/60">
                                {method.holderName}
                              </p>

                              <p className="mt-0.5 text-xs text-ink/60">
                                DNI/RUC: {method.documentNumber}
                              </p>

                              {method.type === "BANK" ? (
                                <div className="mt-2 space-y-0.5 text-xs text-ink/60">
                                  <p>Banco: {method.bankName}</p>
                                  <p>
                                    Cuenta: {method.accountNumber}
                                  </p>
                                  <p>CCI: {method.cci}</p>
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-ink/60">
                                  Celular: {method.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MONTO */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-xs">
                  <label
                    htmlFor="amount"
                    className="rk-label mb-2 block"
                  >
                    Monto a retirar
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/60">
                      S/
                    </span>

                    <input
                      id="amount"
                      type="number"
                      min={MINIMUM_WITHDRAWAL}
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="50.00"
                      disabled={submitting || !canRequest}
                      className="rk-input w-full !pl-10 tabular-nums"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting || !canRequest || !amount ||
                    !selectedPaymentMethodId
                  }
                  className="rk-btn rk-btn-primary w-full sm:w-auto"
                >
                  <Wallet size={16} />
                  {submitting ? "Enviando..." : "Solicitar retiro"}
                </button>
              </div>

              {summary.availableBalance < MINIMUM_WITHDRAWAL && (
                <p className="text-sm text-ink/60">
                  Necesitas al menos{" "}
                  {formatMoney(MINIMUM_WITHDRAWAL)} disponibles
                  para solicitar un retiro.
                </p>
              )}
            </form>
          </div>
        </section>

        {/* ========== HISTORIAL ========== */}
        <section className="rk-fade-up mt-10">
          <p className="rk-eyebrow">Historial</p>

          <h2 className="rk-title mt-2 text-2xl">
            Tus solicitudes
          </h2>

          <div className="rk-divider mt-4" />

          {withdrawals.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={Wallet}
                title="Todavía no tienes retiros"
                description="Cuando solicites un retiro verás aquí su estado y su fecha de proceso."
              />
            </div>
          ) : (
            <div className="rk-card rk-divider-y mt-5 px-4 sm:px-6">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold tabular-nums">
                        {formatMoney(withdrawal.amount)}
                      </p>

                      <span
                        className={`rk-badge ${getStatusBadge(
                          withdrawal.status
                        )}`}
                      >
                        {getStatusLabel(withdrawal.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-ink/60">
                      Solicitado el{" "}
                      {formatDate(withdrawal.createdAt)}

                      {/* Solo si el registro tiene fecha real. */}
                      {withdrawal.processedAt && (
                        <>
                          {" · Procesado el "}
                          {formatDate(withdrawal.processedAt)}
                        </>
                      )}
                    </p>

                    {/* La nota solo existe si el admin la escribió. */}
                    {withdrawal.note && (
                      <p className="mt-1.5 max-w-xl text-xs leading-5 text-ink/60">
                        {withdrawal.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
