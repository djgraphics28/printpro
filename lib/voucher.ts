export type PaperId = "letter" | "long" | "a4";

export const PAPERS: Record<PaperId, { label: string; detail: string; widthIn: number; heightIn: number }> = {
  letter: { label: "Short", detail: "Letter 8.5×11", widthIn: 8.5, heightIn: 11 },
  long: { label: "Long", detail: "Folio 8.5×13", widthIn: 8.5, heightIn: 13 },
  a4: { label: "A4", detail: "8.27×11.69", widthIn: 8.27, heightIn: 11.69 },
};

export type VoucherSettings = {
  title: string;
  subtitle: string;
  paper: PaperId;
  cols: number;
  rows: number;
};

export const DEFAULT_SETTINGS: VoucherSettings = {
  title: "Milk & Honey Café",
  subtitle: "Free Wi-Fi Code",
  paper: "letter",
  cols: 4,
  rows: 14,
};

export const LIMITS = { cols: [1, 8], rows: [1, 30] } as const;

/** CSS pixels per inch — the browser prints `in` units at this ratio. */
export const PX_PER_IN = 96;

/**
 * Pull voucher codes out of CSV / pasted text.
 * - A header cell named "code", "codes", "voucher" or "voucher code" picks that column.
 * - Otherwise the first cell of each row is used.
 * - Keeps values that look like codes (letters/digits/dashes, 4+ chars, at least one
 *   digit), so words like "Unused" or "2048.00 Kbps" are ignored. Duplicates removed.
 */
export function extractCodes(text: string): string[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const split = (l: string) => l.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ""));

  let col = 0;
  let start = 0;
  if (lines.length) {
    const head = split(lines[0]).map((h) => h.toLowerCase());
    const i = head.findIndex((h) => ["code", "codes", "voucher", "voucher code"].includes(h));
    if (i >= 0) {
      col = i;
      start = 1;
    }
  }

  const isCode = (v: string) => /^[A-Za-z0-9-]{4,}$/.test(v) && /\d/.test(v) && !/kbps|mbps/i.test(v);
  const seen = new Set<string>();
  const out: string[] = [];
  for (let n = start; n < lines.length; n++) {
    const cells = split(lines[n]);
    let v = cells[col] ?? "";
    if (!isCode(v)) v = cells.find(isCode) ?? ""; // fallback for messy rows
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** Sheet styles shared by the on-screen preview and the printed document. */
export function sheetCss(s: VoucherSettings) {
  const paper = PAPERS[s.paper];
  return `
.vm-page {
  box-sizing: border-box; background: #fff; color: #000;
  width: ${paper.widthIn}in; height: ${paper.heightIn}in; padding: 0.25in;
  display: grid;
  grid-template-columns: repeat(${s.cols}, minmax(0, 1fr));
  grid-template-rows: repeat(${s.rows}, minmax(0, 1fr));
  font-family: Arial, Helvetica, sans-serif;
}
.vm-v {
  box-sizing: border-box; border: 1px dashed #000; margin: 0 -1px -1px 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; overflow: hidden; padding: 2px;
}
.vm-t { font-weight: bold; font-size: 10px; letter-spacing: .3px; text-transform: uppercase; line-height: 1.15; }
.vm-s { font-size: 7.5px; margin-top: 1px; text-transform: uppercase; line-height: 1.15; }
.vm-c { font-family: "Courier New", Courier, monospace; font-weight: bold; font-size: 21px; letter-spacing: 1px; margin-top: 3px; line-height: 1; }
.vm-sample .vm-c { color: #cbd5e1; }
`;
}

function esc(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function buildPrintHtml(s: VoucherSettings, codes: string[]) {
  const paper = PAPERS[s.paper];
  const per = s.cols * s.rows;
  const pages = chunk(codes, per)
    .map(
      (page) =>
        `<div class="vm-page">${page
          .map(
            (c) =>
              `<div class="vm-v"><div class="vm-t">${esc(s.title)}</div><div class="vm-s">${esc(s.subtitle)}</div><div class="vm-c">${esc(c)}</div></div>`,
          )
          .join("")}</div>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Vouchers</title><style>
@page { size: ${paper.widthIn}in ${paper.heightIn}in; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${sheetCss(s)}
.vm-page { break-after: page; page-break-after: always; }
.vm-page:last-child { break-after: auto; page-break-after: auto; }
</style></head><body>${pages}</body></html>`;
}

/** Prints through a hidden iframe so the app UI never reaches the printer. */
export function printVouchers(s: VoucherSettings, codes: string[]) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(buildPrintHtml(s, codes));
  doc.close();
  const win = iframe.contentWindow!;
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    win.focus();
    win.print();
    // Safari doesn't always fire afterprint inside iframes.
    setTimeout(cleanup, 60_000);
  }, 150);
}
