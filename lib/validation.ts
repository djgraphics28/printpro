import type { A4Layout } from "@/types/layout";
import type { CroppedImage, CustomerImage } from "@/types/photo";

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
  image: CustomerImage | null;
  cropped: CroppedImage | null;
  processing: boolean;
  layout: A4Layout;
  lowQuality: boolean;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.image) {
    issues.push({
      code: "no-image",
      level: "error",
      message: "Please upload a customer photo first.",
    });
    return issues;
  }

  if (input.processing || !input.cropped) {
    issues.push({
      code: input.processing ? "processing" : "crop-pending",
      level: "error",
      message: input.processing
        ? "Please wait — removing the background."
        : "Please wait for the photo to finish processing.",
    });
  }

  if (!input.layout.fits) {
    issues.push({
      code: "overflow",
      level: "error",
      message:
        "Too many photos for one A4 sheet. Please reduce the quantity or use another sheet.",
    });
  }

  if (input.lowQuality) {
    issues.push({
      code: "low-quality",
      level: "warning",
      message:
        "This image may appear low quality when printed. For best results, use a higher-resolution photo.",
    });
  }

  return issues;
}

export function getBlockingError(issues: ValidationIssue[]): ValidationIssue | undefined {
  return issues.find((issue) => issue.level === "error");
}
