"use client";

import { useEffect, useRef, useState } from "react";

import { A4Sheet } from "@/components/a4-sheet/a4-sheet";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { mmToCssPx } from "@/lib/units";

export function A4Preview() {
  const { state, layout } = useWorkstation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const update = () => {
      const pad = 40;
      const sheetW = mmToCssPx(layout.paper.widthMm);
      const sheetH = mmToCssPx(layout.paper.heightMm);
      const next = Math.min(
        (frame.clientWidth - pad) / sheetW,
        (frame.clientHeight - pad) / sheetH,
        1,
      );
      setScale(Number.isFinite(next) && next > 0 ? next : 0.4);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [layout.paper.heightMm, layout.paper.widthMm]);

  const sheetW = mmToCssPx(layout.paper.widthMm);
  const sheetH = mmToCssPx(layout.paper.heightMm);

  return (
    <div
      ref={frameRef}
      className="preview-frame flex min-h-0 flex-1 items-center justify-center overflow-hidden"
    >
      <div
        className="overflow-hidden"
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
