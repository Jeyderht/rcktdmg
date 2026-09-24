"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
    CART_STORAGE_KEY,
    CART_UPDATED_EVENT,
} from "@/components/useCartCount";

type CartItem = {
    id: string;
    /**
     * "PACK" para los packs. Ausente en los elementos que ya
     * estaban guardados, que son recursos sueltos.
     */
    kind?: "PRODUCT" | "PACK";
    name: string;
    price: number;
    slug: string;
    coverUrl: string | null;
    quantity: number;
};

export default function Cart() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    function loadCart() {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);

            const parsed = stored ? JSON.parse(stored) : [];

            setCart(Array.isArray(parsed) ? parsed : []);
        } catch {
            setCart([]);
        } finally {
            setLoaded(true);
        }
    }

    useEffect(() => {
        loadCart();

        window.addEventListener(CART_UPDATED_EVENT, loadCart);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, loadCart);
        };
    }, []);

    function saveCart(newCart: CartItem[]) {
        setCart(newCart);

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(newCart)
        );

        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }

    function increase(id: string) {
        saveCart(
            cart.map((item) =>
                item.id === id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    }

    function decrease(id: string) {
        saveCart(
            cart
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    function remove(id: string) {
        saveCart(cart.filter((item) => item.id !== id));
    }

    function clearCart() {
        saveCart([]);
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const units = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    if (!loaded) {
        return (
            <>
                <Navbar />

                <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-5">
                    <div className="rk-card h-32 animate-pulse" />
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

                {/* ENCABEZADO */}
                <div className="rk-enter flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="rk-eyebrow">RCKTDMG</p>

                        <h1 className="rk-title mt-2 text-[2rem] sm:text-4xl">
                            Carrito
                        </h1>

                        {cart.length > 0 && (
                            <p className="mt-2 text-sm text-ink/60">
                                {units}{" "}
                                {units === 1 ? "artículo" : "artículos"}
                            </p>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="rk-chip"
                        >
                            <Trash2 size={13} />
                            Vaciar carrito
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    /* CARRITO VACÍO */
                    <div className="mt-6">
                        <EmptyState
                            icon={ShoppingBag}
                            title="Tu carrito está vacío"
                            description="Agrega un recurso para comenzar."
                            action={{
                                href: "/tienda",
                                label: "Explorar recursos",
                            }}
                        />
                    </div>
                ) : (
                    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">

                        {/* ARTÍCULOS */}
                        <div className="rk-enter rk-enter-1 space-y-3">
                            {cart.map((item) => (
                                <div
                                    key={item.id}
                                    className="rk-card flex gap-4 p-4"
                                >
                                    <Link
                                        href={`/tienda/${item.slug}`}
                                        className="rk-press-sm shrink-0"
                                        aria-label={item.name}
                                    >
                                        {/* Contenido visual 9:16, siempre nítido. */}
                                        <div className="rk-media rk-aspect-product relative w-16 overflow-hidden rounded-rk-sm sm:w-[4.5rem]">
                                            {item.coverUrl ? (
                                                <Image
                                                    src={item.coverUrl}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="72px"
                                                />
                                            ) : (
                                                <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-ink/45">
                                                    RK
                                                </span>
                                            )}
                                        </div>
                                    </Link>

                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link
                                                href={`/tienda/${item.slug}`}
                                                className="min-w-0"
                                            >
                                                <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug transition-opacity hover:opacity-70">
                                                    {item.name}
                                                </h2>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => remove(item.id)}
                                                aria-label={`Quitar ${item.name}`}
                                                className="rk-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-danger/10 hover:text-danger"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        <p className="mt-1 text-sm text-ink/60">
                                            S/ {item.price.toFixed(2)} c/u
                                        </p>

                                        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                                            {/* CANTIDAD */}
                                            <div className="flex items-center gap-1 rounded-full bg-ink/[0.05] p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => decrease(item.id)}
                                                    aria-label="Reducir cantidad"
                                                    className="rk-press flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink/70 shadow-rk-sm"
                                                >
                                                    <Minus size={13} />
                                                </button>

                                                <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => increase(item.id)}
                                                    aria-label="Aumentar cantidad"
                                                    className="rk-press flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink/70 shadow-rk-sm"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>

                                            <p className="text-[15px] font-semibold">
                                                S/{" "}
                                                {(
                                                    item.price * item.quantity
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RESUMEN */}
                        <div className="rk-enter rk-enter-2 lg:sticky lg:top-24 lg:self-start">
                            <div className="rk-glass rounded-rk-lg p-5 sm:p-6">
                                <h2 className="text-sm font-semibold">
                                    Resumen del pedido
                                </h2>

                                {/* Solo importes reales: no hay
                                    descuentos ni impuestos calculados. */}
                                <div className="mt-5 space-y-2.5 text-sm">
                                    <div className="flex justify-between text-ink/60">
                                        <span>Subtotal</span>

                                        <span className="tabular-nums">
                                            S/ {total.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-ink/60">
                                        <span>
                                            {units}{" "}
                                            {units === 1
                                                ? "artículo"
                                                : "artículos"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-baseline justify-between border-t border-line/10 pt-5">
                                    <span className="text-sm font-medium">
                                        Total
                                    </span>

                                    <span className="text-2xl font-semibold tracking-tight">
                                        S/ {total.toFixed(2)}
                                    </span>
                                </div>

                                <Link
                                    href="/checkout"
                                    className="rk-btn rk-btn-primary mt-6 w-full !py-3.5"
                                >
                                    Ir al pago
                                    <ArrowRight size={16} />
                                </Link>

                                <Link
                                    href="/tienda"
                                    className="rk-btn rk-btn-glass mt-2.5 w-full !py-3"
                                >
                                    Seguir explorando
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </>
    );
}
