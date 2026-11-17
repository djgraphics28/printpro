import type { Metadata } from "next";

import { StoreAdmin } from "@/components/store/store-admin";
import { checkSheetsConnection, describeStoreError, STORE_TAB, usingGoogleSheets } from "@/lib/pos/store";
import { shopToday } from "@/lib/pos/types";
import { requireAdmin } from "@/lib/store/auth";
import { listStoreDays } from "@/lib/store/store";
import type { StoreDay } from "@/lib/store/types";

export const metadata: Metadata = { title: "Sari-Sari Store admin — PrintPro" };

async function loadData(): Promise<{ days: StoreDay[]; loadError: string }> {
  try {
    return { days: (await listStoreDays()).reverse(), loadError: "" }; // newest first
  } catch (err) {
    console.error("Could not load the store sales:", err);
    return {
      days: [],
      loadError: usingGoogleSheets
        ? describeStoreError(err) || "Couldn't read the Google Sheet."
        : "Couldn't read the local data file.",
    };
  }
}

export default async function StoreAdminPage() {
  await requireAdmin();
  const [sheets, { days, loadError }] = await Promise.all([
    checkSheetsConnection(`${STORE_TAB} for the store's daily sales`),
    loadData(),
  ]);

  return (
    <StoreAdmin
      days={days}
      today={shopToday()}
      sheets={sheets}
      // When the connection check failed, its message already says why.
      loadError={loadError === sheets.message ? "" : loadError}
      loaded={!loadError}
    />
  );
}
