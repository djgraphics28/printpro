"use client";

import { Download, Printer } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewSessionDialog } from "@/components/session-reset/session-reset";
import { useWorkstation } from "@/components/workstation/workstation-context";
import { PRINT_REMINDER } from "@/lib/constants";
import { downloadA4Pdf } from "@/lib/download";
import { printA4Sheet } from "@/lib/print-utils";
import { getBlockingError } from "@/lib/validation";

type PrintFlowValue = {
  requestPrint: () => void;
  requestDownload: () => void;
  requestNewSession: () => void;
  busy: boolean;
};

const PrintFlowContext = createContext<PrintFlowValue | null>(null);

export function PrintFlowProvider({ children }: { children: ReactNode }) {
  const { state, dispatch, layout, issues } = useWorkstation();
  const [hintOpen, setHintOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setErrorOpen(true);
  }, []);

  const requestPrint = useCallback(() => {
    const blocking = getBlockingError(issues);
    if (blocking) {
      showError(blocking.message);
      return;
    }

    if (!state.skipPrintHint) {
      setHintOpen(true);
      return;
    }

    printA4Sheet();
  }, [issues, showError, state.skipPrintHint]);

  const requestDownload = useCallback(() => {
    const blocking = getBlockingError(issues);
    if (blocking) {
      showError(blocking.message);
      return;
    }

    if (!state.cropped) {
      return;
    }

    setBusy(true);
    void downloadA4Pdf(layout, state.cropped.blob)
      .catch(() => {
        showError("Could not generate the A4 PDF. Please try again.");
      })
      .finally(() => setBusy(false));
  }, [issues, layout, showError, state.cropped]);

  const requestNewSession = useCallback(() => {
    setSessionOpen(true);
  }, []);

  const value = useMemo(
    () => ({ requestPrint, requestDownload, requestNewSession, busy }),
    [busy, requestDownload, requestNewSession, requestPrint],
  );

  function confirmPrint() {
    if (dontShowAgain) {
      dispatch({ type: "SET_SKIP_PRINT_HINT", value: true });
    }
    setHintOpen(false);
    window.setTimeout(() => printA4Sheet(), 50);
  }

  return (
    <PrintFlowContext.Provider value={value}>
      {children}

      <Dialog open={hintOpen} onOpenChange={setHintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PRINT_REMINDER.title}</DialogTitle>
            <DialogDescription>{PRINT_REMINDER.body}</DialogDescription>
          </DialogHeader>
          <ul className="mb-4 space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {PRINT_REMINDER.settings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            Don&apos;t show again this session
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setHintOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmPrint}>
              Continue to Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot print yet</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setErrorOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NewSessionDialog open={sessionOpen} onOpenChange={setSessionOpen} />
    </PrintFlowContext.Provider>
  );
}

export function usePrintFlow() {
  const context = useContext(PrintFlowContext);
  if (!context) {
    throw new Error("usePrintFlow must be used within PrintFlowProvider");
  }
  return context;
}

export function PrintActions() {
  const { requestPrint, requestDownload, busy } = usePrintFlow();
  const { state, layout, issues } = useWorkstation();
  const blocking = getBlockingError(issues);
  const ready = Boolean(state.cropped) && layout.fits && !blocking;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!ready}
        onClick={requestPrint}
      >
        <Printer />
        Print A4
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={!ready || busy}
        onClick={requestDownload}
      >
        <Download />
        {busy ? "Preparing PDF…" : "Download A4"}
      </Button>
      <p className="text-center text-[11px] text-slate-400">
        {blocking
          ? blocking.message
          : "⌘/Ctrl + P prints the A4 sheet only"}
      </p>
    </div>
  );
}
