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
import { cropImageToBlob, isLowPrintQuality, revokeUrl } from "@/lib/image-utils";
import { calculateA4Layout } from "@/lib/layout-engine";
import { DEFAULT_PHOTO_SIZE_ID, getPhotoSize } from "@/lib/photo-sizes";
import { validatePrintReady } from "@/lib/validation";
import type { A4Layout } from "@/types/layout";
import {
  getTotalRotation,
  type CropArea,
  type CroppedImage,
  type CustomerImage,
} from "@/types/photo";
import { INITIAL_TRANSFORM, type WorkstationState } from "@/types/session";

type Action =
  | { type: "SET_IMAGE"; image: CustomerImage }
  | { type: "CLEAR_IMAGE" }
  | { type: "SET_UPLOAD_ERROR"; message: string | null }
  | { type: "SET_SIZE"; id: string }
  | { type: "SET_QUANTITY"; quantity: number }
  | {
      type: "SET_TRANSFORM";
      crop?: { x: number; y: number };
      zoom?: number;
      rotation?: number;
      orientation?: number;
      croppedAreaPixels?: CropArea | null;
    }
  | { type: "RESET_TRANSFORM" }
  | { type: "SET_CROPPED"; cropped: CroppedImage | null }
  | { type: "SET_CUTTING_GUIDES"; value: boolean }
  | { type: "SET_WHITE_BACKGROUND"; value: boolean }
  | { type: "SET_BACKGROUND_ERROR"; message: string | null }
  | { type: "SET_ADD_NAME"; value: boolean }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_NAME_FONT_SIZE"; mm: number }
  | { type: "SET_NAME_ALIGN"; align: WorkstationState["nameAlignment"] }
  | { type: "SET_NAME_POSITION"; position: WorkstationState["namePosition"] }
  | { type: "SET_SKIP_PRINT_HINT"; value: boolean }
  | { type: "RESET_SESSION" };

const initialState: WorkstationState = {
  image: null,
  cropped: null,
  transform: INITIAL_TRANSFORM,
  photoSizeId: DEFAULT_PHOTO_SIZE_ID,
  quantity: getPhotoSize(DEFAULT_PHOTO_SIZE_ID).defaultQuantity,
  showCuttingGuides: true,
  whiteBackground: false,
  backgroundError: null,
  addName: false,
  customerName: "",
  nameFontSizeMm: DEFAULT_NAME_FONT_SIZE_MM,
  nameAlignment: "center",
  namePosition: "below",
  skipPrintHint: false,
  uploadError: null,
};

function clearMedia(state: WorkstationState) {
  revokeUrl(state.image?.url);
  revokeUrl(state.cropped?.url);
}

function workstationReducer(
  state: WorkstationState,
  action: Action,
): WorkstationState {
  switch (action.type) {
    case "SET_IMAGE":
      clearMedia(state);
      return {
        ...state,
        image: action.image,
        cropped: null,
        transform: INITIAL_TRANSFORM,
        uploadError: null,
      };
    case "CLEAR_IMAGE":
      clearMedia(state);
      return {
        ...state,
        image: null,
        cropped: null,
        transform: INITIAL_TRANSFORM,
      };
    case "SET_UPLOAD_ERROR":
      return { ...state, uploadError: action.message };
    case "SET_SIZE": {
      const size = getPhotoSize(action.id);
      return {
        ...state,
        photoSizeId: size.id,
        quantity: size.defaultQuantity,
      };
    }
    case "SET_QUANTITY":
      return {
        ...state,
        quantity: Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, action.quantity)),
      };
    case "SET_TRANSFORM":
      return {
        ...state,
        transform: {
          crop: action.crop ?? state.transform.crop,
          zoom: action.zoom ?? state.transform.zoom,
          rotation: action.rotation ?? state.transform.rotation,
          orientation: action.orientation ?? state.transform.orientation,
          croppedAreaPixels:
            action.croppedAreaPixels !== undefined
              ? action.croppedAreaPixels
              : state.transform.croppedAreaPixels,
        },
      };
    case "RESET_TRANSFORM":
      revokeUrl(state.cropped?.url);
      return {
        ...state,
        cropped: null,
        transform: INITIAL_TRANSFORM,
      };
    case "SET_CROPPED":
      if (state.cropped && state.cropped.url !== action.cropped?.url) {
        revokeUrl(state.cropped.url);
      }
      return { ...state, cropped: action.cropped };
    case "SET_CUTTING_GUIDES":
      return { ...state, showCuttingGuides: action.value };
    case "SET_WHITE_BACKGROUND":
      return { ...state, whiteBackground: action.value, backgroundError: null };
    case "SET_BACKGROUND_ERROR":
      return { ...state, backgroundError: action.message };
    case "SET_ADD_NAME":
      return { ...state, addName: action.value };
    case "SET_NAME":
      return { ...state, customerName: action.name };
    case "SET_NAME_FONT_SIZE":
      return { ...state, nameFontSizeMm: action.mm };
    case "SET_NAME_ALIGN":
      return { ...state, nameAlignment: action.align };
    case "SET_NAME_POSITION":
      return { ...state, namePosition: action.position };
    case "SET_SKIP_PRINT_HINT":
      return { ...state, skipPrintHint: action.value };
    case "RESET_SESSION":
      clearMedia(state);
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
  lowQuality: boolean;
  processing: boolean;
  issues: ReturnType<typeof validatePrintReady>;
};

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

