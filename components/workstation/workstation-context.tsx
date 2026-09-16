"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

import {
  DEFAULT_NAME_FONT_SIZE_MM,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "@/lib/constants";
import { applyWhiteBackground } from "@/lib/background";
import {
  cropImageToBlob,
  defaultCropArea,
  isLowPrintQuality,
  revokeUrl,
} from "@/lib/image-utils";
import { calculateA4Layout, getSheetCapacity } from "@/lib/layout-engine";
import {
  DEFAULT_PHOTO_SIZE_ID,
  getPhotoSize,
} from "@/lib/photo-sizes";
import { validatePrintReady } from "@/lib/validation";
import type { A4Layout } from "@/types/layout";
import {
  getTotalRotation,
  type CropArea,
  type CroppedImage,
  type CustomerImage,
  type PhotoEntry,
  type PhotoSize,
  type PhotoTransform,
} from "@/types/photo";
import { INITIAL_TRANSFORM, type WorkstationState } from "@/types/session";

type Action =
  | { type: "ADD_PHOTOS"; images: CustomerImage[] }
  | { type: "REPLACE_PHOTO"; id: string; image: CustomerImage }
  | { type: "REMOVE_PHOTO"; id: string }
  | { type: "SET_ACTIVE_PHOTO"; id: string }
  | { type: "STEP_ACTIVE_PHOTO"; delta: number }
  | { type: "SET_UPLOAD_ERROR"; message: string | null }
  | { type: "SET_SIZE"; id: string }
  | { type: "SET_PHOTO_QUANTITY"; id: string; quantity: number }
  | { type: "SET_PHOTO_NAME"; id: string; name: string }
  | {
      type: "SET_TRANSFORM";
      id: string;
      crop?: { x: number; y: number };
      zoom?: number;
      rotation?: number;
      orientation?: number;
      croppedAreaPixels?: CropArea | null;
    }
  | { type: "RESET_TRANSFORM"; id: string }
  | { type: "SET_CROPPED"; id: string; cropped: CroppedImage | null }
  | { type: "SET_CUTTING_GUIDES"; value: boolean }
  | { type: "SET_WHITE_BACKGROUND"; value: boolean }
  | { type: "SET_BACKGROUND_ERROR"; message: string | null }
  | { type: "SET_ADD_NAME"; value: boolean }
  | { type: "SET_NAME_FONT_SIZE"; mm: number }
  | { type: "SET_NAME_ALIGN"; align: WorkstationState["nameAlignment"] }
  | { type: "SET_NAME_POSITION"; position: WorkstationState["namePosition"] }
  | { type: "SET_SKIP_PRINT_HINT"; value: boolean }
  | { type: "RESET_SESSION" };

const initialState: WorkstationState = {
  photos: [],
  activePhotoId: null,
  photoSizeId: DEFAULT_PHOTO_SIZE_ID,
  showCuttingGuides: true,
  whiteBackground: false,
  backgroundError: null,
  addName: false,
  nameFontSizeMm: DEFAULT_NAME_FONT_SIZE_MM,
  nameAlignment: "center",
  namePosition: "below",
  skipPrintHint: false,
  uploadError: null,
};

let photoCounter = 0;

function nextPhotoId(): string {
  photoCounter += 1;
  return `photo-${photoCounter}-${Date.now().toString(36)}`;
}

/** A new photo starts centred on the size's aspect so it can print unvisited. */
function initialTransform(image: CustomerImage, size: PhotoSize): PhotoTransform {
  return { ...INITIAL_TRANSFORM, croppedAreaPixels: defaultCropArea(image, size) };
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(quantity)));
}

function releasePhoto(photo: PhotoEntry) {
  revokeUrl(photo.image.url);
  revokeUrl(photo.cropped?.url);
}

function totalQuantity(photos: PhotoEntry[]): number {
  return photos.reduce((sum, photo) => sum + photo.quantity, 0);
}

/**
 * Copies for a photo joining a sheet that already holds others — the size's
 * default, trimmed to whatever room is left so a new upload does not
 * immediately overflow the sheet.
 */
