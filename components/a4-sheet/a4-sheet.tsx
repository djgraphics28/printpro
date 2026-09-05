import type { A4Layout, PhotoSlot } from "@/types/layout";

type A4SheetProps = {
  layout: A4Layout;
  imageUrl: string | null;
};

function PhotoCell({
  slot,
  layout,
  imageUrl,
}: {
  slot: PhotoSlot;
  layout: A4Layout;
  imageUrl: string | null;
}) {
  const guide = layout.showCuttingGuides
    ? `${layout.cuttingGuide.widthMm}mm solid ${layout.cuttingGuide.color}`
    : "none";

  return (
    <>
      <div
        className="a4-photo"
        style={{
          position: "absolute",
          left: `${slot.photoXMm}mm`,
          top: `${slot.photoYMm}mm`,
          width: `${slot.photoWidthMm}mm`,
          height: `${slot.photoHeightMm}mm`,
          border: guide,
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
              fontSize: "3mm",
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
            left: `${slot.nameXMm}mm`,
            top: `${slot.nameYMm}mm`,
            width: `${slot.nameWidthMm}mm`,
            height: `${slot.nameHeightMm}mm`,
            display: "flex",
            alignItems: "center",
            justifyContent:
              layout.nameAlignment === "left"
                ? "flex-start"
                : layout.nameAlignment === "right"
                  ? "flex-end"
                  : "center",
            boxSizing: "border-box",
            padding: "0 1.2mm",
            background: "#ffffff",
            fontSize: `${layout.nameFontSizeMm}mm`,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#111111",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {layout.name}
        </div>
      ) : null}
    </>
  );
}

export function A4Sheet({ layout, imageUrl }: A4SheetProps) {
  return (
    <div
      className="a4-sheet"
      style={{
        width: `${layout.paper.widthMm}mm`,
        height: `${layout.paper.heightMm}mm`,
        position: "relative",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {layout.slots.map((slot) => (
        <PhotoCell
          key={slot.index}
          slot={slot}
          layout={layout}
          imageUrl={imageUrl}
        />
      ))}
    </div>
  );
}
