"use client";

import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { removeSale, savePriceList, saveSale } from "@/app/pos/actions";
import { AppHeader } from "@/components/app-shell/app-header";
import { PosHeaderActions } from "@/components/pos/pos-register";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SheetsStatus } from "@/lib/pos/store";
import {
  dayKey,
  formatDate,
  formatMoney,
  formatTime,
  parseMoney,
  type Payment,
  PAYMENTS,
  roundMoney,
  type Sale,
  type Service,
  shiftDay,
} from "@/lib/pos/types";
import { cn } from "@/lib/utils";

type Tab = "sales" | "prices";
export type Range = "today" | "week" | "month" | "all" | "custom";

export const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
];

const selectClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** Quotes a CSV cell, and stops a spreadsheet from running it as a formula. */
function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** The first and last day (YYYY-MM-DD) a range covers; empty strings mean no limit. */
export function rangeDays(range: Range, today: string, from: string, to: string): [string, string] {
  if (range === "today") return [today, today];
  if (range === "week") return [shiftDay(today, -6), today];
  if (range === "month") return [`${today.slice(0, 7)}-01`, today];
  return range === "custom" ? [from, to] : ["", ""];
}

/** Downloads a table as a CSV file. */
export function downloadTable(header: string[], rows: (string | number)[][], name: string) {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function PosAdmin({
  sales,
  services,
  today,
  sheets,
  loadError,
  loaded,
}: {
  sales: Sale[];
  services: Service[];
  /** The shop's current day, YYYY-MM-DD. */
  today: string;
  sheets: SheetsStatus;
  loadError: string;
  /** False when the sales couldn't be read, so an empty table isn't mistaken for "no sales". */
  loaded: boolean;
}) {
  const [tab, setTab] = useState<Tab>("sales");

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef2] text-slate-900 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <AppHeader>
        <PosHeaderActions role="admin" onAdminPage />
      </AppHeader>

      <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Manage sales</h1>
              <p className="mt-1 text-sm text-slate-500">{sheets.message}</p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                sheets.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
              )}
            >
              {sheets.connected ? "● Google Sheets connected" : "● Google Sheets not connected"}
            </span>
          </div>

          {loadError ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {loadError}
            </p>
          ) : null}

          <div className="inline-flex gap-1 rounded-lg bg-slate-200/70 p-1">
            {(
              [
                ["sales", "Sales"],
                ["prices", "Price list"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "h-8 rounded-md px-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900",
                  tab === id && "bg-white text-slate-900 shadow-sm",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "sales" ? (
            loaded ? <SalesPanel sales={sales} today={today} /> : null
          ) : (
            <PriceListPanel services={services} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------------------------------- Sales --------------------------------- */

function SalesPanel({ sales, today }: { sales: Sale[]; today: string }) {
  const [range, setRange] = useState<Range>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [payment, setPayment] = useState<"" | Payment>("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState<Sale | null>(null);

  const [start, end] = rangeDays(range, today, from, to);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = sales.filter((s) => {
    const day = dayKey(s.soldAt);
    if (start && day < start) return false;
    if (end && day > end) return false;
    if (payment && s.payment !== payment) return false;
    const haystack = `${s.item} ${s.receipt} ${s.customer} ${s.note} ${s.enteredBy}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  const sum = (list: Sale[]) => roundMoney(list.reduce((n, s) => n + s.total, 0));
  const receipts = new Set(rows.map((s) => s.receipt)).size;
  const items = rows.reduce((n, s) => n + s.qty, 0);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900",
                range === r.id && "bg-slate-900 text-white hover:text-white",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" ? (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" aria-label="To" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        ) : null}
        <select aria-label="Payment" value={payment} onChange={(e) => setPayment(e.target.value as "" | Payment)} className={selectClass}>
          <option value="">All payments</option>
          {PAYMENTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, receipt, customer…" className="pl-9" />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={rows.length === 0}
          onClick={() =>
            downloadTable(
              ["Date", "Time", "Receipt", "Item", "Qty", "Unit Price", "Total", "Payment", "Customer", "Note", "Entered By"],
              rows.map((s) => [dayKey(s.soldAt), formatTime(s.soldAt), s.receipt, s.item, s.qty, s.price, s.total, s.payment, s.customer, s.note, s.enteredBy]),
              `sales-${start || "all"}${end && end !== start ? `-to-${end}` : ""}.csv`,
            )
          }
        >
          <Download />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total sales" value={formatMoney(sum(rows))} hint={`${receipts} ${receipts === 1 ? "receipt" : "receipts"}`} />
        <Stat label="Cash" value={formatMoney(sum(rows.filter((s) => s.payment === "Cash")))} />
        <Stat label="GCash" value={formatMoney(sum(rows.filter((s) => s.payment === "GCash")))} />
        <Stat label="Items sold" value={items.toLocaleString("en-PH")} hint={`${rows.length} ${rows.length === 1 ? "row" : "rows"}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            {sales.length === 0 ? "No sales have been recorded yet." : "No sales match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Customer / note</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {formatDate(s.soldAt)} <span className="text-slate-400">{formatTime(s.soldAt)}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-slate-500">{s.receipt}</td>
                  <td className="px-4 py-2.5 font-medium">{s.item}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.qty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(s.price)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatMoney(s.total)}</td>
                  <td className="px-4 py-2.5">{s.payment}</td>
                  <td className="max-w-56 px-4 py-2.5 text-slate-500">
                    <span className="line-clamp-2">{[s.customer, s.note].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{s.enteredBy}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <button type="button" aria-label={`Edit ${s.item}`} onClick={() => setEditing(s)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" aria-label={`Delete ${s.item}`} onClick={() => setDeleting(s)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? <EditSaleDialog key={editing.id} sale={editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        {deleting ? <DeleteSaleDialog key={deleting.id} sale={deleting} onDone={() => setDeleting(null)} /> : null}
      </Dialog>
    </>
  );
}

function EditSaleDialog({ sale, onDone }: { sale: Sale; onDone: () => void }) {
  const [item, setItem] = useState(sale.item);
  const [qty, setQty] = useState(String(sale.qty));
  const [price, setPrice] = useState(String(sale.price));
  const [payment, setPayment] = useState<string>(sale.payment);
  const [customer, setCustomer] = useState(sale.customer);
  const [note, setNote] = useState(sale.note);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const total = roundMoney((Number(qty) || 0) * (parseMoney(price) || 0));

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveSale(sale.id, { item, qty: Number(qty), price: parseMoney(price), payment, customer, note });
      if (result.ok) onDone();
      else setError(result.message);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit sale</DialogTitle>
        <DialogDescription>
          Receipt {sale.receipt} · {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-item">Item</Label>
          <Input id="edit-item" value={item} onChange={(e) => setItem(e.target.value)} maxLength={100} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-qty">Qty</Label>
            <Input id="edit-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-price">Unit price</Label>
            <Input id="edit-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-payment">Payment</Label>
            <select id="edit-payment" value={payment} onChange={(e) => setPayment(e.target.value)} className={cn(selectClass, "w-full")}>
              {PAYMENTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-customer">Customer</Label>
          <Input id="edit-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-note">Note</Label>
          <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm text-slate-500">
            Total <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(total)}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

function DeleteSaleDialog({ sale, onDone }: { sale: Sale; onDone: () => void }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await removeSale(sale.id);
      if (result.ok) onDone();
      else setError(result.message);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete this sale?</DialogTitle>
        <DialogDescription>
          {sale.item} × {sale.qty} · {formatMoney(sale.total)} · receipt {sale.receipt}. This removes the row for good.
        </DialogDescription>
      </DialogHeader>
      {error ? (
        <p role="alert" className="mb-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={pending} onClick={confirm}>
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </DialogContent>
  );
}

/* -------------------------------- Price list ------------------------------ */

type PriceRow = { key: number; name: string; price: string };

function PriceListPanel({ services }: { services: Service[] }) {
  const [rows, setRows] = useState<PriceRow[]>(() =>
    services.map((s, i) => ({ key: i, name: s.name, price: String(s.price) })),
  );
  const [nextKey, setNextKey] = useState(services.length);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (key: number, changes: Partial<PriceRow>) => {
    setMessage(null);
    setRows(rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  };

  function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const filled = rows.filter((r) => r.name.trim() || r.price.trim());
    const bad = filled.find((r) => !Number.isFinite(parseMoney(r.price)));
    if (bad) {
      setMessage({ ok: false, text: `Type a price for ${bad.name.trim() || "the unnamed item"}.` });
      return;
    }
    startTransition(async () => {
      const result = await savePriceList(filled.map((r) => ({ name: r.name, price: parseMoney(r.price) })));
      setMessage(result.ok ? { ok: true, text: "Price list saved." } : { ok: false, text: result.message });
    });
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <p className="text-sm text-slate-500">
        These are the buttons the cashier taps. The cashier can still change a price or add another item during a sale.
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <Input aria-label="Item name" value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} placeholder="Item name" maxLength={100} />
            <Input aria-label="Price" inputMode="decimal" value={row.price} onChange={(e) => update(row.key, { price: e.target.value })} placeholder="0.00" className="w-28 text-right tabular-nums" />
            <button
              type="button"
              aria-label={`Remove ${row.name || "item"}`}
              onClick={() => {
                setMessage(null);
                setRows(rows.filter((r) => r.key !== row.key));
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setRows([...rows, { key: nextKey, name: "", price: "" }]);
            setNextKey(nextKey + 1);
          }}
        >
          <Plus />
          Add item
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save price list"}
        </Button>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-medium", message.ok ? "text-emerald-700" : "text-red-600")}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