function quantityForNewPhoto(size: PhotoSize, used: number): number {
  const { maxQuantity } = getSheetCapacity(size);
  return clampQuantity(Math.min(size.defaultQuantity, Math.max(1, maxQuantity - used)));
}

/**
 * Share the sheet evenly when the photos on it no longer fit, handing the
 * leftover slots to the earliest photos. Only used when a new upload would
 * otherwise arrive on an already-full sheet.
 */
function shareSheetEvenly(photos: PhotoEntry[], size: PhotoSize): PhotoEntry[] {
  const { maxQuantity } = getSheetCapacity(size);
  const base = Math.floor(maxQuantity / photos.length);

  if (base < 1) {
    return photos.map((photo) => ({ ...photo, quantity: 1 }));
  }

  let spare = maxQuantity - base * photos.length;
  return photos.map((photo) => {
    const extra = spare > 0 ? 1 : 0;
    spare -= extra;
    return { ...photo, quantity: clampQuantity(base + extra) };
  });
}

/** Changing size is a deliberate restart: share the sheet evenly again. */
function quantityPerPhotoOnResize(size: PhotoSize, count: number): number {
  const { maxQuantity } = getSheetCapacity(size);
  return clampQuantity(
    Math.min(size.defaultQuantity, Math.max(1, Math.floor(maxQuantity / Math.max(1, count)))),
  );
}

