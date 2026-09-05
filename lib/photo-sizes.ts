import { inchesToMm } from "@/lib/units";
import type { PhotoSize } from "@/types/photo";

/**
 * Central catalog of ID photo sizes.
 * Add a new size here — the layout engine, presets, and cropper pick it up automatically.
 */
export const PHOTO_SIZES: PhotoSize[] = [
  {
    id: "2x2",
    name: "2 × 2",
    widthInches: 2,
    heightInches: 2,
    defaultQuantity: 4,
    preferredColumns: 4,
    shortcut: "1",
    dimensionLabel: "2 × 2 inch",
  },
  {
    id: "1x1",
    name: "1 × 1",
    widthInches: 1,
    heightInches: 1,
    defaultQuantity: 8,
    preferredColumns: 8,
    shortcut: "2",
    dimensionLabel: "1 × 1 inch",
  },
  {
    id: "passport",
    name: "Passport",
    // ICAO / ISO/IEC 39794 standard used in PH, EU, UK, and most countries.
    widthInches: 35 / 25.4,
    heightInches: 45 / 25.4,
    defaultQuantity: 4,
    preferredColumns: 4,
    shortcut: "3",
    dimensionLabel: "35 × 45 mm",
  },
];

export const DEFAULT_PHOTO_SIZE_ID = "2x2";

export function getPhotoSize(id: string): PhotoSize {
  const size = PHOTO_SIZES.find((item) => item.id === id);
  if (!size) {
    throw new Error(`Unknown photo size: ${id}`);
  }
  return size;
}

export function getPhotoAspect(size: PhotoSize): number {
  return size.widthInches / size.heightInches;
}

export function getPhotoSizeMm(size: PhotoSize): { widthMm: number; heightMm: number } {
  return {
    widthMm: inchesToMm(size.widthInches),
    heightMm: inchesToMm(size.heightInches),
  };
}

export function getPhotoSizeByShortcut(key: string): PhotoSize | undefined {
  return PHOTO_SIZES.find((item) => item.shortcut === key);
}
