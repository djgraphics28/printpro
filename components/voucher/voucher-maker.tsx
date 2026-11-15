"use client";

import { ClipboardPaste, FileSpreadsheet, Minus, Plus, Printer, RotateCcw, Upload } from "lucide-react";
import { type DragEvent, useEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { VoucherPreview } from "@/components/voucher/voucher-preview";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETTINGS,
  extractCodes,
  LIMITS,
  PAPERS,
  type PaperId,
  printVouchers,
  type VoucherSettings,
} from "@/lib/voucher";

const STORAGE_KEY = "printpro.voucher.settings";

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{children}</p>
  );
}

function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => set(value - 1)} className="flex h-full w-9 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30">
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            if (!Number.isNaN(n)) set(n);
          }}
          className="h-full w-full min-w-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => set(value + 1)} className="flex h-full w-9 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function VoucherMaker() {
  const [settings, setSettings] = useState<VoucherSettings>(DEFAULT_SETTINGS);
  const [codes, setCodes] = useState<string[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  // Remember title/subtitle/layout between visits (browser only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const per = settings.cols * settings.rows;
  const pageCount = Math.ceil(codes.length / per);
  const canPrint = codes.length > 0;

  function update<K extends keyof VoucherSettings>(key: K, value: VoucherSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function load(text: string, from: string) {
    const found = extractCodes(text);
    if (found.length === 0) {
      setNotice(`No codes found in ${from}. Codes need 4+ letters/digits with at least one digit.`);
      return;
    }
    setCodes(found);
    setSource(from);
    setNotice(null);
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    load(await file.text(), file.name);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  }

  function clear() {
    setCodes([]);
    setSource(null);
    setPaste("");
    setNotice(null);
  }

  function print() {
    if (canPrint) printVouchers(settings, codes);
  }

  // Ctrl/Cmd+P prints the voucher sheets instead of the app screen.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        if (codes.length > 0) printVouchers(settings, codes);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings, codes]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef2] text-slate-900 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <AppHeader>
        <Button type="button" variant="outline" onClick={clear} disabled={codes.length === 0 && !paste}>
          <RotateCcw />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </AppHeader>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:min-h-0 lg:flex-row">
        <aside className="order-2 w-full border-t border-slate-200/80 bg-white lg:order-1 lg:h-full lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-r">
          <div className="flex flex-col gap-5 p-4 md:p-5">
            <section className="space-y-3">
              <SectionTitle>Codes</SectionTitle>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                  dragging ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {source ? (
                  <>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <p className="max-w-full truncate text-sm font-medium">{source}</p>
                    <p className="text-xs text-slate-500">Click or drop to replace</p>
                  </>
                ) : (
                  <>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Upload className="size-5" />
                    </span>
                    <p className="text-sm font-medium">Upload or drop a CSV</p>
                    <p className="text-xs leading-5 text-slate-500">
                      Uses the <b>CODE</b> column, or one code per line
                    </p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void loadFile(e.target.files?.[0])} />
              </div>

              {showPaste ? (
                <div className="space-y-2">
                  <textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    autoFocus
                    placeholder="One code per line, or paste the whole table copied from the router page"
                    className="h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={!paste.trim()} onClick={() => load(paste, "pasted text")}>
                      Use pasted codes
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowPaste(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="secondary" className="w-full" onClick={() => setShowPaste(true)}>
                  <ClipboardPaste /> Paste codes instead
                </Button>
              )}

              {notice ? (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{notice}</p>
              ) : null}

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">{codes.length}</p>
                  <p className="text-[11px] text-slate-500">codes</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{pageCount}</p>
                  <p className="text-[11px] text-slate-500">{pageCount === 1 ? "page" : "pages"}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{per}</p>
                  <p className="text-[11px] text-slate-500">per page</p>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle>Voucher Text</SectionTitle>
              <div className="space-y-1.5">
                <Label htmlFor="vm-title" className="text-xs">Title</Label>
                <Input id="vm-title" value={settings.title} onChange={(e) => update("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-subtitle" className="text-xs">Subtitle</Label>
                <Input id="vm-subtitle" value={settings.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <SectionTitle>Sheet Layout</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PAPERS) as PaperId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update("paper", id)}
                    aria-pressed={settings.paper === id}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left transition-colors",
                      settings.paper === id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    <p className="text-sm font-medium">{PAPERS[id].label}</p>
                    <p className={cn("text-[10px]", settings.paper === id ? "text-slate-300" : "text-slate-400")}>
                      {PAPERS[id].detail}
                    </p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper id="vm-cols" label="Columns" value={settings.cols} min={LIMITS.cols[0]} max={LIMITS.cols[1]} onChange={(v) => update("cols", v)} />
                <Stepper id="vm-rows" label="Rows" value={settings.rows} min={LIMITS.rows[0]} max={LIMITS.rows[1]} onChange={(v) => update("rows", v)} />
              </div>
              <button type="button" onClick={() => setSettings((s) => ({ ...s, cols: DEFAULT_SETTINGS.cols, rows: DEFAULT_SETTINGS.rows }))} className="text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
                Reset to 4 × 14
              </button>
            </section>

            <div className="space-y-2 pt-1 lg:sticky lg:bottom-0 lg:bg-white lg:pt-2 lg:pb-1">
              <Button type="button" size="lg" className="w-full" disabled={!canPrint} onClick={print}>
                <Printer />
                {canPrint ? `Print ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : "Load codes to print"}
                <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">⌘P</Kbd>
              </Button>
              <p className="text-center text-[11px] text-slate-400">
                Print at <b>100% / Actual size</b>, margins none. Choose “Save as PDF” to export.
              </p>
            </div>
          </div>
        </aside>

        <main className="order-1 flex h-[70vh] min-h-[28rem] flex-col p-4 md:p-6 lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <VoucherPreview settings={settings} codes={codes} />
        </main>
      </div>
    </div>
  );
}
