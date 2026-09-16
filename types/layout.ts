import type { NameAlignment, PhotoSize } from "./photo";

export type PaperSpec = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
};

export type CuttingGuideStyle = {
  widthMm: number;
  color: string;
};

export type PhotoSlot = {
  index: number;
  /** Which uploaded photo prints in this slot. */
  photoId: string;
  /** Name printed on this slot — per photo, not per sheet. */
  name: string;
  photoXMm: number;
  photoYMm: number;
  photoWidthMm: number;
  photoHeightMm: number;
  nameXMm: number;
  nameYMm: number;
  nameWidthMm: number;
  nameHeightMm: number;
  overflows: boolean;
};

export type SheetCapacity = {
  maxColumns: number;
  maxRows: number;
  maxQuantity: number;
};

export type A4Layout = {
  paper: PaperSpec;
  photoSize: PhotoSize;
  /** Total copies across every photo on the sheet. */
  quantity: number;
  columns: number;
  rows: number;
  maxColumns: number;
  maxRows: number;
  maxQuantity: number;
  gapMm: number;
  topMarginMm: number;
  usedWidthMm: number;
  usedHeightMm: number;
  usagePercent: number;
  fits: boolean;
  showName: boolean;
  nameAlignment: NameAlignment;
  nameFontSizeMm: number;
  showCuttingGuides: boolean;
  cuttingGuide: CuttingGuideStyle;
  slots: PhotoSlot[];
};

/** One photo's share of the sheet. */
export type LayoutItem = {
  photoId: string;
  quantity: number;
  name: string;
};

export type LayoutInput = {
  photoSize: PhotoSize;
  items: LayoutItem[];
  showName: boolean;
  nameFontSizeMm: number;
  nameAlignment: NameAlignment;
  namePosition: "below" | "above";
  showCuttingGuides: boolean;
};