export function WorkstationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workstationReducer, initialState);
  const [processing, setProcessing] = useState(false);
  const mediaRef = useRef(state);

  useEffect(() => {
    mediaRef.current = state;
  }, [state]);

  const photoSize = useMemo(
    () => getPhotoSize(state.photoSizeId),
    [state.photoSizeId],
  );

  const layout = useMemo(
    () =>
      calculateA4Layout({
        photoSize,
        quantity: state.quantity,
        showName: state.addName && state.customerName.trim().length > 0,
        name: state.customerName,
        nameFontSizeMm: state.nameFontSizeMm,
        nameAlignment: state.nameAlignment,
        namePosition: state.namePosition,
        showCuttingGuides: state.showCuttingGuides,
      }),
    [
      photoSize,
      state.quantity,
      state.addName,
      state.customerName,
      state.nameFontSizeMm,
      state.nameAlignment,
      state.namePosition,
      state.showCuttingGuides,
    ],
  );

  const lowQuality = isLowPrintQuality(
    state.transform.croppedAreaPixels,
    photoSize,
  );

  const issues = useMemo(
    () =>
      validatePrintReady({
        image: state.image,
        cropped: state.cropped,
        processing,
        layout,
        lowQuality,
      }),
    [state.image, state.cropped, processing, layout, lowQuality],
  );

  const totalRotation = getTotalRotation(state.transform);

  useEffect(() => {
    const imageUrl = state.image?.url;
    const crop = state.transform.croppedAreaPixels;

    if (!imageUrl || !crop) {
      return;
    }

    let cancelled = false;
    const useWhite = state.whiteBackground;
    const timer = window.setTimeout(() => {
      setProcessing(true);
      cropImageToBlob(imageUrl, crop, totalRotation, photoSize)
        .then(async (croppedBlob) => {
          let blob = croppedBlob;
          if (useWhite) {
            try {
              blob = await applyWhiteBackground(croppedBlob);
              if (!cancelled) {
                dispatch({ type: "SET_BACKGROUND_ERROR", message: null });
              }
            } catch {
              if (!cancelled) {
                dispatch({
                  type: "SET_BACKGROUND_ERROR",
                  message:
                    "Could not remove the background. Printing the original photo instead.",
                });
              }
            }
          }

          if (cancelled) {
            return;
          }

          const url = URL.createObjectURL(blob);
          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = () =>
                reject(new Error("Cropped image failed to load"));
              img.src = url;
            },
          );
          if (cancelled) {
            revokeUrl(url);
            return;
          }
          dispatch({
            type: "SET_CROPPED",
            cropped: { blob, url, ...dimensions },
          });
        })
        .catch(() => {
          if (!cancelled) {
            dispatch({ type: "SET_CROPPED", cropped: null });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setProcessing(false);
          }
        });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    state.image?.url,
    state.transform.croppedAreaPixels,
    totalRotation,
    state.whiteBackground,
    photoSize,
  ]);

  useEffect(() => {
    return () => {
      revokeUrl(mediaRef.current.image?.url);
      revokeUrl(mediaRef.current.cropped?.url);
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      layout,
      photoSize,
      lowQuality,
      processing,
      issues,
    }),
    [state, layout, photoSize, lowQuality, processing, issues],
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
