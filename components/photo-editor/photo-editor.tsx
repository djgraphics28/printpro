"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { CROP_MAX_ZOOM, CROP_MIN_ZOOM } from "@/lib/constants";
import { getPhotoAspect } from "@/lib/photo-sizes";
import { getTotalRotation } from "@/types/photo";

export function PhotoEditor() {
  const { state, dispatch, photoSize, activePhoto } = useWorkstation();

  if (!activePhoto) {
    return null;
  }

  const { id, image, transform } = activePhoto;
  const position = state.photos.findIndex((photo) => photo.id === id) + 1;

  return (
    <div className="space-y-3">
      {photoSize.allowsMultiplePhotos && state.photos.length > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-slate-600">
            Editing {activePhoto.name.trim() || image.file.name}
          </p>
          <p className="shrink-0 text-[11px] text-slate-400">
            Photo {position} of {state.photos.length}
          </p>
        </div>
      ) : null}

      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-950">
        <Cropper
          key={id}
          image={image.url}
          crop={transform.crop}
          zoom={transform.zoom}
          rotation={getTotalRotation(transform)}
          aspect={getPhotoAspect(photoSize)}
          objectFit="contain"
          showGrid
          minZoom={CROP_MIN_ZOOM}
          maxZoom={CROP_MAX_ZOOM}
          cropShape="rect"
          zoomSpeed={1}
          restrictPosition={false}
          roundCropAreaPixels
          style={{}}
          classes={{}}
          mediaProps={{ alt: "Customer photo" }}
          cropperProps={{}}
          disableAutomaticStylesInjection
          onCropChange={(crop) => dispatch({ type: "SET_TRANSFORM", id, crop })}
          onZoomChange={(zoom) => dispatch({ type: "SET_TRANSFORM", id, zoom })}
          onCropAreaChange={(_, croppedAreaPixels) =>
            dispatch({ type: "SET_TRANSFORM", id, croppedAreaPixels })
          }
          onCropComplete={(_, croppedAreaPixels) =>
            dispatch({ type: "SET_TRANSFORM", id, croppedAreaPixels })
          }
        />
      </div>
      <p className="text-[11px] text-slate-400">
        Drag to reposition · scroll or pinch to zoom 0.1×–8× · crop follows{" "}
        {photoSize.dimensionLabel}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="zoom">Zoom</Label>
          <span className="text-xs text-slate-500">
            {transform.zoom.toFixed(2)}×
          </span>
        </div>
        <Slider
          id="zoom"
          min={CROP_MIN_ZOOM}
          max={CROP_MAX_ZOOM}
          step={0.01}
          value={[transform.zoom]}
          onValueChange={([zoom]) => dispatch({ type: "SET_TRANSFORM", id, zoom })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rotate">Straighten</Label>
          <span className="text-xs text-slate-500">
            {Math.round(transform.rotation)}°
          </span>
        </div>
        <Slider
          id="rotate"
          min={-45}
          max={45}
          step={1}
          value={[transform.rotation]}
          onValueChange={([rotation]) =>
            dispatch({ type: "SET_TRANSFORM", id, rotation })
          }
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() =>
            dispatch({
              type: "SET_TRANSFORM",
              id,
              orientation: transform.orientation - 90,
            })
          }
        >
          <RotateCcw />
          Rotate
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() =>
            dispatch({
              type: "SET_TRANSFORM",
              id,
              orientation: transform.orientation + 90,
            })
          }
        >
          <RotateCw />
          Rotate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "RESET_TRANSFORM", id })}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
