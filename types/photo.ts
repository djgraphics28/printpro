export type PhotoSize = {
  id: string;
  name: string;
  widthInches: number;
  heightInches: number;
  defaultQuantity: number;
  preferredColumns: number;
  shortcut: string;
  dimensionLabel: string;
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
