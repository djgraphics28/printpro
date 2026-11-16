/**
 * Where the POS sales and the price list are saved.
 *
 * - If GOOGLE_SCRIPT_URL and GOOGLE_SCRIPT_SECRET are set in .env.local → your
 *   Google Sheet, through the Apps Script web app in google-apps-script/Code.gs.
 * - Otherwise → local files in .data/, handy while developing.
 */
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import {
  type CleanSale,
  type CleanSaleEdit,
  dayKey,
  type Payment,
  PAYMENTS,
  roundMoney,
  type Sale,
  type Service,
} from "./types";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL?.trim();
const SECRET = process.env.GOOGLE_SCRIPT_SECRET?.trim();
const SALES_TAB = process.env.POS_SALES_TAB?.trim() || "Sales";
const SERVICES_TAB = process.env.POS_SERVICES_TAB?.trim() || "Services";

export const usingGoogleSheets = Boolean(SCRIPT_URL && SECRET);

/** Shown until the admin saves a price list of their own. */
export const DEFAULT_SERVICES: Service[] = [
  { name: "ID Photo package", price: 50 },
  { name: "Photo print 4R", price: 15 },
  { name: "Print B&W (per page)", price: 3 },
  { name: "Print Colored (per page)", price: 10 },
  { name: "Photocopy (per page)", price: 2 },
  { name: "Scan (per page)", price: 5 },
  { name: "Lamination", price: 25 },
  { name: "Wi-Fi voucher", price: 10 },
];

/* ------------------------------ Google Sheets ----------------------------- */

/** A failure with a message that is safe and useful to show to the admin. */
class ScriptError extends Error {}

type ScriptReply = { ok: boolean; error?: string };
type Cell = string | number | boolean | null;

/** Calls the Apps Script web app. Throws ScriptError when it can't be used. */
async function script<T>(action: string, payload: object = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(SCRIPT_URL!, {
      method: "POST",
      // text/plain: Apps Script reads the body itself, and Google redirects the reply.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: SECRET, salesTab: SALES_TAB, servicesTab: SERVICES_TAB, action, ...payload }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ScriptError("Couldn't reach Google. Check the internet connection and GOOGLE_SCRIPT_URL.");
  }

  const body = await res.text();
  let reply: (ScriptReply & T) | undefined;
  try {
    reply = JSON.parse(body);
  } catch {
    // Google answered with a web page (sign-in, error or "not found") instead of the script's reply.
  }
  if (!reply || typeof reply.ok !== "boolean") {
    throw new ScriptError(
      res.status === 404
        ? "GOOGLE_SCRIPT_URL doesn't point to a deployed web app. Copy the Web app URL again from Deploy → Manage deployments."
        : 'Google refused access to the script (it is not open to "Anyone"). In Apps Script, open Deploy → Manage deployments, click the pencil, set "Who has access" to Anyone, and click Deploy. If you made a new deployment instead, copy its new Web app URL into GOOGLE_SCRIPT_URL.',
    );
  }
  if (!reply.ok) {
    if (reply.error === "unauthorized") {
      throw new ScriptError(
        "The secret doesn't match. SECRET at the top of the Apps Script must be exactly GOOGLE_SCRIPT_SECRET from .env.local. After changing the script, deploy a new version.",
      );
    }
    if (reply.error === "secret-not-set") {
      throw new ScriptError(
        "SECRET is still the placeholder in the Apps Script. Paste your GOOGLE_SCRIPT_SECRET there, then deploy a new version.",
      );
    }
    if (reply.error === "unknown-action") {
      throw new ScriptError(
        "The deployed Apps Script is out of date. Paste the current google-apps-script/Code.gs and deploy a new version.",
      );
    }
    throw new ScriptError(`The Apps Script reported an error: ${reply.error}`);
  }
  return reply;
}

const str = (v: Cell | undefined) => String(v ?? "").trim();
// Tolerates a cell someone formatted by hand, like "₱1,250.00".
const num = (v: Cell | undefined) => (typeof v === "number" ? v : Number(str(v).replace(/[₱,\s]/g, "")) || 0);

/** Sales tab columns: ID | Sold At | Receipt | Item | Qty | Unit Price | Total | Payment | Customer | Note | Entered By */
function rowToSale(v: Cell[]): Sale {
  const payment = str(v[7]);
  return {
    id: str(v[0]),
    soldAt: str(v[1]),
    receipt: str(v[2]),
    item: str(v[3]),
    qty: num(v[4]),
    price: num(v[5]),
    total: num(v[6]),
    payment: PAYMENTS.includes(payment as Payment) ? (payment as Payment) : "Cash",
    customer: str(v[8]),
    note: str(v[9]),
    enteredBy: str(v[10]),
  };
}

/* ---------------------------- Connection check ---------------------------- */

export type SheetsStatus = {
  /** True only when the Apps Script answered and accepted the secret. */
  connected: boolean;
  /** Plain-language explanation: what is connected, or what to fix. */
  message: string;
};

/**
 * Tests the Google Sheets connection for real (it calls the Apps Script), and
 * says what is wrong when it fails. Never throws.
 */
export async function checkSheetsConnection(): Promise<SheetsStatus> {
  const local = " Sales are saved to a local file until this is fixed.";
  if (!SCRIPT_URL && !SECRET) {
    return { connected: false, message: "Google Sheets is not set up. Sales are saved to a local file on this computer." };
  }
  if (!SCRIPT_URL || !SECRET) {
    const name = SCRIPT_URL ? "GOOGLE_SCRIPT_SECRET" : "GOOGLE_SCRIPT_URL";
    return { connected: false, message: `${name} is empty in .env.local.${local}` };
  }
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(SCRIPT_URL)) {
    return {
      connected: false,
      message:
        "GOOGLE_SCRIPT_URL should be the Web app URL from the Apps Script deployment. It starts with https://script.google.com/ and ends with /exec.",
    };
  }
  try {
    const { title } = await script<{ title: string }>("ping");
    return {
      connected: true,
      message: `Connected to "${title}" (tabs: ${SALES_TAB} for sales, ${SERVICES_TAB} for the price list).`,
    };
  } catch (err) {
    return { connected: false, message: err instanceof ScriptError ? err.message : "Couldn't check the connection." };
  }
}

