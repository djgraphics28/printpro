/**
 * Login for the Printing POS. There are two passwords, one per role:
 * POS_CASHIER_PASSWORD (enters sales) and POS_ADMIN_PASSWORD (manages everything).
 * The Sari-Sari Store has its own passwords, in lib/store/auth.ts.
 */
import { createRoleAuth } from "@/lib/role-auth";

export type { Role } from "@/lib/role-auth";

export const {
  configured: posConfigured,
  roleForPassword,
  startSession,
  endSession,
  getRole,
  requireRole,
  requireAdmin,
} = createRoleAuth({
  cookie: "pp_pos",
  scope: "",
  password: (role) => (role === "admin" ? process.env.POS_ADMIN_PASSWORD : process.env.POS_CASHIER_PASSWORD),
  loginPath: "/pos/login",
  homePath: "/pos",
});
