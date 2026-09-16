export type PhotoSize = {
  id: string;
  name: string;
  widthInches: number;
  heightInches: number;
  defaultQuantity: number;
  preferredColumns: number;
  shortcut: string;
  dimensionLabel: string;
  /** Whether several different photos may share one sheet at this size. */
  allowsMultiplePhotos: boolean;
};

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoTransform = {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  orientation: number;
  croppedAreaPixels: CropArea | null;
};

export function getTotalRotation(transform: PhotoTransform): number {
  return transform.orientation + transform.rotation;
}

export type NameAlignment = "left" | "center" | "right";
export type NamePosition = "below" | "above";

export type CustomerImage = {
  file: File;
  url: string;
  width: number;
  height: number;
};

export type CroppedImage = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

/**
 * One uploaded customer photo. Several entries share a single A4 sheet, each
 * with its own crop, copy count, and printed name.
 */
export type PhotoEntry = {
  id: string;
  image: CustomerImage;
  transform: PhotoTransform;
  cropped: CroppedImage | null;
  quantity: number;
  name: string;
};
