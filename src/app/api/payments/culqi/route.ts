import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const orderId = String(body.orderId || "");

    if (!orderId) {
      return NextResponse.json(
        { error: "Falta el ID del pedido." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.userId,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Este pedido ya no está pendiente." },
        { status: 400 }
      );
    }

    const secretKey = process.env.CULQI_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "CULQI_SECRET_KEY no está configurada." },
        { status: 500 }
      );
    }

    const amount = Math.round(Number(order.total) * 100);

    const response = await fetch(
      "https://api.culqi.com/v2/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency_code: "PEN",
          description: `Pedido RcktX ${order.id}`,
          client_details: {
            first_name: String(session.name || "Cliente"),
            email: String(session.email),
          },
          metadata: {
            rcktdmgOrderId: order.id,
            userId: session.userId,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error Culqi:", data);

      return NextResponse.json(
        {
          error:
            data?.user_message ||
            data?.merchant_message ||
            "No se pudo crear la orden de Culqi.",
        },
        { status: response.status }
      );
    }

    await prisma.payment.upsert({
      where: {
        orderId: order.id,
      },
      update: {
        provider: "CULQI",
        amount: order.total,
        status: "PENDING",
        transactionId: data.id,
      },
      create: {
        orderId: order.id,
        provider: "CULQI",
        amount: order.total,
        status: "PENDING",
        transactionId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      culqiOrderId: data.id,
      amount,
    });
  } catch (error) {
    console.error("Error creando orden Culqi:", error);

    return NextResponse.json(
      {
        error: "No se pudo preparar el pago.",
      },
      { status: 500 }
    );
  }
}