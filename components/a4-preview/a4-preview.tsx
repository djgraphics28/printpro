"use client";

import { Minus, Plus, Scan } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { A4Sheet } from "@/components/a4-sheet/a4-sheet";
import { Button } from "@/components/ui/button";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { mmToCssPx } from "@/lib/units";

const MIN_USER_ZOOM = 0.4;
const MAX_USER_ZOOM = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function A4Preview() {
  const { state, layout } = useWorkstation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.35);
  const [userZoom, setUserZoom] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const update = () => {
      const pad = 32;
      const sheetW = mmToCssPx(layout.paper.widthMm);
      const sheetH = mmToCssPx(layout.paper.heightMm);
      const availW = Math.max(frame.clientWidth - pad, 80);
      const availH = Math.max(frame.clientHeight - pad, 80);
      const next = Math.min(availW / sheetW, availH / sheetH, 1);
      setFitScale(Number.isFinite(next) && next > 0 ? next : 0.35);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [layout.paper.heightMm, layout.paper.widthMm]);

  const scale = fitScale * userZoom;
  const sheetW = mmToCssPx(layout.paper.widthMm);
  const sheetH = mmToCssPx(layout.paper.heightMm);

  function zoomBy(delta: number) {
    setUserZoom((current) => clamp(current + delta, MIN_USER_ZOOM, MAX_USER_ZOOM));
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col lg:min-h-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">A4 preview</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Zoom out preview"
            disabled={userZoom <= MIN_USER_ZOOM}
            onClick={() => zoomBy(-0.15)}
          >
            <Minus />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-slate-600">
            {Math.round(userZoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Zoom in preview"
            disabled={userZoom >= MAX_USER_ZOOM}
            onClick={() => zoomBy(0.15)}
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setUserZoom(1)}
          >
            <Scan />
            Fit page
          </Button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="preview-frame flex min-h-[50vh] flex-1 items-center justify-center overflow-auto rounded-xl bg-[#e4e6eb] lg:min-h-0"
        onWheel={(event) => {
          if (!(event.ctrlKey || event.metaKey)) {
            return;
          }
          event.preventDefault();
          zoomBy(event.deltaY > 0 ? -0.1 : 0.1);
        }}
      >
        <div
          className="my-3"
          style={{
            width: sheetW * scale,
            height: sheetH * scale,
          }}
        >
          <div
            className="a4-preview-scale origin-top-left"
            style={{
              width: sheetW,
              height: sheetH,
              transform: `scale(${scale})`,
            }}
          >
            <div className="a4-preview-paper relative shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80">
              <A4Sheet layout={layout} imageUrl={state.cropped?.url ?? null} />
              {!state.cropped ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-[12%] text-center text-[3.2mm] text-slate-400">
                  Upload a customer photo to preview the print
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
