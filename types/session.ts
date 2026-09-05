import type {
  CroppedImage,
  CustomerImage,
  NameAlignment,
  NamePosition,
  PhotoTransform,
} from "./photo";

export type WorkstationState = {
  image: CustomerImage | null;
  cropped: CroppedImage | null;
  transform: PhotoTransform;
  photoSizeId: string;
  quantity: number;
  showCuttingGuides: boolean;
  whiteBackground: boolean;
  backgroundError: string | null;
  addName: boolean;
  customerName: string;
  nameFontSizeMm: number;
  nameAlignment: NameAlignment;
  namePosition: NamePosition;
  skipPrintHint: boolean;
  uploadError: string | null;
};

export const INITIAL_TRANSFORM: PhotoTransform = {
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  orientation: 0,
  croppedAreaPixels: null,
};
