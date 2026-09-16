"use client";

import { A4Sheet } from "@/components/a4-sheet/a4-sheet";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { croppedUrlsByPhotoId } from "@/lib/sheet-images";

export function A4PrintLayout() {
  const { state, layout } = useWorkstation();

  return (
    <div className="print-root" hidden aria-hidden>
      <A4Sheet
        variant="print"
        layout={layout}
        images={croppedUrlsByPhotoId(state.photos)}
      />
    </div>
  );
}
