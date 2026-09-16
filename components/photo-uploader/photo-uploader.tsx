"use client";

import { ImagePlus, Replace, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { isAcceptedImageFile, readImageFile } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import type { CustomerImage } from "@/types/photo";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic"
  );
}

/**
 * Loads dropped or picked files, keeping every one that decodes and reporting a
 * single message for the rest.
 */
async function loadImageBatch(files: File[]): Promise<{
  images: CustomerImage[];
  error: string | null;
}> {
  const images: CustomerImage[] = [];
  let heicCount = 0;
  let rejectedCount = 0;

  for (const file of files) {
    if (isHeic(file)) {
      heicCount += 1;
      continue;
    }

    if (!isAcceptedImageFile(file)) {
      rejectedCount += 1;
      continue;
    }

    try {
      const loaded = await readImageFile(file);
      images.push({ file, ...loaded });
    } catch {
      rejectedCount += 1;
    }
  }

  let error: string | null = null;
  if (heicCount > 0 && rejectedCount === 0 && images.length === 0) {
    error =
      "iPhone HEIC photos are not supported. Export or share the photo as JPG, PNG, or WEBP.";
  } else if (heicCount > 0 || rejectedCount > 0) {
    const skipped = heicCount + rejectedCount;
    error =
      images.length > 0
        ? `Skipped ${skipped} ${skipped === 1 ? "file" : "files"} — only JPG, PNG, and WEBP are supported.`
        : "Unsupported image format. Please use JPG, PNG, or WEBP.";
  }

  return { images, error };
}

export function PhotoUploader() {
  const { state, dispatch, photoSize } = useWorkstation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const multiple = photoSize.allowsMultiplePhotos;
  const photo = state.photos[0] ?? null;

  async function handleFiles(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) {
      return;
    }

    const { images, error } = await loadImageBatch(list);

    if (images.length > 0) {
      dispatch({ type: "ADD_PHOTOS", images });
    }
    if (error) {
      dispatch({ type: "SET_UPLOAD_ERROR", message: error });
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      multiple={multiple}
      className="hidden"
      onChange={(event) => {
        void handleFiles(event.target.files);
        event.target.value = "";
      }}
    />
  );

  // Single-photo sizes keep the compact summary card with Replace / Remove.
  if (!multiple && photo) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {photo.image.file.name}
            </p>
            <p className="text-xs text-slate-500">
              {photo.image.width} × {photo.image.height} px
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
              onClick={() => dispatch({ type: "REMOVE_PHOTO", id: photo.id })}
            >
              <Trash2 />
              Remove
            </Button>
          </div>
          {fileInput}
        </div>
        {state.uploadError ? (
          <p className="mt-2 text-sm text-red-600">{state.uploadError}</p>
        ) : null}
      </div>
    );
  }

  const hasPhotos = state.photos.length > 0;
  const compact = multiple && hasPhotos;

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
          "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-4" : "px-4 py-10",
          isDragging
            ? "border-slate-900 bg-slate-100"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-white shadow-sm",
            compact ? "mb-2 size-9" : "mb-3 size-12",
          )}
        >
          {isDragging ? (
            <Upload className="size-5 text-slate-800" />
          ) : (
            <ImagePlus className="size-5 text-slate-700" />
          )}
        </span>
        <span className="text-[15px] font-semibold text-slate-900">
          {compact
            ? "Add More Photos"
            : multiple
              ? "Upload Customer Photos"
              : "Upload Customer Photo"}
        </span>
        <span className="mt-1 text-sm text-slate-500">
          {multiple
            ? "Drag & drop or click to browse — pick several at once"
            : "Drag & drop or click to browse"}
        </span>
        {compact ? null : (
          <span className="mt-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            JPG • PNG • WEBP
          </span>
        )}
      </button>
      {fileInput}
      {state.uploadError ? (
        <p className="mt-2 text-sm text-red-600">{state.uploadError}</p>
      ) : null}
    </div>
  );
}
