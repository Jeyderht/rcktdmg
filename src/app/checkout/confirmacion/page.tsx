import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pagoAprobadoParaPedido } from "@/lib/pago-validado";
import { importesDePedidoValidos } from "@/lib/importes-pedido";
import ConfirmationContent from "./ConfirmationContent";

export default async function ConfirmationPage({ searchParams }: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const { order: id } = await searchParams;
  if (!id || typeof id !== "string") notFound();
  const session = await getSession();
  if (!session) redirect("/login?redirect=" + encodeURIComponent("/checkout/confirmacion?order=" + id));

  const order = await prisma.order.findFirst({
    where: { id, userId: session.userId },
    include: { payment: true, items: true },
  });
  if (!order) notFound();
  const paid = order.status === "PAID" && pagoAprobadoParaPedido(order.payment, order.total)
    && importesDePedidoValidos(order.items, order.subtotal, order.discount, order.total);
  if (!paid && order.status !== "PENDING") redirect("/mi-cuenta/compras");

  const purchased = order.items.map(item => item.packId ? `PACK:${item.packId}`
    : item.commercialCollectionId ? `COLLECTION:${item.commercialCollectionId}` : `PRODUCT:${item.productId}`);
  return <ConfirmationContent key={id} orderId={id} initialPaid={paid} purchased={purchased} total={order.total.toFixed(2)} />;
}
