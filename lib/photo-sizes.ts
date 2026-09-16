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
    allowsMultiplePhotos: false,
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
    allowsMultiplePhotos: false,
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
    allowsMultiplePhotos: false,
  },
  {
    id: "wallet",
    name: "Wallet",
    widthInches: 2.5,
    heightInches: 3.5,
    defaultQuantity: 6,
    preferredColumns: 3,
    shortcut: "4",
    dimensionLabel: "2.5 × 3.5 inch",
    // Wallet prints are big enough that mixing customers on one sheet is worth it.
    allowsMultiplePhotos: true,
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
