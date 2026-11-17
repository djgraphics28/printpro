"use client";

import { useActionState } from "react";

import { login } from "@/app/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The password box. Other tools pass their own login action. */
export function PosLoginForm({
  loginAction = login,
}: {
  loginAction?: (prev: string | null, form: FormData) => Promise<string | null>;
}) {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={!!error}
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Log in"}
      </Button>
    </form>
  );
}
