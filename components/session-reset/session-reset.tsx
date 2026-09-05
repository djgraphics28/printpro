"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useWorkstation } from "@/components/workstation/workstation-context";

export function SessionReset() {
  const { dispatch } = useWorkstation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw />
        New Session
        <Kbd className="ml-1">N</Kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Session?</DialogTitle>
            <DialogDescription>
              This will remove the current customer photo and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                dispatch({ type: "RESET_SESSION" });
                setOpen(false);
              }}
            >
              Start New Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NewSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { dispatch } = useWorkstation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Session?</DialogTitle>
          <DialogDescription>
            This will remove the current customer photo and settings.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              dispatch({ type: "RESET_SESSION" });
              onOpenChange(false);
            }}
          >
            Start New Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
