import { Prisma } from "@prisma/client";

/** Política única para acreditar pedidos y emitir licencias. */
export function pagoAprobadoParaPedido(
  payment: {
    status: string;
    provider: string;
    amount: Prisma.Decimal;
  } | null | undefined,
  total: Prisma.Decimal,
  environment: string | undefined = process.env.NODE_ENV
): boolean {
  return Boolean(
    payment &&
      payment.status === "APPROVED" &&
      payment.amount.equals(total) &&
      (payment.provider !== "TEST" || environment === "development")
  );
}
