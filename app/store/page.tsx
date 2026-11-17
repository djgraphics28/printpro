import type { Metadata } from "next";

import { StoreRegister } from "@/components/store/store-register";
import { describeStoreError } from "@/lib/pos/store";
import { shiftDay, shopToday } from "@/lib/pos/types";
import { requireRole } from "@/lib/store/auth";
import { listStoreDays } from "@/lib/store/store";
import { CASHIER_DAYS_BACK, type StoreDay } from "@/lib/store/types";

export const metadata: Metadata = { title: "Sari-Sari Store — PrintPro" };

export default async function StorePage() {
  const role = await requireRole();
  const today = shopToday();
  const earliest = shiftDay(today, -CASHIER_DAYS_BACK);

  let days: StoreDay[] = [];
  let loadError = "";
  try {
    // Only the days the entry screen can show.
    days = (await listStoreDays()).filter((d) => d.day >= earliest && d.day <= today);
  } catch (err) {
    console.error("Could not load the store sales:", err);
    // Only the admin gets the setup details.
    loadError =
      (role === "admin" && describeStoreError(err)) ||
      "Couldn't load the sales saved so far. Check the internet connection, then reload.";
  }

  return <StoreRegister role={role} days={days} today={today} earliest={earliest} loadError={loadError} />;
}
