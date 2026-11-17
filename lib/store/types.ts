/** Shared by the Sari-Sari Store screens and its server actions (runs on client and server). */
import { dayKey, roundMoney, shiftDay } from "@/lib/pos/types";

/**
 * What the store's daily sales are tracked by. The Apps Script has the same
 * list (STORE_CATEGORIES in google-apps-script/Code.gs); change both together.
 */
export const CATEGORIES = ["GCash", "Groceries", "Softdrinks", "Ice", "Eggs"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Amounts = Record<Category, number>;

/** One row of the Store Daily Sales tab: the whole sales of one day, per category. */
export type StoreDay = {
  /** YYYY-MM-DD. There is one row per day. */
  day: string;
  amounts: Amounts;
  note: string;
  /** Who saved it last. */
  enteredBy: string;
  /** ISO timestamp of the last save. */
  updatedAt: string;
};

export const MAX_AMOUNT = 10_000_000;
/** How many days back the cashier may enter sales for. The admin has no limit. */
export const CASHIER_DAYS_BACK = 6;

export type StoreDayInput = { day: string; amounts: Partial<Record<Category, number>>; note: string };
export type CleanStoreDay = { day: string; amounts: Amounts; note: string };

const tidy = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

export const isDay = (day: unknown): day is string =>
  typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && dayKey(`${day}T00:00:00Z`) === day;

/** Checks what the form sent. `limitDays` keeps the cashier to recent days. */
export function validateStoreDay(
  input: StoreDayInput,
  today: string,
  limitDays: boolean,
): { ok: true; data: CleanStoreDay } | { ok: false; message: string } {
  const day = input?.day;
  if (!isDay(day)) return { ok: false, message: "Choose a date." };
  if (day > today) return { ok: false, message: "The date can't be in the future." };
  if (limitDays && day < shiftDay(today, -CASHIER_DAYS_BACK))
    return { ok: false, message: "That date is too far back. Ask the admin to enter it." };

  const amounts = {} as Amounts;
  for (const category of CATEGORIES) {
    const amount = Number(input?.amounts?.[category] ?? 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT)
      return { ok: false, message: `The amount for ${category} isn't valid.` };
    amounts[category] = roundMoney(amount);
  }
  if (dayTotal(amounts) === 0) return { ok: false, message: "Type at least one amount." };

  const note = tidy(input?.note);
  if (note.length > 300) return { ok: false, message: "The note is too long." };
  return { ok: true, data: { day, amounts, note } };
}

/** All the categories of one day together. */
export const dayTotal = (amounts: Amounts) => roundMoney(CATEGORIES.reduce((sum, c) => sum + (amounts[c] || 0), 0));

/** Adds up several days: one total per category, and everything together. */
export function totalsOf(days: StoreDay[]): Amounts & { total: number } {
  const totals = { total: 0 } as Amounts & { total: number };
  for (const category of CATEGORIES) {
    totals[category] = roundMoney(days.reduce((sum, d) => sum + (d.amounts[category] || 0), 0));
    totals.total = roundMoney(totals.total + totals[category]);
  }
  return totals;
}
