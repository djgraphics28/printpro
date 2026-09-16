import { A4_PAPER, CUTTING_GUIDE, LAYOUT_DEFAULTS } from "@/lib/constants";
import { getPhotoSizeMm } from "@/lib/photo-sizes";
import type { PhotoSize } from "@/types/photo";
import type {
  A4Layout,
  LayoutInput,
  LayoutItem,
  PhotoSlot,
  SheetCapacity,
} from "@/types/layout";

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
 * How many photos of this size fit on one A4 sheet. The name band overlays the
 * photo rather than adding height, so capacity depends on the size alone.
 */
export function getSheetCapacity(photoSize: PhotoSize): SheetCapacity {
  const { widthMm, heightMm } = getPhotoSizeMm(photoSize);
  const gapMm = LAYOUT_DEFAULTS.gapMm;

  const availableWidthMm = A4_PAPER.widthMm - LAYOUT_DEFAULTS.sideMarginMm * 2;
  const availableHeightMm =
    A4_PAPER.heightMm - LAYOUT_DEFAULTS.topMarginMm - LAYOUT_DEFAULTS.bottomMarginMm;

  const maxColumns = Math.max(
    1,
    Math.floor((availableWidthMm + gapMm) / (widthMm + gapMm)),
  );
  const maxRows = Math.max(
    1,
    Math.floor((availableHeightMm + gapMm) / (heightMm + gapMm)),
  );

  return { maxColumns, maxRows, maxQuantity: maxColumns * maxRows };
}

/** Flatten per-photo copy counts into one slot-ordered list. */
function expandItems(items: LayoutItem[]): { photoId: string; name: string }[] {
  const expanded: { photoId: string; name: string }[] = [];
  for (const item of items) {
    for (let copy = 0; copy < item.quantity; copy += 1) {
      expanded.push({ photoId: item.photoId, name: item.name });
    }
  }
  return expanded;
}

/**
 * Deterministic A4 packer. Preview, print, and PDF all consume this result.
 * Photos are never scaled — if they do not fit, `fits` is false.
 * Copies are laid down in item order, so each photo's copies stay together.
 */
export function calculateA4Layout(input: LayoutInput): A4Layout {
  const { photoSize, items } = input;
  const { widthMm: photoWidthMm, heightMm: photoHeightMm } = getPhotoSizeMm(photoSize);
  const nameBlock = nameBlockHeightMm(input.showName, input.nameFontSizeMm);

  const entries = expandItems(items);
  const quantity = entries.length;

  const cellWidthMm = photoWidthMm;
  const cellHeightMm = photoHeightMm;

  const availableWidthMm =
    A4_PAPER.widthMm - LAYOUT_DEFAULTS.sideMarginMm * 2;
  const availableHeightMm =
    A4_PAPER.heightMm - LAYOUT_DEFAULTS.topMarginMm - LAYOUT_DEFAULTS.bottomMarginMm;

  const gapMm = LAYOUT_DEFAULTS.gapMm;

  const { maxColumns, maxRows, maxQuantity } = getSheetCapacity(photoSize);

  const preferred = Math.min(photoSize.preferredColumns, maxColumns, quantity);
  const preferredRows = preferred > 0 ? Math.ceil(quantity / preferred) : 0;

  const columns =
    preferred > 0 && preferredRows <= maxRows
      ? preferred
      : Math.max(1, Math.min(maxColumns, quantity));
  const rows = Math.ceil(quantity / columns);

  const usedWidthMm = Math.max(0, columns * cellWidthMm + (columns - 1) * gapMm);
  const usedHeightMm = Math.max(0, rows * cellHeightMm + (rows - 1) * gapMm);

  const startXMm = (A4_PAPER.widthMm - usedWidthMm) / 2;
  const startYMm = LAYOUT_DEFAULTS.topMarginMm;

  const pageBottomLimit = A4_PAPER.heightMm - LAYOUT_DEFAULTS.bottomMarginMm;
  const pageRightLimit = A4_PAPER.widthMm - LAYOUT_DEFAULTS.sideMarginMm;

  const slots: PhotoSlot[] = entries.map((entry, index) => {
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
      photoId: entry.photoId,
      name: entry.name,
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
    nameAlignment: input.nameAlignment,
    nameFontSizeMm: input.nameFontSizeMm,
    showCuttingGuides: input.showCuttingGuides,
    cuttingGuide: CUTTING_GUIDE,
    slots,
  };
}
