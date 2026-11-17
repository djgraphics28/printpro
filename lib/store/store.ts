/**
 * Where the Sari-Sari Store's daily sales are saved: the "Store Daily Sales" tab of
 * the same Google Sheet the Printing POS uses, or .data/store-daily.json while
 * Google Sheets is not connected. See lib/pos/store.ts for the connection itself.
 */
import path from "path";

import { type Cell, num, readJson, script, str, usingGoogleSheets, writeJson } from "@/lib/pos/store";
import { dayKey } from "@/lib/pos/types";

import { type Amounts, CATEGORIES, type CleanStoreDay, dayTotal, type StoreDay } from "./types";

const FILE = path.join(process.cwd(), ".data", "store-daily.json");

/** Tab columns: Date | one per category | Total | Note | Entered By | Updated At */
function rowToDay(v: Cell[]): StoreDay | null {
  const date = str(v[0]);
  // A date typed into the sheet by hand comes back as a timestamp instead of YYYY-MM-DD.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKey(date);
  if (!day) return null;
  const amounts = {} as Amounts;
  CATEGORIES.forEach((category, i) => (amounts[category] = num(v[1 + i])));
  const rest = 1 + CATEGORIES.length + 1; // after the Total column, which is worked out again here
  return { day, amounts, note: str(v[rest]), enteredBy: str(v[rest + 1]), updatedAt: str(v[rest + 2]) };
}

/** Every saved day, oldest first. */
export async function listStoreDays(): Promise<StoreDay[]> {
  let days: StoreDay[];
  if (usingGoogleSheets) {
    const { rows } = await script<{ rows: Cell[][] }>("listStoreDays");
    days = rows.map(rowToDay).filter((d) => d !== null);
  } else {
    days = await readJson<StoreDay[]>(FILE, []);
  }
  // Should a day be in the sheet twice, the lower row wins.
  return [...new Map(days.map((d) => [d.day, d])).values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Saves the whole sales of one day, replacing what was saved for that day before. */
export async function saveStoreDay(data: CleanStoreDay, enteredBy: string): Promise<StoreDay> {
  const day: StoreDay = { ...data, enteredBy, updatedAt: new Date().toISOString() };
  if (usingGoogleSheets) {
    await script("saveStoreDay", { day: { ...day, total: dayTotal(day.amounts) } });
  } else {
    const list = await readJson<StoreDay[]>(FILE, []);
    await writeJson(FILE, [...list.filter((d) => d.day !== day.day), day]);
  }
  return day;
}

export async function deleteStoreDay(day: string): Promise<boolean> {
  if (usingGoogleSheets) return (await script<{ found: boolean }>("deleteStoreDay", { day })).found;
  const list = await readJson<StoreDay[]>(FILE, []);
  const next = list.filter((d) => d.day !== day);
  if (next.length === list.length) return false;
  await writeJson(FILE, next);
  return true;
}
