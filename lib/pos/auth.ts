/**
 * Simple password login for the POS. There are two passwords, one per role:
 * POS_CASHIER_PASSWORD (enters sales) and POS_ADMIN_PASSWORD (manages everything).
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Role = "cashier" | "admin";

const COOKIE = "pp_pos";
const WEEK = 60 * 60 * 24 * 7;

function password(role: Role) {
  return (role === "admin" ? process.env.POS_ADMIN_PASSWORD : process.env.POS_CASHIER_PASSWORD) ?? "";
}

const sha = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));
// Signed with the role's own password, so changing a password logs that role out.
const sign = (role: Role, expires: string) =>
  createHmac("sha256", password(role)).update(`${role}:${expires}`).digest("hex");

export const posConfigured = () => password("admin").length > 0 || password("cashier").length > 0;

/** Which role this password belongs to, or null when it is wrong. */
export function roleForPassword(input: string): Role | null {
  for (const role of ["admin", "cashier"] as const) {
    if (password(role) && same(input, password(role))) return role;
  }
  return null;
}

export async function startSession(role: Role) {
  const expires = String(Date.now() + WEEK * 1000);
  (await cookies()).set(COOKIE, `${role}.${expires}.${sign(role, expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The role of whoever is logged in, or null. */
export async function getRole(): Promise<Role | null> {
  const [role, expires, signature] = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  if ((role !== "admin" && role !== "cashier") || !expires || !signature) return null;
  if (!password(role)) return null;
  return Number(expires) > Date.now() && same(signature, sign(role, expires)) ? role : null;
}

/** For pages anyone logged in may open. Sends everyone else to the login page. */
export async function requireRole(): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/pos/login");
  return role;
}

/** For admin-only pages. The cashier is sent back to the sales screen. */
export async function requireAdmin() {
  const role = await requireRole();
  if (role !== "admin") redirect("/pos");
}
