/**
 * Login for the Sari-Sari Store daily sales. It has its own two passwords,
 * STORE_POS_CASHIER_PASSWORD and STORE_POS_ADMIN_PASSWORD, and its own session:
 * being logged in to the Printing POS does not open the store, and the other way round.
 */
import { createRoleAuth } from "@/lib/role-auth";

export type { Role } from "@/lib/role-auth";

export const {
  configured: storeConfigured,
  roleForPassword,
  startSession,
  endSession,
  getRole,
  requireRole,
  requireAdmin,
} = createRoleAuth({
  cookie: "pp_store",
  scope: "store:",
  password: (role) =>
    role === "admin" ? process.env.STORE_POS_ADMIN_PASSWORD : process.env.STORE_POS_CASHIER_PASSWORD,
  loginPath: "/store/login",
  homePath: "/store",
});
