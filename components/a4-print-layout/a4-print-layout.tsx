"use client";

import { A4Sheet } from "@/components/a4-sheet/a4-sheet";
import { useWorkstation } from "@/components/workstation/workstation-context";

export function A4PrintLayout() {
  const { state, layout } = useWorkstation();

  return (
    <div className="print-root" hidden aria-hidden>
      <A4Sheet
        variant="print"
        layout={layout}
        imageUrl={state.cropped?.url ?? null}
      />
    </div>
  );
}
