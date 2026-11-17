"use client";

import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { recordStoreDay, removeStoreDay, storeLogout } from "@/app/store/actions";
import { AppHeader } from "@/components/app-shell/app-header";
import { downloadTable, type Range, rangeDays, RANGES, Stat } from "@/components/pos/pos-admin";
import { PosHeaderActions } from "@/components/pos/pos-register";
import { AmountFields, amountTexts, readAmounts, typedTotal } from "@/components/store/store-register";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SheetsStatus } from "@/lib/pos/store";
import { formatDate, formatMoney, formatTime } from "@/lib/pos/types";
import { CATEGORIES, dayTotal, type StoreDay, totalsOf } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export function StoreAdmin({
  days,
  today,
  sheets,
  loadError,
  loaded,
}: {
  /** Every saved day, newest first. */
  days: StoreDay[];
  /** The shop's current day, YYYY-MM-DD. */
  today: string;
  sheets: SheetsStatus;
  loadError: string;
  /** False when the sales couldn't be read, so an empty table isn't mistaken for "no sales". */
  loaded: boolean;
}) {
  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  /** The day being edited, or "new" while adding one. */
  const [editing, setEditing] = useState<StoreDay | "new" | null>(null);
  const [deleting, setDeleting] = useState<StoreDay | null>(null);

  const [start, end] = rangeDays(range, today, from, to);
  const rows = days.filter((d) => (!start || d.day >= start) && (!end || d.day <= end));
  const totals = totalsOf(rows);

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef2] text-slate-900 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <AppHeader>
        <PosHeaderActions role="admin" onAdminPage base="/store" logoutAction={storeLogout} />
      </AppHeader>

      <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Store daily sales</h1>
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

          {loaded ? (
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
                <div className="ml-auto flex gap-2">
                  <Button type="button" onClick={() => setEditing("new")}>
                    <Plus />
                    Add a day
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={rows.length === 0}
                    onClick={() =>
                      downloadTable(
                        ["Date", ...CATEGORIES, "Total", "Note", "Entered By"],
                        rows.map((d) => [d.day, ...CATEGORIES.map((c) => d.amounts[c]), dayTotal(d.amounts), d.note, d.enteredBy]),
                        `store-daily-sales-${start || "all"}${end && end !== start ? `-to-${end}` : ""}.csv`,
                      )
                    }
                  >
                    <Download />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <Stat label="Total sales" value={formatMoney(totals.total)} hint={`${rows.length} ${rows.length === 1 ? "day" : "days"}`} />
                {CATEGORIES.map((c) => (
                  <Stat key={c} label={c} value={formatMoney(totals[c])} />
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">
                    {days.length === 0 ? "No sales have been entered yet." : "No sales in these dates."}
                  </p>
                ) : (
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        {CATEGORIES.map((c) => (
                          <th key={c} className="px-4 py-3 text-right font-medium">
                            {c}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((d) => (
                        <tr key={d.day} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {formatDate(d.day)}
                            {d.day === today ? <span className="text-slate-400"> · today</span> : null}
                          </td>
                          {CATEGORIES.map((c) => (
                            <td key={c} className={cn("px-4 py-2.5 text-right tabular-nums", !d.amounts[c] && "text-slate-300")}>
                              {formatMoney(d.amounts[c])}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatMoney(dayTotal(d.amounts))}</td>
                          <td className="max-w-56 px-4 py-2.5 text-slate-500">
                            <span className="line-clamp-2">{d.note}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            <button type="button" aria-label={`Edit ${d.day}`} onClick={() => setEditing(d)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
                              <Pencil className="size-4" />
                            </button>
                            <button type="button" aria-label={`Delete ${d.day}`} onClick={() => setDeleting(d)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                      <tr>
                        <td className="px-4 py-3">Total</td>
                        {CATEGORIES.map((c) => (
                          <td key={c} className="px-4 py-3 text-right tabular-nums">
                            {formatMoney(totals[c])}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.total)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DayDialog
            key={editing === "new" ? "new" : editing.day}
            saved={editing === "new" ? undefined : editing}
            days={days}
            today={today}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        {deleting ? <DeleteDialog key={deleting.day} day={deleting} onDone={() => setDeleting(null)} /> : null}
      </Dialog>
    </div>
  );
}

/** Edits a saved day, or adds a new one when `saved` is missing. */
function DayDialog({
  saved,
  days,
  today,
  onDone,
}: {
  saved: StoreDay | undefined;
  days: StoreDay[];
  today: string;
  onDone: () => void;
}) {
  const [day, setDay] = useState(saved?.day ?? today);
  const [texts, setTexts] = useState(() => amountTexts(saved));
  const [note, setNote] = useState(saved?.note ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    // Adding must not silently replace a day that is already there.
    if (!saved && days.some((d) => d.day === day)) {
      setError(`${formatDate(day)} already has sales. Close this and edit that day in the table.`);
      return;
    }
    const result = readAmounts(texts);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    startTransition(async () => {
      const reply = await recordStoreDay({ day, amounts: result.amounts, note });
      if (reply.ok) onDone();
      else setError(reply.message);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{saved ? `Edit ${formatDate(saved.day)}` : "Add a day"}</DialogTitle>
        <DialogDescription>
          {saved
            ? `Last saved by ${saved.enteredBy} · ${formatDate(saved.updatedAt)} ${formatTime(saved.updatedAt)}`
            : "Type the whole sales of that day for each one."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {saved ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="edit-store-day">Date</Label>
            <Input id="edit-store-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} required className="w-44" />
          </div>
        )}
        <AmountFields idPrefix="edit-amount" texts={texts} onChange={setTexts} />
        <div className="space-y-1.5">
          <Label htmlFor="edit-store-note">Note</Label>
          <Input id="edit-store-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm text-slate-500">
            Total <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(typedTotal(texts))}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : saved ? "Save changes" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

function DeleteDialog({ day, onDone }: { day: StoreDay; onDone: () => void }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await removeStoreDay(day.day);
      if (result.ok) onDone();
      else setError(result.message);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete {formatDate(day.day)}?</DialogTitle>
        <DialogDescription>
          This removes that day&apos;s sales ({formatMoney(dayTotal(day.amounts))}) for good.
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
