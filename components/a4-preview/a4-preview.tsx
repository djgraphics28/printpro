"use client";

import { useEffect, useRef, useState } from "react";

import { A4Sheet } from "@/components/a4-sheet/a4-sheet";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { mmToCssPx } from "@/lib/units";
import { cn } from "@/lib/utils";

const DESKTOP_MIN_WIDTH = 1024;

export function A4Preview() {
  const { state, layout } = useWorkstation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const update = () => {
      const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
      setIsDesktop(desktop);

      const pad = desktop ? 40 : 24;
      const sheetW = mmToCssPx(layout.paper.widthMm);
      const sheetH = mmToCssPx(layout.paper.heightMm);
      const widthScale = (frame.clientWidth - pad) / sheetW;

      const next = desktop
        ? Math.min(
            widthScale,
            (frame.clientHeight - pad) / sheetH,
            1,
          )
        : Math.min(Math.max(widthScale, 0.2), 1);

      setScale(Number.isFinite(next) && next > 0 ? next : 0.4);
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

  const sheetW = mmToCssPx(layout.paper.widthMm);
  const sheetH = mmToCssPx(layout.paper.heightMm);

  return (
    <div
      ref={frameRef}
      className={cn(
        "preview-frame flex w-full justify-center",
        isDesktop
          ? "min-h-0 flex-1 items-center overflow-hidden"
          : "items-start overflow-x-auto overflow-y-auto",
      )}
    >
      <div
        className={cn(!isDesktop && "my-2")}
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
  );
}