function workstationReducer(
  state: WorkstationState,
  action: Action,
): WorkstationState {
  switch (action.type) {
    case "ADD_PHOTOS": {
      if (action.images.length === 0) {
        return state;
      }

      const size = getPhotoSize(state.photoSizeId);

      // Only sizes flagged for it hold several customers on one sheet. Every
      // other size keeps a single photo, so a new upload replaces it.
      if (!size.allowsMultiplePhotos) {
        const [image] = action.images;
        action.images.slice(1).forEach((extra) => revokeUrl(extra.url));
        const carriedName = state.photos[0]?.name ?? "";
        state.photos.forEach(releasePhoto);
        const id = nextPhotoId();

        return {
          ...state,
          photos: [
            {
              id,
              image,
              transform: initialTransform(image, size),
              cropped: null,
              quantity: size.defaultQuantity,
              name: carriedName,
            },
          ],
          activePhotoId: id,
          uploadError:
            action.images.length > 1
              ? `${size.name} prints one photo per sheet — kept the first one. Switch to Wallet to mix photos on one sheet.`
              : null,
        };
      }

      let used = totalQuantity(state.photos);

      const added: PhotoEntry[] = action.images.map((image) => {
        const quantity = quantityForNewPhoto(size, used);
        used += quantity;
        return {
          id: nextPhotoId(),
          image,
          transform: initialTransform(image, size),
          cropped: null,
          quantity,
          name: "",
        };
      });

      const combined = [...state.photos, ...added];
      const { maxQuantity } = getSheetCapacity(size);
      const photos =
        totalQuantity(combined) > maxQuantity
          ? shareSheetEvenly(combined, size)
          : combined;

      return {
        ...state,
        photos,
        activePhotoId: added[0].id,
        uploadError:
          photos !== combined && photos.length > maxQuantity
            ? `Only ${maxQuantity} ${size.name} photos fit on one A4 sheet. Remove some or print a second sheet.`
            : null,
      };
    }
    case "REPLACE_PHOTO": {
      const target = state.photos.find((photo) => photo.id === action.id);
      if (!target) {
        return state;
      }
      releasePhoto(target);

      return {
        ...state,
        photos: state.photos.map((photo) =>
          photo.id === action.id
            ? {
                ...photo,
                image: action.image,
                cropped: null,
                transform: initialTransform(
                  action.image,
                  getPhotoSize(state.photoSizeId),
                ),
              }
            : photo,
        ),
        activePhotoId: action.id,
        uploadError: null,
      };
    }
    case "REMOVE_PHOTO": {
      const target = state.photos.find((photo) => photo.id === action.id);
      if (!target) {
        return state;
      }
      releasePhoto(target);

      const remaining = state.photos.filter((photo) => photo.id !== action.id);
      const removedIndex = state.photos.findIndex((photo) => photo.id === action.id);
      const nextActive =
        state.activePhotoId === action.id
          ? (remaining[removedIndex] ?? remaining[removedIndex - 1] ?? remaining[0])?.id ??
            null
          : state.activePhotoId;

      return { ...state, photos: remaining, activePhotoId: nextActive };
    }
    case "SET_ACTIVE_PHOTO":
      return state.photos.some((photo) => photo.id === action.id)
        ? { ...state, activePhotoId: action.id }
        : state;
    case "STEP_ACTIVE_PHOTO": {
      if (state.photos.length < 2) {
        return state;
      }
      const current = state.photos.findIndex(
        (photo) => photo.id === state.activePhotoId,
      );
      const from = current === -1 ? 0 : current;
      const count = state.photos.length;
      const next = (((from + action.delta) % count) + count) % count;
      return { ...state, activePhotoId: state.photos[next].id };
    }
    case "SET_UPLOAD_ERROR":
      return { ...state, uploadError: action.message };
    case "SET_SIZE": {
      const size = getPhotoSize(action.id);

      // Leaving a multi-photo size keeps the photo being edited and drops the
      // rest, since the new size prints one customer per sheet.
      const kept =
        size.allowsMultiplePhotos || state.photos.length <= 1
          ? state.photos
          : state.photos.filter(
              (photo, index) =>
                photo.id === state.activePhotoId ||
                (state.activePhotoId === null && index === 0),
            );

      if (kept.length !== state.photos.length) {
        state.photos
          .filter((photo) => !kept.includes(photo))
          .forEach(releasePhoto);
      }

      const perPhoto = quantityPerPhotoOnResize(size, kept.length);

      return {
        ...state,
        photoSizeId: size.id,
        photos: kept.map((photo) => ({
          ...photo,
          quantity: perPhoto,
          // The cropper re-derives the active photo itself; the rest need the
          // new aspect applied for them.
          transform:
            photo.id === state.activePhotoId
              ? photo.transform
              : initialTransform(photo.image, size),
        })),
        activePhotoId: kept.some((photo) => photo.id === state.activePhotoId)
          ? state.activePhotoId
          : (kept[0]?.id ?? null),
      };
    }
    case "SET_PHOTO_QUANTITY":
      return {
        ...state,
        photos: state.photos.map((photo) =>
          photo.id === action.id
            ? { ...photo, quantity: clampQuantity(action.quantity) }
            : photo,
        ),
      };
    case "SET_PHOTO_NAME":
      return {
        ...state,
        photos: state.photos.map((photo) =>
          photo.id === action.id ? { ...photo, name: action.name } : photo,
        ),
      };
    case "SET_TRANSFORM":
      return {
        ...state,
        photos: state.photos.map((photo) =>
          photo.id === action.id
            ? {
                ...photo,
                transform: {
                  crop: action.crop ?? photo.transform.crop,
                  zoom: action.zoom ?? photo.transform.zoom,
                  rotation: action.rotation ?? photo.transform.rotation,
                  orientation: action.orientation ?? photo.transform.orientation,
                  croppedAreaPixels:
                    action.croppedAreaPixels !== undefined
                      ? action.croppedAreaPixels
                      : photo.transform.croppedAreaPixels,
                },
              }
            : photo,
        ),
      };
    case "RESET_TRANSFORM":
      return {
        ...state,
        photos: state.photos.map((photo) => {
          if (photo.id !== action.id) {
            return photo;
          }
          revokeUrl(photo.cropped?.url);
          return {
            ...photo,
            cropped: null,
            transform: initialTransform(photo.image, getPhotoSize(state.photoSizeId)),
          };
        }),
      };
    case "SET_CROPPED":
      return {
        ...state,
        photos: state.photos.map((photo) => {
          if (photo.id !== action.id) {
            return photo;
          }
          if (photo.cropped && photo.cropped.url !== action.cropped?.url) {
            revokeUrl(photo.cropped.url);
          }
          return { ...photo, cropped: action.cropped };
        }),
      };
    case "SET_CUTTING_GUIDES":
      return { ...state, showCuttingGuides: action.value };
    case "SET_WHITE_BACKGROUND":
      return { ...state, whiteBackground: action.value, backgroundError: null };
    case "SET_BACKGROUND_ERROR":
      return { ...state, backgroundError: action.message };
    case "SET_ADD_NAME":
      return { ...state, addName: action.value };
    case "SET_NAME_FONT_SIZE":
      return { ...state, nameFontSizeMm: action.mm };
    case "SET_NAME_ALIGN":
      return { ...state, nameAlignment: action.align };
    case "SET_NAME_POSITION":
      return { ...state, namePosition: action.position };
    case "SET_SKIP_PRINT_HINT":
      return { ...state, skipPrintHint: action.value };
    case "RESET_SESSION":
      state.photos.forEach(releasePhoto);
      return { ...initialState };
    default:
      return state;
  }
}

