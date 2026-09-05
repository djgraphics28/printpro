"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/constants";

export function QuantitySelector() {
  const { state, dispatch, layout } = useWorkstation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Quantity</p>
        <p className="text-[11px] text-slate-400">
          Max {layout.maxQuantity} on one A4
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Decrease quantity"
          disabled={state.quantity <= MIN_QUANTITY}
          onClick={() =>
            dispatch({ type: "SET_QUANTITY", quantity: state.quantity - 1 })
          }
        >
          <Minus />
        </Button>
        <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold tabular-nums">
          {state.quantity}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Increase quantity"
          disabled={state.quantity >= MAX_QUANTITY}
          onClick={() =>
            dispatch({ type: "SET_QUANTITY", quantity: state.quantity + 1 })
          }
        >
          <Plus />
        </Button>
      </div>
      {!layout.fits ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          Too many photos for one A4 sheet. Please reduce the quantity or use
          another sheet.
        </p>
      ) : null}
    </div>
  );
}
