"use client";

import { ArrowRight, IdCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { Kbd } from "@/components/ui/kbd";
import { APPS } from "@/lib/apps";
import { isTypingTarget } from "@/lib/print-utils";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Clock that ticks once a minute; null during server render to avoid hydration mismatch.
function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, 10_000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

export function AppLauncher() {
  const router = useRouter();
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);

  // Number keys open apps: 1 = first card, 2 = second, …
  useEffect(() => {
    APPS.forEach((app) => router.prefetch(app.href));
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < APPS.length) {
        event.preventDefault();
        router.push(APPS[index].href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const dateLabel = now
    ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : " ";
  const timeLabel = now ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="h-dvh overflow-y-auto bg-[#eceef2] text-slate-900">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="mb-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <IdCard className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">PrintPro</p>
              <p className="text-xs text-slate-500">Printing workstation</p>
            </div>
          </div>
          <p className="text-sm tabular-nums text-slate-500">{timeLabel}</p>
        </header>

        <section className="mb-8">
          <p className="text-sm text-slate-500">{dateLabel}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {now ? greeting(now.getHours()) : "Welcome"}.
          </h1>
          <p className="mt-2 text-slate-600">Choose a tool to get started.</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app, i) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                className={cn(
                  "group relative flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm outline-none transition duration-200",
                  "hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-slate-400 active:translate-y-0 active:shadow-md",
                  app.glow,
                )}
              >
                <div className="flex items-start justify-between">
                  <span className={cn("flex size-14 items-center justify-center rounded-2xl transition group-hover:scale-105", app.tint)}>
                    <Icon className="size-7" />
                  </span>
                  <Kbd className="hidden md:inline-flex">{i + 1}</Kbd>
                </div>
                <div className="mt-auto pt-6">
                  <p className="text-lg font-semibold">{app.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{app.description}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    Open
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-auto hidden pt-10 text-center text-xs text-slate-400 md:block">
          Tip: press <Kbd>1</Kbd>, <Kbd>2</Kbd> or <Kbd>3</Kbd> to open a tool.
        </p>
      </div>
    </div>
  );
}