/** The message to show when reading or saving through Google Sheets failed. */
export function describeStoreError(err: unknown): string {
  return err instanceof ScriptError ? err.message : "";
}

/* ------------------------------- Local file ------------------------------- */

const SALES_FILE = path.join(process.cwd(), ".data", "pos-sales.json");
const SERVICES_FILE = path.join(process.cwd(), ".data", "pos-services.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

/* -------------------------------- Public API ------------------------------ */

/** Every sale row, oldest first. */
export async function listSales(): Promise<Sale[]> {
  if (!usingGoogleSheets) return readJson<Sale[]>(SALES_FILE, []);
  const { rows } = await script<{ rows: Cell[][] }>("listSales");
  return rows.map(rowToSale).filter((s) => s.id);
}

/** Saves one receipt: a row per item, all with the same receipt number and time. */
export async function addSale(data: CleanSale, enteredBy: string): Promise<Sale[]> {
  const now = new Date();
  const receipt = `${dayKey(now).replaceAll("-", "").slice(2)}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const sales: Sale[] = data.lines.map((line) => ({
    id: randomUUID().slice(0, 8),
    soldAt: now.toISOString(),
    receipt,
    item: line.item,
    qty: line.qty,
    price: line.price,
    total: roundMoney(line.qty * line.price),
    payment: data.payment,
    customer: data.customer,
    note: data.note,
    enteredBy,
  }));
  if (usingGoogleSheets) await script("addSales", { sales });
  else await writeJson(SALES_FILE, [...(await readJson<Sale[]>(SALES_FILE, [])), ...sales]);
  return sales;
}

export async function updateSale(id: string, data: CleanSaleEdit): Promise<boolean> {
  const changes = { ...data, total: roundMoney(data.qty * data.price) };
  if (usingGoogleSheets) {
    return (await script<{ found: boolean }>("updateSale", { id, data: changes })).found;
  }
  const list = await readJson<Sale[]>(SALES_FILE, []);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], ...changes };
  await writeJson(SALES_FILE, list);
  return true;
}

export async function deleteSale(id: string): Promise<boolean> {
  if (usingGoogleSheets) {
    return (await script<{ found: boolean }>("deleteSale", { id })).found;
  }
  const list = await readJson<Sale[]>(SALES_FILE, []);
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  await writeJson(SALES_FILE, next);
  return true;
}

/** The price list. Falls back to the defaults while nothing has been saved. */
export async function listServices(): Promise<Service[]> {
  let services: Service[];
  if (usingGoogleSheets) {
    const { rows } = await script<{ rows: Cell[][] }>("getServices");
    services = rows.map((v) => ({ name: str(v[0]), price: num(v[1]) })).filter((s) => s.name);
  } else {
    services = await readJson<Service[]>(SERVICES_FILE, []);
  }
  return services.length ? services : DEFAULT_SERVICES;
}

export async function saveServices(services: Service[]): Promise<void> {
  if (usingGoogleSheets) await script("saveServices", { services });
  else await writeJson(SERVICES_FILE, services);
}
