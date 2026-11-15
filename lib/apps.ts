import { Camera, type LucideIcon, Ticket } from "lucide-react";

export type AppDef = {
  id: string;
  href: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile. */
  tint: string;
  /** Accent used for the card's hover glow. */
  glow: string;
};

export const APPS: AppDef[] = [
  {
    id: "photo",
    href: "/photo",
    name: "Picture Print",
    description: "Crop and lay out 2x2, 1x1, passport and wallet ID photos on A4 at true size.",
    icon: Camera,
    tint: "bg-sky-100 text-sky-700",
    glow: "group-hover:shadow-sky-200/70",
  },
  {
    id: "voucher",
    href: "/voucher",
    name: "Voucher Maker",
    description: "Turn Wi-Fi codes from a CSV or router page into cut-ready voucher sheets.",
    icon: Ticket,
    tint: "bg-amber-100 text-amber-700",
    glow: "group-hover:shadow-amber-200/70",
  },
];
