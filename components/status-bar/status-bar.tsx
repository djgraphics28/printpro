"use client";

import type { ReactNode } from "react";

import { useWorkstation } from "@/components/workstation/workstation-context";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-600">
      {children}
    </span>
  );
}

export function StatusBar() {
  const { layout, lowQuality, processing, state, photoSize } = useWorkstation();
  const photoCount = state.photos.length;
  const multi = photoSize.allowsMultiplePhotos;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>
          {layout.paper.name} • {layout.paper.widthMm} × {layout.paper.heightMm} mm
        </Chip>
        <Chip>{layout.photoSize.dimensionLabel}</Chip>
        {multi ? (
          <Chip>
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </Chip>
        ) : null}
        <Chip>
          {layout.quantity} {layout.quantity === 1 ? "copy" : "copies"}
        </Chip>
        <Chip>
          Cutting guides {layout.showCuttingGuides ? "ON" : "OFF"}
        </Chip>
        <Chip>Name {layout.showName ? "ON" : "OFF"}</Chip>
        <Chip>
          White background {state.whiteBackground ? "ON" : "OFF"}
        </Chip>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
        <span>Estimated paper usage</span>
        <span>Rows: {layout.rows}</span>
        <span>Columns: {layout.columns}</span>
        <span>Used height: {layout.usedHeightMm.toFixed(0)} mm</span>
      </div>
      {processing ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {photoCount > 1
            ? "Preparing photos… Removing backgrounds can take a few seconds the first time."
            : "Removing background and applying white… This can take a few seconds the first time."}
        </p>
      ) : null}
      {lowQuality ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {photoCount > 1
            ? "Some photos may appear low quality when printed. For best results, use higher-resolution photos."
            : "This image may appear low quality when printed. For best results, use a higher-resolution photo."}
        </p>
      ) : null}
    </div>
  );
}
