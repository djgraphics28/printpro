"use client";

import { IdCard } from "lucide-react";

import { A4Preview } from "@/components/a4-preview/a4-preview";
import { A4PrintLayout } from "@/components/a4-print-layout/a4-print-layout";
import { CuttingGuideSettings } from "@/components/cutting-guide-settings/cutting-guide-settings";
import { WhiteBackgroundSettings } from "@/components/white-background-settings/white-background-settings";
import { NameSettings } from "@/components/name-settings/name-settings";
import { PhotoEditor } from "@/components/photo-editor/photo-editor";
import { PhotoSizeSelector } from "@/components/photo-size-selector/photo-size-selector";
import { PhotoUploader } from "@/components/photo-uploader/photo-uploader";
import {
  PrintActions,
  PrintFlowProvider,
} from "@/components/print-actions/print-flow";
import { QuantitySelector } from "@/components/quantity-selector/quantity-selector";
import { SessionReset } from "@/components/session-reset/session-reset";
import { StatusBar } from "@/components/status-bar/status-bar";
import { Separator } from "@/components/ui/separator";
import { useWorkstationShortcuts } from "@/components/workstation/use-shortcuts";
import { WorkstationProvider } from "@/components/workstation/workstation-context";

function WorkstationShell() {
  useWorkstationShortcuts();

  return (
    <>
      <div className="app-shell flex min-h-dvh flex-col bg-[#eceef2] text-slate-900 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-3 md:px-6 lg:static">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <IdCard className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">PrintPro</p>
              <p className="text-xs text-slate-500">ID Photo Printing</p>
            </div>
          </div>
          <SessionReset />
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:min-h-0 lg:flex-row">
          <aside className="order-2 w-full border-t border-slate-200/80 bg-white lg:order-1 lg:h-full lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-r">
            <div className="flex flex-col gap-5 p-4 md:p-5">
              <section className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  Photo Setup
                </p>
                <PhotoUploader />
                <PhotoEditor />
              </section>

              <Separator />
              <PhotoSizeSelector />
              <QuantitySelector />
              <Separator />
              <CuttingGuideSettings />
              <WhiteBackgroundSettings />
              <NameSettings />
              <div className="pt-1 lg:sticky lg:bottom-0 lg:bg-white lg:pt-2 lg:pb-1">
                <PrintActions />
              </div>
            </div>
          </aside>

          <main className="order-1 flex min-h-[70vh] flex-col p-4 md:p-6 lg:order-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            <div className="mb-4">
              <StatusBar />
            </div>
            <A4Preview />
          </main>
        </div>
      </div>
      <A4PrintLayout />
    </>
  );
}

export function PhotoWorkstation() {
  return (
    <WorkstationProvider>
      <PrintFlowProvider>
        <WorkstationShell />
      </PrintFlowProvider>
    </WorkstationProvider>
  );
}
