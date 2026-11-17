"use client";

import { CheckCircle2, LogOut, Minus, Plus, Settings, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import { logout, recordSale } from "@/app/pos/actions";
import { AppHeader } from "@/components/app-shell/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/pos/auth";
import {
  formatMoney,
  formatTime,
  MAX_QTY,
  parseMoney,
  type Payment,
  PAYMENTS,
  roundMoney,
  type Sale,
  type Service,
} from "@/lib/pos/types";
import { cn } from "@/lib/utils";

type CartLine = { key: number; item: string; qty: number; price: string };

function SectionTitle({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{children}</p>;
}

export function PosHeaderActions({
  role,
  onAdminPage = false,
  base = "/pos",
  logoutAction = logout,
}: {
  role: Role;
  onAdminPage?: boolean;
  /** The tool these buttons belong to; the Sari-Sari Store passes its own. */
  base?: string;
  logoutAction?: () => Promise<void>;
}) {
  return (
    <>
      <span
        className={cn(
          "hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline",
          role === "admin" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700",
        )}
      >
        {role === "admin" ? "Admin" : "Cashier"}
      </span>
      {role === "admin" ? (
        <Button asChild variant="outline">
          {onAdminPage ? (
            <Link href={base}>
              <ShoppingCart />
              <span className="hidden sm:inline">Enter sales</span>
            </Link>
          ) : (
            <Link href={`${base}/admin`}>
              <Settings />
              <span className="hidden sm:inline">Manage</span>
            </Link>
          )}
        </Button>
      ) : null}
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" title="Log out">
          <LogOut />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </form>
    </>
  );
}

export function PosRegister({
  role,
  services,
  todaySales,
  loadError,
}: {
  role: Role;
  services: Service[];
  todaySales: Sale[];
  loadError: string;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [payment, setPayment] = useState<Payment>("Cash");
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [received, setReceived] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ receipt: string; total: number; change: number | null } | null>(null);
  // Sales recorded since the page loaded, so the list updates without a reload.
  const [recorded, setRecorded] = useState<Sale[]>([]);
  const [pending, startTransition] = useTransition();

  const lineTotal = (line: CartLine) => roundMoney(line.qty * (parseMoney(line.price) || 0));
  const total = roundMoney(cart.reduce((sum, line) => sum + lineTotal(line), 0));
  const receivedAmount = parseMoney(received);
  const change = payment === "Cash" && Number.isFinite(receivedAmount) ? roundMoney(receivedAmount - total) : null;

  const loadedIds = new Set(todaySales.map((s) => s.id));
  const today = [...recorded.filter((s) => !loadedIds.has(s.id)), ...todaySales].sort((a, b) =>
    b.soldAt.localeCompare(a.soldAt),
  );
  const todayTotal = roundMoney(today.reduce((sum, s) => sum + s.total, 0));
  const todayReceipts = new Set(today.map((s) => s.receipt)).size;

  function addItem(item: string, price: number) {
    setDone(null);
    setError("");
    const priceText = String(price);
    const existing = cart.find((line) => line.item === item && line.price === priceText);
    if (existing) {
      setCart(cart.map((line) => (line === existing ? { ...line, qty: Math.min(MAX_QTY, line.qty + 1) } : line)));
    } else {
      setCart([...cart, { key: nextKey, item, qty: 1, price: priceText }]);
      setNextKey(nextKey + 1);
    }
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    const name = customName.trim();
    const price = parseMoney(customPrice);
    if (!name || !Number.isFinite(price) || price < 0) {
      setError("Type the item name and its price first.");
      return;
    }
    addItem(name, price);
    setCustomName("");
    setCustomPrice("");
  }

  const update = (key: number, changes: Partial<CartLine>) =>
    setCart(cart.map((line) => (line.key === key ? { ...line, ...changes } : line)));

  function submit() {
    setError("");
    const lines = cart.map((line) => ({ item: line.item, qty: line.qty, price: parseMoney(line.price) }));
    const bad = lines.find((line) => !Number.isFinite(line.price) || line.price < 0);
    if (bad) {
      setError(`Type a price for ${bad.item}.`);
      return;
    }
    if (change !== null && change < 0) {
      setError("The cash received is less than the total.");
      return;
    }
    startTransition(async () => {
      const result = await recordSale({ lines, payment, customer, note });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRecorded((list) => [...result.sales, ...list]);
      setDone({ receipt: result.sales[0]?.receipt ?? "", total, change });
      setCart([]);
      setCustomer("");
      setNote("");
      setReceived("");
      setPayment("Cash");
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef2] text-slate-900 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <AppHeader>
        <PosHeaderActions role={role} />
      </AppHeader>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:min-h-0 lg:flex-row">
        {/* Items to tap, and today's sales */}
        <main className="flex-1 p-4 md:p-6 lg:min-h-0 lg:overflow-y-auto">
          {loadError ? (
            <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {loadError}
            </p>
          ) : null}

          <SectionTitle>Tap to add</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <button
                key={service.name}
                type="button"
                onClick={() => addItem(service.name, service.price)}
                className="flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition outline-none hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-400 active:translate-y-0"
              >
                <span className="text-sm leading-5 font-medium">{service.name}</span>
                <span className="text-sm font-semibold text-emerald-700 tabular-nums">{formatMoney(service.price)}</span>
              </button>
            ))}
          </div>

          <form onSubmit={addCustom} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="custom-name" className="text-xs">Other item</Label>
              <Input id="custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Tarpaulin 2x3" maxLength={100} />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="custom-price" className="text-xs">Price</Label>
              <Input id="custom-price" inputMode="decimal" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="0.00" />
            </div>
            <Button type="submit" variant="secondary">
              <Plus />
              Add
            </Button>
          </form>

          <div className="mt-8 flex items-end justify-between gap-3">
            <SectionTitle>Today&apos;s sales</SectionTitle>
            <p className="text-sm text-slate-500">
              {todayReceipts} {todayReceipts === 1 ? "sale" : "sales"} ·{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(todayTotal)}</span>
            </p>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {today.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No sales yet today.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {today.map((sale) => (
                  <li key={sale.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-16 shrink-0 text-xs text-slate-400 tabular-nums">{formatTime(sale.soldAt)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {sale.item} <span className="text-slate-400">× {sale.qty}</span>
                      {sale.customer ? <span className="text-slate-400"> · {sale.customer}</span> : null}
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{sale.payment}</span>
                    <span className="font-medium tabular-nums">{formatMoney(sale.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* The current sale */}
        <aside className="w-full border-t border-slate-200/80 bg-white lg:flex lg:h-full lg:w-[400px] lg:shrink-0 lg:flex-col lg:border-t-0 lg:border-l">
          <div className="flex-1 space-y-4 p-4 md:p-5 lg:min-h-0 lg:overflow-y-auto">
            <SectionTitle>Current sale</SectionTitle>

            {done ? (
              <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium">Sale saved · {formatMoney(done.total)}</p>
                  <p className="text-emerald-800">
                    Receipt {done.receipt}
                    {done.change !== null ? ` · Change ${formatMoney(done.change)}` : ""}
                  </p>
                </div>
              </div>
            ) : null}

            {cart.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Tap an item to start a sale.
              </p>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => (
                  <li key={line.key} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-5 font-medium">{line.item}</p>
                      <button
                        type="button"
                        aria-label={`Remove ${line.item}`}
                        onClick={() => setCart(cart.filter((l) => l.key !== line.key))}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-9 items-center rounded-lg border border-slate-200">
                        <button type="button" aria-label="Fewer" disabled={line.qty <= 1} onClick={() => update(line.key, { qty: line.qty - 1 })} className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30">
                          <Minus className="size-4" />
                        </button>
                        <input
                          aria-label={`Quantity of ${line.item}`}
                          inputMode="numeric"
                          value={line.qty}
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                            update(line.key, { qty: Number.isNaN(n) ? 1 : Math.min(MAX_QTY, Math.max(1, n)) });
                          }}
                          className="h-full w-12 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
                        />
                        <button type="button" aria-label="More" onClick={() => update(line.key, { qty: Math.min(MAX_QTY, line.qty + 1) })} className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900">
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <span className="text-sm text-slate-400">×</span>
                      <Input
                        aria-label={`Price of ${line.item}`}
                        inputMode="decimal"
                        value={line.price}
                        onChange={(e) => update(line.key, { price: e.target.value })}
                        className="h-9 w-24 text-right tabular-nums"
                      />
                      <span className="ml-auto text-sm font-semibold tabular-nums">{formatMoney(lineTotal(line))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Payment</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                {PAYMENTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={payment === p}
                    onClick={() => setPayment(p)}
                    className={cn(
                      "h-8 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-slate-900",
                      payment === p && "bg-white text-slate-900 shadow-sm",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {payment === "Cash" ? (
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="received" className="text-xs">Cash received (optional)</Label>
                  <Input id="received" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0.00" className="tabular-nums" />
                </div>
                <div className="pb-2 text-right">
                  <p className="text-xs text-slate-500">Change</p>
                  <p className={cn("text-sm font-semibold tabular-nums", change !== null && change < 0 && "text-red-600")}>
                    {change === null ? "—" : formatMoney(change)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer" className="text-xs">Customer (optional)</Label>
                <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-xs">Note (optional)</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 space-y-3 border-t border-slate-200 bg-white p-4 md:p-5">
            {error ? (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(total)}</span>
            </div>
            <Button type="button" size="lg" className="w-full" disabled={cart.length === 0 || pending} onClick={submit}>
              {pending ? "Saving…" : "Save sale"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
