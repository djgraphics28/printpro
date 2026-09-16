"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/constants";

/** Copy count for single-photo sizes. Wallet uses the per-photo list instead. */
export function QuantitySelector() {
  const { state, dispatch, layout } = useWorkstation();
  const photo = state.photos[0] ?? null;
  const quantity = photo?.quantity ?? 0;

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
          disabled={!photo || quantity <= MIN_QUANTITY}
          onClick={() =>
            photo &&
            dispatch({
              type: "SET_PHOTO_QUANTITY",
              id: photo.id,
              quantity: quantity - 1,
            })
          }
        >
          <Minus />
        </Button>
        <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold tabular-nums">
          {quantity}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Increase quantity"
          disabled={!photo || quantity >= MAX_QUANTITY}
          onClick={() =>
            photo &&
            dispatch({
              type: "SET_PHOTO_QUANTITY",
              id: photo.id,
              quantity: quantity + 1,
            })
          }
        >
          <Plus />
        </Button>
      </div>
      {!layout.fits && layout.quantity > 0 ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          Too many photos for one A4 sheet. Please reduce the quantity or use
          another sheet.
        </p>
      ) : null}
    </div>
  );
}
