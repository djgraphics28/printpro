"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { describeStoreError } from "@/lib/pos/store";
import { shopToday } from "@/lib/pos/types";
import { endSession, getRole, roleForPassword, startSession } from "@/lib/store/auth";
import { deleteStoreDay, saveStoreDay } from "@/lib/store/store";
import { isDay, type StoreDayInput, validateStoreDay } from "@/lib/store/types";

/** Makes both store screens show the change. */
function refresh() {
  revalidatePath("/store");
  revalidatePath("/store/admin");
}

export async function storeLogin(_prev: string | null, form: FormData): Promise<string | null> {
  const role = roleForPassword(String(form.get("password") ?? ""));
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // slows down password guessing
    return "That password isn't right. Try again.";
  }
  await startSession(role);
  redirect(role === "admin" ? "/store/admin" : "/store");
}

export async function storeLogout() {
  await endSession();
  redirect("/store/login");
}

export type StoreResult = { ok: true } | { ok: false; message: string };

/**
 * Cashier and admin: save the whole sales of one day. Saving a day again
 * replaces it. The cashier is kept to recent days; the admin can save any past day.
 */
export async function recordStoreDay(input: StoreDayInput): Promise<StoreResult> {
  const role = await getRole();
  if (!role) return { ok: false, message: "Please log in again." };
  const result = validateStoreDay(input, shopToday(), role !== "admin");
  if (!result.ok) return result;
  try {
    await saveStoreDay(result.data, role === "admin" ? "Admin" : "Cashier");
  } catch (err) {
    console.error("Saving the store's daily sales failed:", err);
    return {
      ok: false,
      // Only the admin gets the setup details.
      message: (role === "admin" && describeStoreError(err)) || "Couldn't save. Check the connection and try again.",
    };
  }
  refresh();
  return { ok: true };
}

export async function removeStoreDay(day: string): Promise<StoreResult> {
  if ((await getRole()) !== "admin") return { ok: false, message: "Please log in as admin." };
  if (!isDay(day)) return { ok: false, message: "That date isn't valid." };
  try {
    await deleteStoreDay(day);
  } catch (err) {
    console.error("Deleting the store day failed:", err);
    return { ok: false, message: describeStoreError(err) || "Couldn't delete. Please try again." };
  }
  refresh();
  return { ok: true };
}
