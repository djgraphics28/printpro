import type {
  NameAlignment,
  NamePosition,
  PhotoEntry,
  PhotoTransform,
} from "./photo";

export type WorkstationState = {
  /** Every uploaded photo, in sheet order. */
  photos: PhotoEntry[];
  /** The photo the cropper and name field currently edit. */
  activePhotoId: string | null;
  photoSizeId: string;
  showCuttingGuides: boolean;
  whiteBackground: boolean;
  backgroundError: string | null;
  addName: boolean;
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
