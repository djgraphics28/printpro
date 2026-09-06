import type { CuttingGuideStyle, PaperSpec } from "@/types/layout";

export const A4_PAPER: PaperSpec = {
  id: "A4",
  name: "A4",
  widthMm: 210,
  heightMm: 297,
};

export const LAYOUT_DEFAULTS = {
  topMarginMm: 8,
  sideMarginMm: 3,
  bottomMarginMm: 10,
  gapMm: 0,
  nameGapMm: 0,
  nameLineHeight: 1.45,
  namePadMm: 1.1,
} as const;

export const CUTTING_GUIDE: CuttingGuideStyle = {
  widthMm: 0.12,
  color: "rgba(0, 0, 0, 0.25)",
};

export const MIN_PRINT_DPI = 200;
export const TARGET_PRINT_DPI = 300;

/** Cropper zoom range — low enough for large phone photos, high enough for tight face crops. */
export const CROP_MIN_ZOOM = 0.1;
export const CROP_MAX_ZOOM = 8;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 40;

export const DEFAULT_NAME_FONT_SIZE_MM = 2.8;
export const MIN_NAME_FONT_SIZE_MM = 2;
export const MAX_NAME_FONT_SIZE_MM = 4.5;

export const PRINT_REMINDER = {
  title: "Check printer settings",
  body: "For accurate ID photo sizes, make sure your printer settings use:",
  settings: [
    "Paper: A4",
    "Scale: 100%",
    "Actual Size: ON",
    "Fit to Page: OFF",
  ],
} as const;
