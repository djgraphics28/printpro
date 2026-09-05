import {
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_IMAGE_TYPES,
  MIN_PRINT_DPI,
} from "@/lib/constants";
import type { CropArea, PhotoSize } from "@/types/photo";

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return true;
  }

  const name = file.name.toLowerCase();
  return ACCEPTED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

export async function readImageFile(file: File): Promise<{
  url: string;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(url);
    return { url, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rotatedBounds(width: number, height: number, rotation: number) {
  const radians = toRadians(rotation);
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/**
 * Crop + rotate at native pixel resolution. No extra JPEG recompression.
 */
export async function cropImageToBlob(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
): Promise<Blob> {
  const image = await loadHtmlImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  const bounds = rotatedBounds(image.naturalWidth, image.naturalHeight, rotation);
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(toRadians(rotation));
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.drawImage(image, 0, 0);

  const cropped = document.createElement("canvas");
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) {
    throw new Error("Canvas is not available");
  }

  cropped.width = Math.max(1, Math.round(pixelCrop.width));
  cropped.height = Math.max(1, Math.round(pixelCrop.height));
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = "high";
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    cropped.width,
    cropped.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    cropped.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Failed to crop image");
  }

  return blob;
}

export function isLowPrintQuality(
  crop: CropArea | null,
  photoSize: PhotoSize,
): boolean {
  if (!crop) {
    return false;
  }

  const dpiX = crop.width / photoSize.widthInches;
  const dpiY = crop.height / photoSize.heightInches;
  return dpiX < MIN_PRINT_DPI || dpiY < MIN_PRINT_DPI;
}

export function revokeUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
