import type { A4Layout } from "@/types/layout";
import type { PhotoEntry } from "@/types/photo";

export type ValidationIssue = {
  code:
    | "no-image"
    | "unsupported"
    | "low-quality"
    | "overflow"
    | "crop-pending"
    | "processing";
  level: "error" | "warning";
  message: string;
};

export function validatePrintReady(input: {
  photos: PhotoEntry[];
  processing: boolean;
  layout: A4Layout;
  lowQualityCount: number;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.photos.length === 0) {
    issues.push({
      code: "no-image",
      level: "error",
      message: "Please upload a customer photo first.",
    });
    return issues;
  }

  const pending = input.photos.filter((photo) => !photo.cropped).length;
  const many = input.photos.length > 1;

  if (input.processing || pending > 0) {
    issues.push({
      code: input.processing ? "processing" : "crop-pending",
      level: "error",
      message: input.processing
        ? many
          ? "Please wait — preparing the photos."
          : "Please wait — removing the background."
        : many
          ? "Please wait for every photo to finish processing."
          : "Please wait for the photo to finish processing.",
    });
  }

  if (!input.layout.fits) {
    issues.push({
      code: "overflow",
      level: "error",
      message: many
        ? "Too many photos for one A4 sheet. Please reduce the quantities or use another sheet."
        : "Too many photos for one A4 sheet. Please reduce the quantity or use another sheet.",
    });
  }

  if (input.lowQualityCount > 0) {
    issues.push({
      code: "low-quality",
      level: "warning",
      message: many
        ? `${input.lowQualityCount} of ${input.photos.length} photos may appear low quality when printed. For best results, use higher-resolution photos.`
        : "This image may appear low quality when printed. For best results, use a higher-resolution photo.",
    });
  }

  return issues;
}

export function getBlockingError(issues: ValidationIssue[]): ValidationIssue | undefined {
  return issues.find((issue) => issue.level === "error");
}
