import type { A4Layout, PhotoSlot } from "@/types/layout";

type SheetVariant = "preview" | "print";

type A4SheetProps = {
  layout: A4Layout;
  imageUrl: string | null;
  variant?: SheetVariant;
};

function pct(mm: number, paperMm: number): string {
  return `${(mm / paperMm) * 100}%`;
}

function PhotoCell({
  slot,
  layout,
  imageUrl,
  variant,
}: {
  slot: PhotoSlot;
  layout: A4Layout;
  imageUrl: string | null;
  variant: SheetVariant;
}) {
  const paper = layout.paper;
  const isPrint = variant === "print";

  const photoBox = isPrint
    ? {
        left: `${slot.photoXMm}mm`,
        top: `${slot.photoYMm}mm`,
        width: `${slot.photoWidthMm}mm`,
        height: `${slot.photoHeightMm}mm`,
        border: layout.showCuttingGuides
          ? `${layout.cuttingGuide.widthMm}mm solid ${layout.cuttingGuide.color}`
          : "none",
      }
    : {
        left: pct(slot.photoXMm, paper.widthMm),
        top: pct(slot.photoYMm, paper.heightMm),
        width: pct(slot.photoWidthMm, paper.widthMm),
        height: pct(slot.photoHeightMm, paper.heightMm),
        border: layout.showCuttingGuides
          ? `0.08cqw solid ${layout.cuttingGuide.color}`
          : "none",
      };

  const nameBox = isPrint
    ? {
        left: `${slot.nameXMm}mm`,
        top: `${slot.nameYMm}mm`,
        width: `${slot.nameWidthMm}mm`,
        height: `${slot.nameHeightMm}mm`,
        padding: "0 1.2mm",
        fontSize: `${layout.nameFontSizeMm}mm`,
      }
    : {
        left: pct(slot.nameXMm, paper.widthMm),
        top: pct(slot.nameYMm, paper.heightMm),
        width: pct(slot.nameWidthMm, paper.widthMm),
        height: pct(slot.nameHeightMm, paper.heightMm),
        padding: "0 0.6cqw",
        fontSize: `${(layout.nameFontSizeMm / paper.heightMm) * 100}cqh`,
      };

  return (
    <>
      <div
        className="a4-photo"
        style={{
          position: "absolute",
          ...photoBox,
          boxSizing: "border-box",
          overflow: "hidden",
          background: imageUrl ? "#111" : "#f1f5f9",
        }}
      >
        {imageUrl ? (
          // Cropped blob already matches the ID aspect ratio.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: isPrint ? "3mm" : "2.2cqh",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Photo
          </div>
        )}
      </div>
      {layout.showName && layout.name ? (
        <div
          className="a4-name"
          style={{
            position: "absolute",
            zIndex: 2,
            ...nameBox,
            display: "flex",
            alignItems: "center",
            justifyContent:
              layout.nameAlignment === "left"
                ? "flex-start"
                : layout.nameAlignment === "right"
                  ? "flex-end"
                  : "center",
            boxSizing: "border-box",
            background: "#ffffff",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#111111",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {layout.name}
        </div>
      ) : null}
    </>
  );
}

export function A4Sheet({ layout, imageUrl, variant = "print" }: A4SheetProps) {
  const isPrint = variant === "print";

  return (
    <div
      className="a4-sheet"
      style={{
        width: isPrint ? `${layout.paper.widthMm}mm` : "100%",
        height: isPrint ? `${layout.paper.heightMm}mm` : "100%",
        position: "relative",
        background: "#ffffff",
        overflow: "hidden",
        containerType: isPrint ? undefined : "size",
      }}
    >
      {layout.slots.map((slot) => (
        <PhotoCell
          key={slot.index}
          slot={slot}
          layout={layout}
          imageUrl={imageUrl}
          variant={variant}
        />
      ))}
    </div>
  );
}
