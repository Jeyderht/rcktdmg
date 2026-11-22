import { Prisma } from "@prisma/client";

/** Redondear el acumulado mantiene la suma exacta incluso en conjuntos de pocos céntimos. */
export function repartirPrecio(total: Prisma.Decimal, productos: { price: Prisma.Decimal }[]) {
  const cero = new Prisma.Decimal(0);
  const suma = productos.reduce((peso, producto) => peso.add(producto.price), cero);
  const iguales = suma.isZero();
  const divisor = iguales ? productos.length : suma;
  let pesoAcumulado = cero;
  let asignado = cero;
  return productos.map(producto => {
    pesoAcumulado = pesoAcumulado.add(iguales ? 1 : producto.price);
    const acumulado = total.mul(pesoAcumulado).div(divisor).toDecimalPlaces(2);
    const parte = acumulado.sub(asignado);
    asignado = acumulado;
    return parte;
  });
}
