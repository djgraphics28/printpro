/**
 * Simple password login with two roles: a cashier (enters sales) and an admin
 * (manages everything). Each tool that needs a login makes its own with
 * createRoleAuth, so their passwords and sessions stay separate.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Role = "cashier" | "admin";

const WEEK = 60 * 60 * 24 * 7;

const sha = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

export function createRoleAuth(options: {
  /** Name of the session cookie. */
  cookie: string;
  /**
   * Mixed into the cookie's signature, so a session from one tool is not
   * accepted by another even when both use the same password.
   */
  scope: string;
  password: (role: Role) => string | undefined;
  loginPath: string;
  /** Where a cashier is sent when they open an admin-only page. */
  homePath: string;
}) {
  const password = (role: Role) => options.password(role) ?? "";
  // Signed with the role's own password, so changing a password logs that role out.
  const sign = (role: Role, expires: string) =>
    createHmac("sha256", password(role)).update(`${options.scope}${role}:${expires}`).digest("hex");

  /** The role of whoever is logged in, or null. */
  async function getRole(): Promise<Role | null> {
    const [role, expires, signature] = ((await cookies()).get(options.cookie)?.value ?? "").split(".");
    if ((role !== "admin" && role !== "cashier") || !expires || !signature) return null;
    if (!password(role)) return null;
    return Number(expires) > Date.now() && same(signature, sign(role, expires)) ? role : null;
  }

  /** For pages anyone logged in may open. Sends everyone else to the login page. */
  async function requireRole(): Promise<Role> {
    const role = await getRole();
    if (!role) redirect(options.loginPath);
    return role;
  }

  return {
    configured: () => password("admin").length > 0 || password("cashier").length > 0,

    /** Which role this password belongs to, or null when it is wrong. */
    roleForPassword(input: string): Role | null {
      for (const role of ["admin", "cashier"] as const) {
        if (password(role) && same(input, password(role))) return role;
      }
      return null;
    },

    async startSession(role: Role) {
      const expires = String(Date.now() + WEEK * 1000);
      (await cookies()).set(options.cookie, `${role}.${expires}.${sign(role, expires)}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: WEEK,
      });
    },

    async endSession() {
      (await cookies()).delete(options.cookie);
    },

    getRole,
    requireRole,

    /** For admin-only pages. The cashier is sent back to the sales screen. */
    async requireAdmin() {
      const role = await requireRole();
      if (role !== "admin") redirect(options.homePath);
    },
  };
}
