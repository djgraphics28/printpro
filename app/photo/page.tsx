import type { Metadata } from "next";

import { PhotoWorkstation } from "@/components/workstation/photo-workstation";

export const metadata: Metadata = { title: "Picture Print — PrintPro" };

export default function PhotoPage() {
  return <PhotoWorkstation />;
}
