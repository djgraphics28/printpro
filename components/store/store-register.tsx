"use client";

import { CheckCircle2, CupSoda, Egg, type LucideIcon, ShoppingBasket, Smartphone, Snowflake } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { recordStoreDay, storeLogout } from "@/app/store/actions";
import { AppHeader } from "@/components/app-shell/app-header";
import { PosHeaderActions } from "@/components/pos/pos-register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney, formatTime, parseMoney, roundMoney, shiftDay } from "@/lib/pos/types";
import type { Role } from "@/lib/store/auth";
import { type Amounts, CATEGORIES, type Category, dayTotal, MAX_AMOUNT, type StoreDay } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const CATEGORY_LOOK: Record<Category, { icon: LucideIcon; tint: string }> = {
  GCash: { icon: Smartphone, tint: "bg-blue-100 text-blue-700" },
  Groceries: { icon: ShoppingBasket, tint: "bg-emerald-100 text-emerald-700" },
  Softdrinks: { icon: CupSoda, tint: "bg-rose-100 text-rose-700" },
  Ice: { icon: Snowflake, tint: "bg-cyan-100 text-cyan-700" },
  Eggs: { icon: Egg, tint: "bg-amber-100 text-amber-700" },
};

type AmountTexts = Record<Category, string>;

/** What the amount boxes show for a saved day (blank when nothing is saved). */
export function amountTexts(saved?: StoreDay): AmountTexts {
  return Object.fromEntries(
    CATEGORIES.map((c) => [c, saved?.amounts[c] ? String(saved.amounts[c]) : ""]),
  ) as AmountTexts;
}

/** Reads the amount boxes. A blank box counts as 0. */
export function readAmounts(texts: AmountTexts): { ok: true; amounts: Amounts } | { ok: false; message: string } {
  const amounts = {} as Amounts;
  for (const category of CATEGORIES) {
    const amount = texts[category].trim() ? parseMoney(texts[category]) : 0;
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT)
      return { ok: false, message: `The amount for ${category} should be a number.` };
    amounts[category] = roundMoney(amount);
  }
  if (dayTotal(amounts) === 0) return { ok: false, message: "Type at least one amount." };
  return { ok: true, amounts };
}

/** The total of what is typed so far; boxes that aren't numbers count as 0. */
export const typedTotal = (texts: AmountTexts) =>
  roundMoney(CATEGORIES.reduce((sum, c) => sum + (parseMoney(texts[c]) || 0), 0));

/** One amount box per category. Shared with the admin's edit window. */
export function AmountFields({
  idPrefix,
  texts,
  onChange,
}: {
  idPrefix: string;
  texts: AmountTexts;
  onChange: (texts: AmountTexts) => void;
}) {
  return (
    <ul className="space-y-2">
      {CATEGORIES.map((category) => {
        const { icon: Icon, tint } = CATEGORY_LOOK[category];
        return (
          <li key={category} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tint)}>
              <Icon className="size-5" />
            </span>
            <label htmlFor={`${idPrefix}-${category}`} className="min-w-0 flex-1 text-sm font-medium">
              {category}
            </label>
            <Input
              id={`${idPrefix}-${category}`}
              inputMode="decimal"
              autoComplete="off"
              value={texts[category]}
              onChange={(e) => onChange({ ...texts, [category]: e.target.value })}
              placeholder="0.00"
              className="h-11 w-36 text-right text-base tabular-nums"
            />
          </li>
        );
      })}
    </ul>
  );
}

export function StoreRegister({
  role,
  days,
  today,
  earliest,
  loadError,
}: {
  role: Role;
  /** The saved days from `earliest` to `today`. */
  days: StoreDay[];
  /** The shop's current day, YYYY-MM-DD. */
  today: string;
  /** The oldest day that can be entered here. */
  earliest: string;
  loadError: string;
}) {
  const [day, setDay] = useState(today);
  const saved = days.find((d) => d.day === day);

  // Today first, then the days before it, whether saved or not.
  const recent: string[] = [];
  for (let d = today; d >= earliest; d = shiftDay(d, -1)) recent.push(d);

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef2] text-slate-900">
      <AppHeader>
        <PosHeaderActions role={role} base="/store" logoutAction={storeLogout} />
      </AppHeader>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {loadError ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 lg:col-span-2">
            {loadError}
          </p>
        ) : null}

        {/* Remounts with the saved amounts when the date changes or a save comes back. */}
        <DayForm
          key={`${day}:${saved?.updatedAt ?? ""}`}
          day={day}
          saved={saved}
          today={today}
          earliest={earliest}
          onDayChange={setDay}
        />

        <section className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Last 7 days</p>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {recent.map((d) => {
              const row = days.find((x) => x.day === d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={d === day}
                    onClick={() => setDay(d)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50",
                      d === day && "bg-slate-50",
                    )}
                  >
                    <span className={cn(d === day && "font-semibold")}>
                      {formatDate(d)}
                      {d === today ? <span className="font-normal text-slate-400"> · today</span> : null}
                    </span>
                    {row ? (
                      <span className="font-semibold tabular-nums">{formatMoney(dayTotal(row.amounts))}</span>
                    ) : (
                      <span className="text-xs text-slate-400">Not entered</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500">Tap a day to enter or correct its sales.</p>
        </section>
      </main>
    </div>
  );
}

function DayForm({
  day,
  saved,
  today,
  earliest,
  onDayChange,
}: {
  day: string;
  saved: StoreDay | undefined;
  today: string;
  earliest: string;
  onDayChange: (day: string) => void;
}) {
  const [texts, setTexts] = useState(() => amountTexts(saved));
  const [note, setNote] = useState(saved?.note ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const dayName = day === today ? "today" : formatDate(day);
  const unchanged =
    saved !== undefined && note === saved.note && CATEGORIES.every((c) => texts[c] === amountTexts(saved)[c]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = readAmounts(texts);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    startTransition(async () => {
      const reply = await recordStoreDay({ day, amounts: result.amounts, note });
      if (!reply.ok) setError(reply.message);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Daily sales</h1>
          <p className="mt-1 text-sm text-slate-500">Type the whole sales of the day for each one.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-day" className="text-xs">Date</Label>
          <Input
            id="store-day"
            type="date"
            value={day}
            min={earliest}
            max={today}
            required
            // Clearing the box would leave no day to save to.
            onChange={(e) => e.target.value && onDayChange(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <AmountFields idPrefix="amount" texts={texts} onChange={setTexts} />

      <div className="space-y-1.5">
        <Label htmlFor="store-note" className="text-xs">Note (optional)</Label>
        <Input id="store-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
      {saved && unchanged ? (
        <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <p>
            <span className="font-medium">Saved for {dayName}.</span> Last saved by {saved.enteredBy},{" "}
            {formatDate(saved.updatedAt)} {formatTime(saved.updatedAt)}. Change an amount to correct it.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div>
          <p className="text-xs text-slate-500">Total for {dayName}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(typedTotal(texts))}</p>
        </div>
        <Button type="submit" size="lg" disabled={pending || unchanged} className="min-w-36">
          {pending ? "Saving…" : saved ? "Save changes" : "Save sales"}
        </Button>
      </div>
    </form>
  );
}
