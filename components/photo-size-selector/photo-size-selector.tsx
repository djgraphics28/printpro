"use client";

import { Kbd } from "@/components/ui/kbd";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { PHOTO_SIZES } from "@/lib/photo-sizes";
import { cn } from "@/lib/utils";

export function PhotoSizeSelector() {
  const { state, dispatch } = useWorkstation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Photo Size</p>
        <p className="text-[11px] text-slate-400">Presets 1–3</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PHOTO_SIZES.map((size) => {
          const selected = state.photoSizeId === size.id;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => dispatch({ type: "SET_SIZE", id: size.id })}
              className={cn(
                "relative rounded-xl border px-2 py-3 text-left transition-colors",
                selected
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span className="block text-[15px] font-semibold tracking-tight">
                {size.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[11px]",
                  selected ? "text-slate-300" : "text-slate-500",
                )}
              >
                {size.defaultQuantity} Photos
              </span>
              <Kbd
                className={cn(
                  "absolute top-2 right-2",
                  selected && "border-slate-700 bg-slate-800 text-slate-300",
                )}
              >
                {size.shortcut}
              </Kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
