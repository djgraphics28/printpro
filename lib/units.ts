export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;
export const CSS_PX_PER_INCH = 96;

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function mmToPoints(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

export function mmToCssPx(mm: number): number {
  return (mm / MM_PER_INCH) * CSS_PX_PER_INCH;
}

export function formatMm(mm: number, digits = 1): string {
  return `${mm.toFixed(digits)} mm`;
}

export function formatInches(inches: number, digits = 2): string {
  const rounded = Number(inches.toFixed(digits));
  return `${rounded} × ${rounded}`;
}
