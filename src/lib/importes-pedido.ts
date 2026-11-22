import { Prisma } from "@prisma/client";

type Linea = { price: Prisma.Decimal; quantity: number };

/** Comprueba los importes sin depender de la base de datos. */
export function importesDePedidoValidos(
  lineas: Linea[],
  subtotal: Prisma.Decimal,
  descuento: Prisma.Decimal,
  total: Prisma.Decimal
): boolean {
  if (lineas.length === 0 || descuento.lt(0) || total.lt(0)) return false;
  if (lineas.some((linea) =>
    !Number.isSafeInteger(linea.quantity) ||
    linea.quantity < 1 ||
    linea.price.lt(0)
  )) return false;

  const suma = lineas.reduce(
    (acumulado, linea) => acumulado.add(linea.price.mul(linea.quantity)),
    new Prisma.Decimal(0)
  );
  return suma.equals(subtotal) && suma.sub(descuento).equals(total);
}
