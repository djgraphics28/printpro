"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { getPhotoAspect } from "@/lib/photo-sizes";
import { getTotalRotation } from "@/types/photo";

export function PhotoEditor() {
  const { state, dispatch, photoSize } = useWorkstation();

  if (!state.image) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative h-64 overflow-hidden rounded-xl bg-slate-950">
        <Cropper
          image={state.image.url}
          crop={state.transform.crop}
          zoom={state.transform.zoom}
          rotation={getTotalRotation(state.transform)}
          aspect={getPhotoAspect(photoSize)}
          objectFit="contain"
          showGrid
          minZoom={1}
          maxZoom={3}
          cropShape="rect"
          zoomSpeed={1}
          restrictPosition
          style={{}}
          classes={{}}
          mediaProps={{ alt: "Customer photo" }}
          cropperProps={{}}
          disableAutomaticStylesInjection
          onCropChange={(crop) => dispatch({ type: "SET_TRANSFORM", crop })}
          onZoomChange={(zoom) => dispatch({ type: "SET_TRANSFORM", zoom })}
          onCropComplete={(_, croppedAreaPixels) =>
            dispatch({ type: "SET_TRANSFORM", croppedAreaPixels })
          }
        />
      </div>
      <p className="text-[11px] text-slate-400">
        Drag to reposition · scroll to zoom · crop follows {photoSize.dimensionLabel}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="zoom">Zoom</Label>
          <span className="text-xs text-slate-500">
            {state.transform.zoom.toFixed(2)}×
          </span>
        </div>
        <Slider
          id="zoom"
          min={1}
          max={3}
          step={0.01}
          value={[state.transform.zoom]}
          onValueChange={([zoom]) => dispatch({ type: "SET_TRANSFORM", zoom })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rotate">Straighten</Label>
          <span className="text-xs text-slate-500">
            {Math.round(state.transform.rotation)}°
          </span>
        </div>
        <Slider
          id="rotate"
          min={-45}
          max={45}
          step={1}
          value={[state.transform.rotation]}
          onValueChange={([rotation]) =>
            dispatch({ type: "SET_TRANSFORM", rotation })
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
              orientation: state.transform.orientation - 90,
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
              orientation: state.transform.orientation + 90,
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
          onClick={() => dispatch({ type: "RESET_TRANSFORM" })}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
