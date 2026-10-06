"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, RefreshCw, Smartphone } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

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
  createdAt: string;
};

const typeLabels: Record<PaymentMethodType, string> = {
  BANK: "Cuenta bancaria",
  YAPE: "Yape",
  PLIN: "Plin",
};

export default function MetodosPagoPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [type, setType] = useState<PaymentMethodType>("BANK");
  const [holderName, setHolderName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cci, setCci] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  async function loadMethods() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/creadores/metodos-pago", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los métodos de pago"
        );
      }

      setMethods(data.paymentMethods || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los métodos de pago"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/creadores/metodos-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          holderName,
          documentNumber,
          bankName,
          accountNumber,
          cci,
          phone,
          isDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo registrar el método de pago"
        );
      }

      setSuccess("Método de pago registrado correctamente.");

      setHolderName("");
      setDocumentNumber("");
      setBankName("");
      setAccountNumber("");
      setCci("");
      setPhone("");

      await loadMethods();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al registrar el método de pago"
      );
    } finally {
      setSaving(false);
    }
  }

  const isBank = type === "BANK";

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up">
          <p className="rk-eyebrow">Creator Studio</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Métodos de pago
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
            Registra dónde quieres recibir tus retiros.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rk-upload-error rk-fade mt-6"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rk-fade mt-6 rounded-rk-md border border-success/25 bg-success/10 px-5 py-4 text-sm text-success"
          >
            {success}
          </div>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.1fr]">

          {/* ========== NUEVO MÉTODO ========== */}
          <section className="rk-fade-up rk-enter-1">
            <p className="rk-eyebrow">Nuevo</p>

            <h2 className="rk-title mt-2 text-xl">
              Agregar método
            </h2>

            <div className="rk-divider mt-3" />

            <form
              onSubmit={handleSubmit}
              className="rk-card mt-4 space-y-5 p-5 sm:p-6"
            >
              <div>
                <label
                  htmlFor="type"
                  className="rk-label mb-2 block"
                >
                  Tipo de método
                </label>

                <select
                  id="type"
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as PaymentMethodType
                    )
                  }
                  className="rk-select w-full"
                >
                  <option value="BANK">Cuenta bancaria</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="holderName"
                  className="rk-label mb-2 block"
                >
                  Titular
                </label>

                <input
                  id="holderName"
                  value={holderName}
                  onChange={(event) =>
                    setHolderName(event.target.value)
                  }
                  required
                  className="rk-input w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="documentNumber"
                  className="rk-label mb-2 block"
                >
                  DNI o RUC
                </label>

                <input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(event.target.value)
                  }
                  required
                  className="rk-input w-full"
                />
              </div>

              {/* Campos bancarios: solo cuando corresponden. */}
              {isBank ? (
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="bankName"
                      className="rk-label mb-2 block"
                    >
                      Banco
                    </label>

                    <input
                      id="bankName"
                      value={bankName}
                      onChange={(event) =>
                        setBankName(event.target.value)
                      }
                      required
                      className="rk-input w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="accountNumber"
                      className="rk-label mb-2 block"
                    >
                      Número de cuenta
                    </label>

                    <input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(event) =>
                        setAccountNumber(event.target.value)
                      }
                      required
                      className="rk-input w-full"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cci"
                      className="rk-label mb-2 block"
                    >
                      CCI
                    </label>

                    <input
                      id="cci"
                      value={cci}
                      onChange={(event) =>
                        setCci(event.target.value)
                      }
                      required
                      className="rk-input w-full"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="phone"
                    className="rk-label mb-2 block"
                  >
                    Número de celular
                  </label>

                  <input
                    id="phone"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    required
                    className="rk-input w-full"
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-rk-md border border-line/10 p-4 transition-colors duration-fast ease-rk hover:border-line/25">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) =>
                    setIsDefault(event.target.checked)
                  }
                  className="h-4 w-4 accent-[rgb(var(--rk-foreground))]"
                />

                <span className="text-sm text-ink/60">
                  Usar como método predeterminado
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rk-btn rk-btn-primary w-full"
              >
                {saving ? "Guardando..." : "Guardar método de pago"}
              </button>
            </form>
          </section>

          {/* ========== MÉTODOS REGISTRADOS ========== */}
          <section className="rk-fade-up rk-enter-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="rk-eyebrow">Registrados</p>

                <h2 className="rk-title mt-2 text-xl">
                  Tus métodos
                </h2>
              </div>

              <button
                type="button"
                onClick={loadMethods}
                disabled={loading}
                className="rk-press inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-75 disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>

            <div className="rk-divider mt-3" />

            {loading ? (
              <div className="mt-4 space-y-2.5" aria-busy="true">
                {[0, 1].map((index) => (
                  <div key={index} className="rk-card p-5">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-ink/[0.06]" />
                    <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-ink/[0.05]" />
                  </div>
                ))}
              </div>
            ) : methods.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={CreditCard}
                  title="Todavía no tienes métodos de pago"
                  description="Registra una cuenta bancaria, Yape o Plin para poder solicitar retiros."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {methods.map((method) => (
                  <article key={method.id} className="rk-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden
                          className="rk-icon-tile h-10 w-10"
                        >
                          {method.type === "BANK" ? (
                            <CreditCard size={18} />
                          ) : (
                            <Smartphone size={18} />
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold">
                              {typeLabels[method.type]}
                            </h3>

                            {method.isDefault && (
                              <span className="rk-badge rk-badge-accent">
                                Predeterminado
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-ink/60">
                            {method.holderName}
                          </p>

                          <p className="mt-0.5 text-xs text-ink/60">
                            DNI/RUC: {method.documentNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Datos tal como los devuelve la API. */}
                    <dl className="mt-4 rounded-rk-sm bg-ink/[0.03] p-4 text-sm">
                      {method.type === "BANK" ? (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <dt className="text-ink/60">Banco:</dt>
                            <dd className="font-medium">
                              {method.bankName}
                            </dd>
                          </div>

                          <div className="flex gap-2">
                            <dt className="text-ink/60">Cuenta:</dt>
                            <dd className="font-medium tabular-nums">
                              {method.accountNumber}
                            </dd>
                          </div>

                          <div className="flex gap-2">
                            <dt className="text-ink/60">CCI:</dt>
                            <dd className="font-medium tabular-nums">
                              {method.cci}
                            </dd>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <dt className="text-ink/60">Celular:</dt>
                          <dd className="font-medium tabular-nums">
                            {method.phone}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