type WorkstationContextValue = {
  state: WorkstationState;
  dispatch: Dispatch<Action>;
  layout: A4Layout;
  photoSize: ReturnType<typeof getPhotoSize>;
  activePhoto: PhotoEntry | null;
  /** Photos whose crop resolves below the minimum print DPI. */
  lowQualityIds: string[];
  lowQuality: boolean;
  /** Photos with a crop job in flight. */
  processingIds: string[];
  processing: boolean;
  totalQuantity: number;
  issues: ReturnType<typeof validatePrintReady>;
};

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

/** Identifies the rendered output of one photo, so work is never repeated. */
function cropSignature(
  photo: PhotoEntry,
  whiteBackground: boolean,
  photoSizeId: string,
): string {
  const crop = photo.transform.croppedAreaPixels;
  return [
    photo.image.url,
    photoSizeId,
    whiteBackground ? "white" : "original",
    getTotalRotation(photo.transform),
    crop ? `${crop.x},${crop.y},${crop.width},${crop.height}` : "none",
  ].join("|");
}

export function WorkstationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workstationReducer, initialState);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const stateRef = useRef(state);
  const aliveRef = useRef(true);
  /** photoId -> signature of the crop most recently started for it. */
  const jobsRef = useRef(new Map<string, string>());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const photoSize = useMemo(
    () => getPhotoSize(state.photoSizeId),
    [state.photoSizeId],
  );

  const activePhoto = useMemo(
    () => state.photos.find((photo) => photo.id === state.activePhotoId) ?? null,
    [state.photos, state.activePhotoId],
  );

  const showName =
    state.addName && state.photos.some((photo) => photo.name.trim().length > 0);

  const layout = useMemo(
    () =>
      calculateA4Layout({
        photoSize,
        items: state.photos.map((photo) => ({
          photoId: photo.id,
          quantity: photo.quantity,
          name: photo.name.trim(),
        })),
        showName,
        nameFontSizeMm: state.nameFontSizeMm,
        nameAlignment: state.nameAlignment,
        namePosition: state.namePosition,
        showCuttingGuides: state.showCuttingGuides,
      }),
    [
      photoSize,
      state.photos,
      showName,
      state.nameFontSizeMm,
      state.nameAlignment,
      state.namePosition,
      state.showCuttingGuides,
    ],
  );

  const lowQualityIds = useMemo(
    () =>
      state.photos
        .filter((photo) =>
          isLowPrintQuality(photo.transform.croppedAreaPixels, photoSize),
        )
        .map((photo) => photo.id),
    [state.photos, photoSize],
  );

  const processing = processingIds.length > 0;

  const issues = useMemo(
    () =>
      validatePrintReady({
        photos: state.photos,
        processing,
        layout,
        lowQualityCount: lowQualityIds.length,
      }),
    [state.photos, processing, layout, lowQualityIds.length],
  );

  // One debounced pass over every photo; each photo is re-cropped only when its
  // own signature changes, so editing one photo never redoes the others.
  const pendingSignatures = state.photos
    .map((photo) => `${photo.id}=${cropSignature(photo, state.whiteBackground, photoSize.id)}`)
    .join("&");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const photos = stateRef.current.photos;
      const useWhite = stateRef.current.whiteBackground;

      for (const photo of photos) {
        const crop = photo.transform.croppedAreaPixels;
        if (!crop) {
          continue;
        }

        const signature = cropSignature(photo, useWhite, photoSize.id);
        if (jobsRef.current.get(photo.id) === signature) {
          continue;
        }
        jobsRef.current.set(photo.id, signature);

        const photoId = photo.id;
        const isCurrent = () =>
          aliveRef.current && jobsRef.current.get(photoId) === signature;

        setProcessingIds((current) =>
          current.includes(photoId) ? current : [...current, photoId],
        );

        void cropImageToBlob(
          photo.image.url,
          crop,
          getTotalRotation(photo.transform),
          photoSize,
        )
          .then(async (croppedBlob) => {
            let blob = croppedBlob;
            if (useWhite) {
              try {
                blob = await applyWhiteBackground(croppedBlob);
                if (isCurrent()) {
                  dispatch({ type: "SET_BACKGROUND_ERROR", message: null });
                }
              } catch {
                if (isCurrent()) {
                  dispatch({
                    type: "SET_BACKGROUND_ERROR",
                    message:
                      "Could not remove the background. Printing the original photo instead.",
                  });
                }
              }
            }

            if (!isCurrent()) {
              return;
            }

            const url = URL.createObjectURL(blob);
            const dimensions = await new Promise<{
              width: number;
              height: number;
            }>((resolve, reject) => {
              const img = new Image();
              img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = () => reject(new Error("Cropped image failed to load"));
              img.src = url;
            });

            if (!isCurrent()) {
              revokeUrl(url);
              return;
            }

            dispatch({
              type: "SET_CROPPED",
              id: photoId,
              cropped: { blob, url, ...dimensions },
            });
          })
          .catch(() => {
            if (isCurrent()) {
              dispatch({ type: "SET_CROPPED", id: photoId, cropped: null });
            }
          })
          .finally(() => {
            if (aliveRef.current) {
              setProcessingIds((current) =>
                current.filter((id) => id !== photoId),
              );
            }
          });
      }
    }, 160);

    return () => window.clearTimeout(timer);
  }, [pendingSignatures, photoSize]);

  // Drop bookkeeping for photos that are gone so a re-upload re-crops.
  useEffect(() => {
    const live = new Set(state.photos.map((photo) => photo.id));
    for (const id of jobsRef.current.keys()) {
      if (!live.has(id)) {
        jobsRef.current.delete(id);
      }
    }
  }, [state.photos]);

  useEffect(() => {
    // Re-arm on every mount: React's development double-invoke runs the
    // cleanup once before the real mount.
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stateRef.current.photos.forEach(releasePhoto);
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      layout,
      photoSize,
      activePhoto,
      lowQualityIds,
      lowQuality: lowQualityIds.length > 0,
      processingIds,
      processing,
      totalQuantity: layout.quantity,
      issues,
    }),
    [
      state,
      layout,
      photoSize,
      activePhoto,
      lowQualityIds,
      processingIds,
      processing,
      issues,
    ],
  );

  return (
    <WorkstationContext.Provider value={value}>
      {children}
    </WorkstationContext.Provider>
  );
}

export function useWorkstation() {
  const context = useContext(WorkstationContext);
  if (!context) {
    throw new Error("useWorkstation must be used within WorkstationProvider");
  }
  return context;
}

export function useWorkstationActions() {
  const { dispatch } = useWorkstation();

  const setSize = useCallback(
    (id: string) => dispatch({ type: "SET_SIZE", id }),
    [dispatch],
  );

  const resetSession = useCallback(
    () => dispatch({ type: "RESET_SESSION" }),
    [dispatch],
  );

  return { setSize, resetSession, dispatch };
}
