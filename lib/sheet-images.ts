import type { PhotoEntry } from "@/types/photo";

/** Cropped preview/print URL per photo id, skipping photos still processing. */
export function croppedUrlsByPhotoId(
  photos: PhotoEntry[],
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const photo of photos) {
    if (photo.cropped) {
      urls[photo.id] = photo.cropped.url;
    }
  }
  return urls;
}

/** Cropped blobs per photo id, for PDF embedding. */
export function croppedBlobsByPhotoId(
  photos: PhotoEntry[],
): Record<string, Blob> {
  const blobs: Record<string, Blob> = {};
  for (const photo of photos) {
    if (photo.cropped) {
      blobs[photo.id] = photo.cropped.blob;
    }
  }
  return blobs;
}
