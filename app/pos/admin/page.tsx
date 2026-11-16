import type { Metadata } from "next";

import { PosAdmin } from "@/components/pos/pos-admin";
import { requireAdmin } from "@/lib/pos/auth";
import {
  checkSheetsConnection,
  DEFAULT_SERVICES,
  describeStoreError,
  listSales,
  listServices,
  usingGoogleSheets,
} from "@/lib/pos/store";
import { type Sale, type Service, shopToday } from "@/lib/pos/types";

export const metadata: Metadata = { title: "POS admin — PrintPro" };

async function loadData(): Promise<{ sales: Sale[]; services: Service[]; loadError: string }> {
  try {
    const [sales, services] = await Promise.all([listSales(), listServices()]);
    return { sales: sales.reverse(), services, loadError: "" }; // newest first
  } catch (err) {
    console.error("Could not load the sales:", err);
    return {
      sales: [],
      services: DEFAULT_SERVICES,
      loadError: usingGoogleSheets
        ? describeStoreError(err) || "Couldn't read the Google Sheet."
        : "Couldn't read the local data file.",
    };
  }
}

export default async function PosAdminPage() {
  await requireAdmin();
  const [sheets, { sales, services, loadError }] = await Promise.all([checkSheetsConnection(), loadData()]);

  return (
    <PosAdmin
      sales={sales}
      services={services}
      today={shopToday()}
      sheets={sheets}
      // When the connection check failed, its message already says why.
      loadError={loadError === sheets.message ? "" : loadError}
      loaded={!loadError}
    />
  );
}
