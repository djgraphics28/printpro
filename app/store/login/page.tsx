import { ArrowLeft, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { storeLogin } from "@/app/store/actions";
import { PosLoginForm } from "@/components/pos/pos-login-form";
import { getRole, storeConfigured } from "@/lib/store/auth";

export const metadata: Metadata = { title: "Sari-Sari Store login — PrintPro" };

export default async function StoreLoginPage() {
  const role = await getRole();
  if (role) redirect(role === "admin" ? "/store/admin" : "/store");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#eceef2] px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <Store className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Sari-Sari Store</h1>
          {storeConfigured() ? (
            <>
              <p className="mt-1 text-sm text-slate-500">Enter the store cashier or admin password.</p>
              <PosLoginForm loginAction={storeLogin} />
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              No passwords are set yet. Add <code className="font-mono text-xs">STORE_POS_CASHIER_PASSWORD</code> and{" "}
              <code className="font-mono text-xs">STORE_POS_ADMIN_PASSWORD</code> to{" "}
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
