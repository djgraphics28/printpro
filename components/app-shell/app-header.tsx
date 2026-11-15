"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { APPS } from "@/lib/apps";
import { cn } from "@/lib/utils";

/** Shared top bar for every tool: back to launcher, app switcher, page actions. */
export function AppHeader({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const current = APPS.find((a) => a.href === pathname);
  const Icon = current?.icon;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 md:px-6 lg:static print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          title="All tools"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:inline">Apps</span>
        </Link>
        {current && Icon ? (
          <div className="ml-1 flex min-w-0 items-center gap-2.5">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", current.tint)}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{current.name}</p>
              <p className="hidden text-xs text-slate-500 sm:block">PrintPro</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <nav className="hidden items-center gap-1 rounded-lg bg-slate-100 p-1 md:flex">
          {APPS.map((app) => {
            const AppIcon = app.icon;
            const active = app.href === pathname;
            return (
              <Link
                key={app.id}
                href={app.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900",
                  active && "bg-white text-slate-900 shadow-sm",
                )}
              >
                <AppIcon className="size-3.5" />
                {app.name}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </header>
  );
}
