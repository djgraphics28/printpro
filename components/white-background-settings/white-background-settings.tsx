"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useWorkstation } from "@/components/workstation/workstation-context";

export function WhiteBackgroundSettings() {
  const { state, dispatch, processing } = useWorkstation();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="white-background"
        className="mt-0.5"
        checked={state.whiteBackground}
        disabled={processing}
        onCheckedChange={(checked) =>
          dispatch({ type: "SET_WHITE_BACKGROUND", value: checked === true })
        }
      />
      <div>
        <Label htmlFor="white-background" className="cursor-pointer">
          White Background
        </Label>
        <p className="text-xs text-slate-500">
          Remove the backdrop and replace it with white. First use may take a
          few seconds.
        </p>
        {state.backgroundError ? (
          <p className="mt-1 text-xs text-red-600">{state.backgroundError}</p>
        ) : null}
      </div>
    </div>
  );
}
