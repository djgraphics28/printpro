"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endSession, getRole, roleForPassword, startSession } from "@/lib/pos/auth";
import { addSale, deleteSale, describeStoreError, saveServices, updateSale } from "@/lib/pos/store";
import {
  type Sale,
  type SaleEdit,
  type SaleInput,
  type Service,
  validateSale,
  validateSaleEdit,
  validateServices,
} from "@/lib/pos/types";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const role = roleForPassword(String(form.get("password") ?? ""));
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // slows down password guessing
    return "That password isn't right. Try again.";
  }
  await startSession(role);
  redirect(role === "admin" ? "/pos/admin" : "/pos");
}

export async function logout() {
  await endSession();
  redirect("/pos/login");
}

export type RecordResult = { ok: true; sales: Sale[] } | { ok: false; message: string };

/** Cashier and admin: save one receipt. */
export async function recordSale(input: SaleInput): Promise<RecordResult> {
  const role = await getRole();
  if (!role) return { ok: false, message: "Please log in again." };
  const result = validateSale(input);
  if (!result.ok) return result;
  try {
    return { ok: true, sales: await addSale(result.data, role === "admin" ? "Admin" : "Cashier") };
  } catch (err) {
    console.error("Recording the sale failed:", err);
    return { ok: false, message: "Couldn't save the sale. Check the connection and try again." };
  }
}

export type AdminResult = { ok: true } | { ok: false; message: string };

const NOT_ADMIN = { ok: false as const, message: "Please log in as admin." };

export async function saveSale(id: string, input: SaleEdit): Promise<AdminResult> {
  if ((await getRole()) !== "admin") return NOT_ADMIN;
  const result = validateSaleEdit(input);
  if (!result.ok) return result;
  try {
    if (!(await updateSale(String(id), result.data))) return { ok: false, message: "That sale no longer exists." };
  } catch (err) {
    console.error("Updating the sale failed:", err);
    return { ok: false, message: describeStoreError(err) || "Couldn't save the change. Please try again." };
  }
  revalidatePath("/pos/admin");
  return { ok: true };
}

export async function removeSale(id: string): Promise<AdminResult> {
  if ((await getRole()) !== "admin") return NOT_ADMIN;
  try {
    await deleteSale(String(id));
  } catch (err) {
    console.error("Deleting the sale failed:", err);
    return { ok: false, message: describeStoreError(err) || "Couldn't delete. Please try again." };
  }
  revalidatePath("/pos/admin");
  return { ok: true };
}

export async function savePriceList(input: Service[]): Promise<AdminResult> {
  if ((await getRole()) !== "admin") return NOT_ADMIN;
  const result = validateServices(input);
  if (!result.ok) return result;
  try {
    await saveServices(result.data);
  } catch (err) {
    console.error("Saving the price list failed:", err);
    return { ok: false, message: describeStoreError(err) || "Couldn't save the price list. Please try again." };
  }
  revalidatePath("/pos/admin");
  return { ok: true };
}
