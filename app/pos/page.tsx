import type { Metadata } from "next";

import { PosRegister } from "@/components/pos/pos-register";
import { requireRole } from "@/lib/pos/auth";
import { DEFAULT_SERVICES, describeStoreError, listSales, listServices } from "@/lib/pos/store";
import { dayKey, type Sale, type Service, shopToday } from "@/lib/pos/types";

export const metadata: Metadata = { title: "Printing POS — PrintPro" };

export default async function PosPage() {
  const role = await requireRole();
  const today = shopToday();

  let services: Service[] = DEFAULT_SERVICES;
  let todaySales: Sale[] = [];
  let loadError = "";
  try {
    const [list, sales] = await Promise.all([listServices(), listSales()]);
    services = list;
    todaySales = sales.filter((s) => dayKey(s.soldAt) === today);
  } catch (err) {
    console.error("Could not load the POS data:", err);
    // Only the admin gets the setup details.
    loadError =
      (role === "admin" && describeStoreError(err)) ||
      "Couldn't load today's sales. Check the internet connection, then reload.";
  }

  return <PosRegister role={role} services={services} todaySales={todaySales} loadError={loadError} />;
}
