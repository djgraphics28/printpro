"use client";

import { Minus, Plus, Scan } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { chunk, PAPERS, PX_PER_IN, sheetCss, type VoucherSettings } from "@/lib/voucher";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function sampleCodes(count: number) {
  return Array.from({ length: count }, (_, i) => `CODE${String(i + 1).padStart(4, "0")}`);
}

export function VoucherPreview({ settings, codes }: { settings: VoucherSettings; codes: string[] }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.6);
  const [zoom, setZoom] = useState(1);

  const paper = PAPERS[settings.paper];
  const pageW = paper.widthIn * PX_PER_IN;
  const pageH = paper.heightIn * PX_PER_IN;
  const per = settings.cols * settings.rows;
  const isSample = codes.length === 0;
  const pages = isSample ? [sampleCodes(per)] : chunk(codes, per);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const availW = Math.max(frame.clientWidth - 48, 120);
      const availH = Math.max(frame.clientHeight - 48, 120);
      // Fit one whole page on screen; users scroll for the rest.
      setFit(Math.min(availW / pageW, availH / pageH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageW, pageH]);

  const scale = fit * zoom;

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col lg:min-h-0">
      <style>{sheetCss(settings)}</style>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          {paper.detail} in preview
          {isSample ? " · sample layout" : ` · ${pages.length} page${pages.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => clamp(z - 0.15, MIN_ZOOM, MAX_ZOOM))}>
            <Minus />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => clamp(z + 0.15, MIN_ZOOM, MAX_ZOOM))}>
            <Plus />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Fit to screen" onClick={() => setZoom(1)}>
            <Scan />
          </Button>
        </div>
      </div>

      <div ref={frameRef} className="relative min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-200/60">
        <div className="flex min-w-fit flex-col items-center gap-6 p-6">
          {pages.map((page, p) => (
            <div key={p} className="relative">
              <div
                className="overflow-hidden rounded-sm bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
                style={{ width: pageW * scale, height: pageH * scale }}
              >
                <div
                  className={isSample ? "vm-page vm-sample" : "vm-page"}
                  style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                  {page.map((code) => (
                    <div key={code} className="vm-v">
                      <div className="vm-t">{settings.title}</div>
                      <div className="vm-s">{settings.subtitle}</div>
                      <div className="vm-c">{code}</div>
                    </div>
                  ))}
                </div>
              </div>
              {pages.length > 1 ? (
                <span className="absolute -top-2.5 -left-2.5 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {p + 1}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        {isSample ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <p className="rounded-full bg-slate-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Sample layout. Load codes to fill the sheet
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
