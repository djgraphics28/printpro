"use client";

import { AlertTriangle, Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PhotoEntry } from "@/types/photo";

function PhotoRow({
  photo,
  index,
  selected,
  lowQuality,
  processing,
  showName,
}: {
  photo: PhotoEntry;
  index: number;
  selected: boolean;
  lowQuality: boolean;
  processing: boolean;
  showName: boolean;
}) {
  const { dispatch } = useWorkstation();
  const preview = photo.cropped?.url ?? photo.image.url;

  return (
    <li
      className={cn(
        "rounded-xl border transition-colors",
        selected
          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div className="flex items-start gap-3 p-2.5">
        <button
          type="button"
          aria-label={`Edit photo ${index + 1}`}
          aria-pressed={selected}
          onClick={() => dispatch({ type: "SET_ACTIVE_PHOTO", id: photo.id })}
          className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-900"
        >
          {/* Object URL of a local upload — Next's image optimizer cannot help here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
          {processing ? (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
              <Loader2 className="size-4 animate-spin text-white" />
            </span>
          ) : null}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_ACTIVE_PHOTO", id: photo.id })}
            className="block w-full text-left"
          >
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-slate-900">
                {photo.name.trim() || photo.image.file.name}
              </span>
              {lowQuality ? (
                <AlertTriangle
                  className="size-3.5 shrink-0 text-amber-500"
                  aria-label="Low print quality"
                />
              ) : null}
            </span>
            <span className="block text-[11px] text-slate-500">
              {photo.image.width} × {photo.image.height} px
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-7"
              aria-label={`Fewer copies of photo ${index + 1}`}
              disabled={photo.quantity <= MIN_QUANTITY}
              onClick={() =>
                dispatch({
                  type: "SET_PHOTO_QUANTITY",
                  id: photo.id,
                  quantity: photo.quantity - 1,
                })
              }
            >
              <Minus />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
              {photo.quantity}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-7"
              aria-label={`More copies of photo ${index + 1}`}
              disabled={photo.quantity >= MAX_QUANTITY}
              onClick={() =>
                dispatch({
                  type: "SET_PHOTO_QUANTITY",
                  id: photo.id,
                  quantity: photo.quantity + 1,
                })
              }
            >
              <Plus />
            </Button>
            <span className="text-[11px] text-slate-500">copies</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-7 text-slate-400 hover:text-red-600"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => dispatch({ type: "REMOVE_PHOTO", id: photo.id })}
            >
              <Trash2 />
            </Button>
          </div>

          {showName ? (
            <Input
              value={photo.name}
              placeholder="Juan Dela Cruz"
              autoComplete="off"
              aria-label={`Name printed on photo ${index + 1}`}
              className="h-8 text-sm"
              onChange={(event) =>
                dispatch({
                  type: "SET_PHOTO_NAME",
                  id: photo.id,
                  name: event.target.value,
                })
              }
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function PhotoList() {
  const { state, layout, lowQualityIds, processingIds } = useWorkstation();

  if (state.photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Photos on this sheet
        </p>
        <p
          className={cn(
            "text-[11px] tabular-nums",
            layout.fits ? "text-slate-400" : "text-red-600",
          )}
        >
          {layout.quantity} / {layout.maxQuantity} slots
        </p>
      </div>
      <ul className="space-y-2">
        {state.photos.map((photo, index) => (
          <PhotoRow
            key={photo.id}
            photo={photo}
            index={index}
            selected={photo.id === state.activePhotoId}
            lowQuality={lowQualityIds.includes(photo.id)}
            processing={processingIds.includes(photo.id)}
            showName={state.addName}
          />
        ))}
      </ul>
      {!layout.fits ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          Too many photos for one A4 sheet. Reduce the copies above or print a
          second sheet.
        </p>
      ) : null}
    </div>
  );
}
