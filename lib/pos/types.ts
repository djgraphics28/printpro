/** Shared by the POS screens and the server actions (runs on client and server). */

export const PAYMENTS = ["Cash", "GCash"] as const;
export type Payment = (typeof PAYMENTS)[number];

/** One row of the Sales tab: a single item on a receipt. */
export type Sale = {
  id: string;
  /** ISO timestamp. */
  soldAt: string;
  /** Items sold together share a receipt number. */
  receipt: string;
  item: string;
  qty: number;
  price: number;
  total: number;
  payment: Payment;
  customer: string;
  note: string;
  enteredBy: string;
};

/** One row of the Services tab: the price list the cashier taps from. */
export type Service = { name: string; price: number };

export type SaleLineInput = { item: string; qty: number; price: number };

export type SaleInput = {
  lines: SaleLineInput[];
  payment: string;
  customer: string;
  note: string;
};

/** What the admin can change on a saved row. */
export type SaleEdit = SaleLineInput & { payment: string; customer: string; note: string };

export const MAX_LINES = 50;
export const MAX_QTY = 100_000;
export const MAX_PRICE = 1_000_000;

const tidy = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

export const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** "1,250.50" or "₱1250.5" → 1250.5. NaN when it isn't a number. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[₱,\s]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
export const formatMoney = (n: number) => peso.format(n);

function cleanLine(line: SaleLineInput): { ok: true; data: SaleLineInput } | { ok: false; message: string } {
  const item = tidy(line?.item);
  const qty = Number(line?.qty);
  const price = Number(line?.price);
  if (!item) return { ok: false, message: "Every item needs a name." };
  if (item.length > 100) return { ok: false, message: `"${item.slice(0, 20)}…" is too long.` };
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY)
    return { ok: false, message: `The quantity for ${item} should be a whole number, 1 or more.` };
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE)
    return { ok: false, message: `The price for ${item} isn't valid.` };
  return { ok: true, data: { item, qty, price: roundMoney(price) } };
}

function cleanDetails(input: { payment: string; customer: string; note: string }) {
  const customer = tidy(input?.customer);
  const note = tidy(input?.note);
  if (!PAYMENTS.includes(input?.payment as Payment)) return { ok: false as const, message: "Choose Cash or GCash." };
  if (customer.length > 100) return { ok: false as const, message: "The customer name is too long." };
  if (note.length > 300) return { ok: false as const, message: "The note is too long." };
  return { ok: true as const, data: { payment: input.payment as Payment, customer, note } };
}

export type CleanSale = { lines: SaleLineInput[]; payment: Payment; customer: string; note: string };

export function validateSale(input: SaleInput): { ok: true; data: CleanSale } | { ok: false; message: string } {
  if (!Array.isArray(input?.lines) || input.lines.length === 0)
    return { ok: false, message: "Add at least one item." };
  if (input.lines.length > MAX_LINES) return { ok: false, message: "That's too many items for one sale." };
  const lines: SaleLineInput[] = [];
  for (const line of input.lines) {
    const result = cleanLine(line);
    if (!result.ok) return result;
    lines.push(result.data);
  }
  const details = cleanDetails(input);
  if (!details.ok) return details;
  return { ok: true, data: { lines, ...details.data } };
}

export type CleanSaleEdit = SaleLineInput & { payment: Payment; customer: string; note: string };

export function validateSaleEdit(input: SaleEdit): { ok: true; data: CleanSaleEdit } | { ok: false; message: string } {
  const line = cleanLine(input);
  if (!line.ok) return line;
  const details = cleanDetails(input);
  if (!details.ok) return details;
  return { ok: true, data: { ...line.data, ...details.data } };
}

export function validateServices(input: Service[]): { ok: true; data: Service[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return { ok: false, message: "The price list isn't valid." };
  if (input.length > 200) return { ok: false, message: "That's too many items for the price list." };
  const seen = new Set<string>();
  const data: Service[] = [];
  for (const row of input) {
    const name = tidy(row?.name);
    const price = Number(row?.price);
    if (!name) return { ok: false, message: "Every item needs a name." };
    if (name.length > 100) return { ok: false, message: `"${name.slice(0, 20)}…" is too long.` };
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE)
      return { ok: false, message: `The price for ${name} isn't valid.` };
    if (seen.has(name.toLowerCase())) return { ok: false, message: `${name} is on the list twice.` };
    seen.add(name.toLowerCase());
    data.push({ name, price: roundMoney(price) });
  }
  return { ok: true, data };
}

/* --------------------------------- Dates ---------------------------------- */

/** The shop's time zone: "today" and the times shown follow it, wherever the server runs. */
export const SHOP_TIME_ZONE = "Asia/Manila";

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: SHOP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: SHOP_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** The shop's calendar day of a timestamp, as YYYY-MM-DD ("" when it isn't a date). */
export function dayKey(iso: string | number | Date): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dayFormat.format(date);
}

/** The shop's current day, as YYYY-MM-DD. */
export const shopToday = () => dayKey(Date.now());

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : timeFormat.format(date);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
}

/** Moves a YYYY-MM-DD day by a number of days. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
