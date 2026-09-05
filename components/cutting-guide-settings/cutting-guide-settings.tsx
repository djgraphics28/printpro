"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useWorkstation } from "@/components/workstation/workstation-context";

export function CuttingGuideSettings() {
  const { state, dispatch } = useWorkstation();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="cutting-guides"
        className="mt-0.5"
        checked={state.showCuttingGuides}
        onCheckedChange={(checked) =>
          dispatch({ type: "SET_CUTTING_GUIDES", value: checked === true })
        }
      />
      <div>
        <Label htmlFor="cutting-guides" className="cursor-pointer">
          Show Cutting Guides
        </Label>
        <p className="text-xs text-slate-500">
          Thin low-opacity borders for cutting
        </p>
      </div>
    </div>
  );
}
