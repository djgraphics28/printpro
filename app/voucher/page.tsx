import type { Metadata } from "next";

import { VoucherMaker } from "@/components/voucher/voucher-maker";

export const metadata: Metadata = { title: "Voucher Maker — PrintPro" };

export default function VoucherPage() {
  return <VoucherMaker />;
}
