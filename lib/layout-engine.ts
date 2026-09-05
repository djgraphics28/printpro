import { A4_PAPER, CUTTING_GUIDE, LAYOUT_DEFAULTS } from "@/lib/constants";
import { getPhotoSizeMm } from "@/lib/photo-sizes";
import type { A4Layout, LayoutInput, PhotoSlot } from "@/types/layout";

function nameBlockHeightMm(showName: boolean, nameFontSizeMm: number): {
  textHeightMm: number;
} {
  if (!showName) {
    return { textHeightMm: 0 };
  }

  return {
    textHeightMm:
      nameFontSizeMm * LAYOUT_DEFAULTS.nameLineHeight + LAYOUT_DEFAULTS.namePadMm,
  };
}

/**
 * Deterministic A4 packer. Preview and print both consume this result.
 * Photos are never scaled — if they do not fit, `fits` is false.
 */
export function calculateA4Layout(input: LayoutInput): A4Layout {
  const { photoSize, quantity } = input;
  const { widthMm: photoWidthMm, heightMm: photoHeightMm } = getPhotoSizeMm(photoSize);
  const nameBlock = nameBlockHeightMm(input.showName, input.nameFontSizeMm);

  const cellWidthMm = photoWidthMm;
  const cellHeightMm = photoHeightMm;

  const availableWidthMm =
    A4_PAPER.widthMm - LAYOUT_DEFAULTS.sideMarginMm * 2;
  const availableHeightMm =
    A4_PAPER.heightMm - LAYOUT_DEFAULTS.topMarginMm - LAYOUT_DEFAULTS.bottomMarginMm;

  const gapMm = LAYOUT_DEFAULTS.gapMm;

  const maxColumns = Math.max(
    1,
    Math.floor((availableWidthMm + gapMm) / (cellWidthMm + gapMm)),
  );
  const maxRows = Math.max(
    1,
    Math.floor((availableHeightMm + gapMm) / (cellHeightMm + gapMm)),
  );
  const maxQuantity = maxColumns * maxRows;

  const preferred = Math.min(photoSize.preferredColumns, maxColumns, quantity);
  const preferredRows = Math.ceil(quantity / preferred);

  const columns =
    preferredRows <= maxRows ? preferred : Math.min(maxColumns, quantity);
  const rows = Math.ceil(quantity / columns);

  const usedWidthMm = columns * cellWidthMm + (columns - 1) * gapMm;
  const usedHeightMm = rows * cellHeightMm + (rows - 1) * gapMm;

  const startXMm = (A4_PAPER.widthMm - usedWidthMm) / 2;
  const startYMm = LAYOUT_DEFAULTS.topMarginMm;

  const pageBottomLimit = A4_PAPER.heightMm - LAYOUT_DEFAULTS.bottomMarginMm;
  const pageRightLimit = A4_PAPER.widthMm - LAYOUT_DEFAULTS.sideMarginMm;

  const slots: PhotoSlot[] = Array.from({ length: quantity }, (_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const cellX = startXMm + col * (cellWidthMm + gapMm);
    const cellY = startYMm + row * (cellHeightMm + gapMm);

    const nameIsAbove = input.namePosition === "above" && input.showName;
    const photoXMm = cellX;
    const photoYMm = cellY;
    const nameXMm = cellX;
    const nameYMm = nameIsAbove
      ? cellY
      : cellY + photoHeightMm - nameBlock.textHeightMm;

    const bottom = photoYMm + photoHeightMm;
    const right = photoXMm + photoWidthMm;

    return {
      index,
      photoXMm,
      photoYMm,
      photoWidthMm,
      photoHeightMm,
      nameXMm,
      nameYMm,
      nameWidthMm: photoWidthMm,
      nameHeightMm: nameBlock.textHeightMm,
      overflows: bottom > pageBottomLimit || right > pageRightLimit || photoXMm < 0,
    };
  });

  const fits =
    slots.length > 0 &&
    slots.every((slot) => !slot.overflows) &&
    usedWidthMm <= availableWidthMm + 0.01 &&
    usedHeightMm <= availableHeightMm + 0.01;

  return {
    paper: A4_PAPER,
    photoSize,
    quantity,
    columns,
    rows,
    maxColumns,
    maxRows,
    maxQuantity,
    gapMm,
    topMarginMm: LAYOUT_DEFAULTS.topMarginMm,
    usedWidthMm,
    usedHeightMm,
    usagePercent: Math.min(100, (usedHeightMm / A4_PAPER.heightMm) * 100),
    fits,
    showName: input.showName,
    name: input.name.trim(),
    nameAlignment: input.nameAlignment,
    nameFontSizeMm: input.nameFontSizeMm,
    showCuttingGuides: input.showCuttingGuides,
    cuttingGuide: CUTTING_GUIDE,
    slots,
  };
}
