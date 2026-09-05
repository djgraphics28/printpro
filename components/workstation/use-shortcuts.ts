"use client";

import { useEffect } from "react";

import { usePrintFlow } from "@/components/print-actions/print-flow";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { getPhotoSizeByShortcut } from "@/lib/photo-sizes";
import { isTypingTarget } from "@/lib/print-utils";

export function useWorkstationShortcuts() {
  const { dispatch } = useWorkstation();
  const { requestPrint, requestNewSession } = usePrintFlow();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        requestPrint();
        return;
      }

      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const size = getPhotoSizeByShortcut(event.key);
      if (size) {
        event.preventDefault();
        dispatch({ type: "SET_SIZE", id: size.id });
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        requestPrint();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        requestNewSession();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, requestNewSession, requestPrint]);
}
