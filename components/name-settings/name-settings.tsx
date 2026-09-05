"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useWorkstation } from "@/components/workstation/workstation-context";
import {
  MAX_NAME_FONT_SIZE_MM,
  MIN_NAME_FONT_SIZE_MM,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { NameAlignment, NamePosition } from "@/types/photo";

const ALIGNMENTS: { id: NameAlignment; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const POSITIONS: { id: NamePosition; label: string }[] = [
  { id: "below", label: "Below" },
  { id: "above", label: "Above" },
];

export function NameSettings() {
  const { state, dispatch } = useWorkstation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="add-name"
          checked={state.addName}
          onCheckedChange={(checked) =>
            dispatch({ type: "SET_ADD_NAME", value: checked === true })
          }
        />
        <Label htmlFor="add-name" className="cursor-pointer">
          Add Name
        </Label>
      </div>

      {state.addName ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={state.customerName}
              placeholder="Juan Dela Cruz"
              autoComplete="off"
              onChange={(event) =>
                dispatch({ type: "SET_NAME", name: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Name font size</Label>
              <span className="text-xs text-slate-500">
                {state.nameFontSizeMm.toFixed(1)} mm
              </span>
            </div>
            <Slider
              min={MIN_NAME_FONT_SIZE_MM}
              max={MAX_NAME_FONT_SIZE_MM}
              step={0.1}
              value={[state.nameFontSizeMm]}
              onValueChange={([mm]) =>
                dispatch({ type: "SET_NAME_FONT_SIZE", mm })
              }
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700">
              Alignment
            </legend>
            <div className="grid grid-cols-3 gap-1.5">
              {ALIGNMENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "SET_NAME_ALIGN", align: item.id })
                  }
                  className={cn(
                    "h-8 rounded-md border text-xs font-medium",
                    state.nameAlignment === item.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700">
              Position
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {POSITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "SET_NAME_POSITION", position: item.id })
                  }
                  className={cn(
                    "h-8 rounded-md border text-xs font-medium",
                    state.namePosition === item.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
