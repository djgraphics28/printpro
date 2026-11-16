import { ArrowLeft, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PosLoginForm } from "@/components/pos/pos-login-form";
import { getRole, posConfigured } from "@/lib/pos/auth";

export const metadata: Metadata = { title: "POS login — PrintPro" };

export default async function PosLoginPage() {
  const role = await getRole();
  if (role) redirect(role === "admin" ? "/pos/admin" : "/pos");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#eceef2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShoppingCart className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Printing POS</h1>
          {posConfigured() ? (
            <>
              <p className="mt-1 text-sm text-slate-500">Enter the cashier or admin password.</p>
              <PosLoginForm />
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              No passwords are set yet. Add <code className="font-mono text-xs">POS_CASHIER_PASSWORD</code> and{" "}
              <code className="font-mono text-xs">POS_ADMIN_PASSWORD</code> to{" "}
              <code className="font-mono text-xs">.env.local</code> and restart the app.
            </p>
          )}
        </div>
        <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" />
          All tools
        </Link>
      </div>
    </div>
  );
}
