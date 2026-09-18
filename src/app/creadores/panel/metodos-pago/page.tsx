"use client";

import { FormEvent, useEffect, useState } from "react";

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

  return (
    <main className="min-h-screen bg-ink/[0.05] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-ink/50">
            Panel del creador
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Métodos de pago
          </h1>

          <p className="mt-2 text-ink/60">
            Registra la cuenta o número donde deseas recibir tus retiros.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-success/25 bg-success/12 px-5 py-4 text-sm text-success">
            {success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section className="rk-card p-6">
            <h2 className="text-xl font-semibold text-ink">
              Agregar método
            </h2>

            <p className="mt-1 text-sm text-ink/50">
              Completa los datos correctamente para poder recibir tus pagos.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/70">
                  Método de pago
                </label>

                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as PaymentMethodType)
                  }
                  className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm outline-none focus:border-ink"
                >
                  <option value="BANK">Cuenta bancaria</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/70">
                  Nombre del titular
                </label>

                <input
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  placeholder="Nombre completo"
                  required
                  className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/70">
                  DNI / RUC
                </label>

                <input
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(event.target.value)
                  }
                  placeholder="Número de documento"
                  required
                  className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                />
              </div>

              {type === "BANK" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink/70">
                      Banco
                    </label>

                    <input
                      value={bankName}
                      onChange={(event) =>
                        setBankName(event.target.value)
                      }
                      placeholder="Ej. BCP, Interbank, BBVA"
                      required
                      className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink/70">
                      Número de cuenta
                    </label>

                    <input
                      value={accountNumber}
                      onChange={(event) =>
                        setAccountNumber(event.target.value)
                      }
                      placeholder="Número de cuenta"
                      required
                      className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink/70">
                      CCI
                    </label>

                    <input
                      value={cci}
                      onChange={(event) => setCci(event.target.value)}
                      placeholder="Código de cuenta interbancario"
                      required
                      className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                  </div>
                </>
              )}

              {(type === "YAPE" || type === "PLIN") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink/70">
                    Número de celular
                  </label>

                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="999 999 999"
                    required
                    className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-ink"
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 p-4">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) =>
                    setIsDefault(event.target.checked)
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm text-ink/70">
                  Usar como método de pago predeterminado
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-onprimary transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar método de pago"}
              </button>
            </form>
          </section>

          <section className="rk-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Mis métodos
                </h2>

                <p className="mt-1 text-sm text-ink/50">
                  Métodos registrados para recibir tus retiros.
                </p>
              </div>

              <button
                type="button"
                onClick={loadMethods}
                disabled={loading}
                className="rounded-full border border-ink/10 px-4 py-2 text-xs font-medium transition hover:bg-primary hover:text-onprimary disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="py-10 text-center text-sm text-ink/50">
                  Cargando métodos...
                </div>
              ) : methods.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink/10 px-5 py-10 text-center">
                  <p className="text-sm text-ink/50">
                    Todavía no tienes métodos de pago registrados.
                  </p>
                </div>
              ) : (
                methods.map((method) => (
                  <div
                    key={method.id}
                    className="rounded-2xl border border-ink/10 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ink">
                            {typeLabels[method.type]}
                          </h3>

                          {method.isDefault && (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-onprimary">
                              Predeterminado
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-ink/70">
                          {method.holderName}
                        </p>

                        <p className="mt-1 text-xs text-ink/50">
                          DNI/RUC: {method.documentNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-ink/[0.05] p-4 text-sm">
                      {method.type === "BANK" ? (
                        <div className="space-y-1">
                          <p>
                            <span className="font-medium">Banco:</span>{" "}
                            {method.bankName}
                          </p>

                          <p>
                            <span className="font-medium">Cuenta:</span>{" "}
                            {method.accountNumber}
                          </p>

                          <p>
                            <span className="font-medium">CCI:</span>{" "}
                            {method.cci}
                          </p>
                        </div>
                      ) : (
                        <p>
                          <span className="font-medium">Celular:</span>{" "}
                          {method.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}