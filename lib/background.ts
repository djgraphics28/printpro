import { loadHtmlImage, revokeUrl } from "@/lib/image-utils";

async function blobFromImage(
  image: HTMLImageElement,
  fillWhite: boolean,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  if (fillWhite) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Failed to render white background");
  }

  return blob;
}

/**
 * Remove the photo backdrop in the browser, then composite onto white.
 * The original file is never modified.
 */
export async function applyWhiteBackground(source: Blob): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");

  const cutout = await removeBackground(source, {
    device: "gpu",
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 1,
    },
  });

  const cutoutUrl = URL.createObjectURL(cutout);
  try {
    const image = await loadHtmlImage(cutoutUrl);
    return await blobFromImage(image, true);
  } finally {
    revokeUrl(cutoutUrl);
  }
}
