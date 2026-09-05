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

export type A4Layout = {
  paper: PaperSpec;
  photoSize: PhotoSize;
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
  name: string;
  nameAlignment: NameAlignment;
  nameFontSizeMm: number;
  showCuttingGuides: boolean;
  cuttingGuide: CuttingGuideStyle;
  slots: PhotoSlot[];
};

export type LayoutInput = {
  photoSize: PhotoSize;
  quantity: number;
  showName: boolean;
  name: string;
  nameFontSizeMm: number;
  nameAlignment: NameAlignment;
  namePosition: "below" | "above";
  showCuttingGuides: boolean;
};
