import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { mmToPoints } from "@/lib/units";
import type { A4Layout } from "@/types/layout";

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildPdfFilename(layout: A4Layout): string {
  const named = sanitizeFilename(layout.name);
  const size = sanitizeFilename(layout.photoSize.id);
  return named ? `${named}-${size}-a4.pdf` : `id-photo-${size}-a4.pdf`;
}

export async function downloadA4Pdf(layout: A4Layout, imageBlob: Blob) {
  const pdf = await PDFDocument.create();
  const pageWidth = mmToPoints(layout.paper.widthMm);
  const pageHeight = mmToPoints(layout.paper.heightMm);
  const page = pdf.addPage([pageWidth, pageHeight]);

  const bytes = await imageBlob.arrayBuffer();
  const isPng =
    imageBlob.type === "image/png" ||
    new Uint8Array(bytes).slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";

  const image = isPng
    ? await pdf.embedPng(bytes)
    : await pdf.embedJpg(bytes);

  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const guide = rgb(0, 0, 0);
  const ink = rgb(0.07, 0.07, 0.07);

  for (const slot of layout.slots) {
    if (slot.overflows) {
      continue;
    }

    const x = mmToPoints(slot.photoXMm);
    const y = pageHeight - mmToPoints(slot.photoYMm) - mmToPoints(slot.photoHeightMm);
    const width = mmToPoints(slot.photoWidthMm);
    const height = mmToPoints(slot.photoHeightMm);

    page.drawImage(image, { x, y, width, height });

    if (layout.showCuttingGuides) {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: guide,
        borderOpacity: 0.25,
        borderWidth: mmToPoints(layout.cuttingGuide.widthMm),
      });
    }

    if (layout.showName && layout.name) {
      const fontSize = mmToPoints(layout.nameFontSizeMm);
      const boxX = mmToPoints(slot.nameXMm);
      const boxWidth = mmToPoints(slot.nameWidthMm);
      const boxHeight = mmToPoints(slot.nameHeightMm);
      const boxY = pageHeight - mmToPoints(slot.nameYMm) - boxHeight;
      const textWidth = font.widthOfTextAtSize(layout.name, fontSize);
      const pad = mmToPoints(1.2);
      let nameX = boxX + pad;

      if (layout.nameAlignment === "center") {
        nameX = boxX + Math.max(pad, (boxWidth - textWidth) / 2);
      } else if (layout.nameAlignment === "right") {
        nameX = boxX + Math.max(pad, boxWidth - textWidth - pad);
      }

      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
      });

      page.drawText(layout.name, {
        x: nameX,
        y: boxY + (boxHeight - fontSize) / 2,
        size: fontSize,
        font,
        color: ink,
        maxWidth: boxWidth - pad * 2,
      });
    }
  }

  const pdfBytes = await pdf.save();
  const copy = Uint8Array.from(pdfBytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildPdfFilename(layout);
  anchor.click();
  URL.revokeObjectURL(url);
}
