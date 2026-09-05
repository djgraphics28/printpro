"use client";

import { ImagePlus, Replace, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { isAcceptedImageFile, readImageFile } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export function PhotoUploader() {
  const { state, dispatch } = useWorkstation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const name = file.name.toLowerCase();
    if (name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic") {
      dispatch({
        type: "SET_UPLOAD_ERROR",
        message:
          "iPhone HEIC photos are not supported. Export or share the photo as JPG, PNG, or WEBP.",
      });
      return;
    }

    if (!isAcceptedImageFile(file)) {
      dispatch({
        type: "SET_UPLOAD_ERROR",
        message: "Unsupported image format. Please use JPG, PNG, or WEBP.",
      });
      return;
    }

    try {
      const loaded = await readImageFile(file);
      dispatch({
        type: "SET_IMAGE",
        image: { file, ...loaded },
      });
    } catch {
      dispatch({
        type: "SET_UPLOAD_ERROR",
        message: "Unsupported image format. Please use JPG, PNG, or WEBP.",
      });
    }
  }

  if (state.image) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {state.image.file.name}
          </p>
          <p className="text-xs text-slate-500">
            {state.image.width} × {state.image.height} px
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Replace />
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "CLEAR_IMAGE" })}
          >
            <Trash2 />
            Remove
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          isDragging
            ? "border-slate-900 bg-slate-100"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
        )}
      >
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
          {isDragging ? (
            <Upload className="size-5 text-slate-800" />
          ) : (
            <ImagePlus className="size-5 text-slate-700" />
          )}
        </span>
        <span className="text-[15px] font-semibold text-slate-900">
          Upload Customer Photo
        </span>
        <span className="mt-1 text-sm text-slate-500">
          Drag & drop or click to browse
        </span>
        <span className="mt-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          JPG • PNG • WEBP
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {state.uploadError ? (
        <p className="mt-2 text-sm text-red-600">{state.uploadError}</p>
      ) : null}
    </div>
  );
}
