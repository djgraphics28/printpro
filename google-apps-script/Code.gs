/**
 * Database for the PrintPro POS: the sales and the price list.
 *
 * Paste this whole file into the sheet's script editor (Extensions → Apps Script),
 * set SECRET below, then Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone). See README.md for the full steps.
 */

// Must be exactly the same as GOOGLE_SCRIPT_SECRET in the site's .env.local.
const SECRET = "PASTE_YOUR_GOOGLE_SCRIPT_SECRET_HERE";

const DEFAULT_SALES_TAB = "Sales";
const DEFAULT_SERVICES_TAB = "Services";
const SALES_HEADER = ["ID", "Sold At", "Receipt", "Item", "Qty", "Unit Price", "Total", "Payment", "Customer", "Note", "Entered By"];
const SERVICES_HEADER = ["Item", "Price"];

/** Opening the web app URL in a browser shows this, so you can tell it is deployed. */
function doGet() {
  return json({ ok: true, message: "The PrintPro POS script is deployed." });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (SECRET.indexOf("PASTE_") === 0) out = { ok: false, error: "secret-not-set" };
    else if (req.secret !== SECRET) out = { ok: false, error: "unauthorized" };
    else out = handle(req);
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return json(out);
}

function handle(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesTab = req.salesTab || DEFAULT_SALES_TAB;
  const servicesTab = req.servicesTab || DEFAULT_SERVICES_TAB;
  if (req.action === "ping") return { ok: true, title: ss.getName() };

  // One request at a time, so two sales saved together can't clash.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case "listSales": {
        const sheet = getSalesTab(ss, salesTab);
        const last = sheet.getLastRow();
        return { ok: true, rows: last < 2 ? [] : sheet.getRange(2, 1, last - 1, SALES_HEADER.length).getValues() };
      }
      case "addSales": {
        const sheet = getSalesTab(ss, salesTab);
        const rows = req.sales.map(function (s) {
          return [text(s.id), text(s.soldAt), text(s.receipt), text(s.item), Number(s.qty), Number(s.price), Number(s.total), text(s.payment), text(s.customer), text(s.note), text(s.enteredBy)];
        });
        if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SALES_HEADER.length).setValues(rows);
        return { ok: true };
      }
      case "updateSale": {
        const sheet = getSalesTab(ss, salesTab);
        const row = findRow(sheet, req.id);
        if (!row) return { ok: true, found: false };
        const d = req.data;
        // Columns D to J: Item, Qty, Unit Price, Total, Payment, Customer, Note.
        sheet
          .getRange(row, 4, 1, 7)
          .setValues([[text(d.item), Number(d.qty), Number(d.price), Number(d.total), text(d.payment), text(d.customer), text(d.note)]]);
        return { ok: true, found: true };
      }
      case "deleteSale": {
        const sheet = getSalesTab(ss, salesTab);
        const row = findRow(sheet, req.id);
        if (!row) return { ok: true, found: false };
        sheet.deleteRow(row);
        return { ok: true, found: true };
      }
      case "getServices": {
        const sheet = ss.getSheetByName(servicesTab);
        const last = sheet ? sheet.getLastRow() : 0;
        return { ok: true, rows: last < 2 ? [] : sheet.getRange(2, 1, last - 1, 2).getValues() };
      }
      case "saveServices": {
        const sheet = ss.getSheetByName(servicesTab) || ss.insertSheet(servicesTab);
        const rows = [SERVICES_HEADER].concat(
          req.services.map(function (s) {
            return [text(s.name), Number(s.price)];
          }),
        );
        // Only columns A and B are rewritten; anything you keep further right is left alone.
        sheet.getRange("A:B").clearContent();
        sheet.getRange(1, 1, rows.length, 2).setValues(rows);
        sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
        sheet.setFrozenRows(1);
        return { ok: true };
      }
      default:
        return { ok: false, error: "unknown-action" };
    }
  } finally {
    lock.releaseLock();
  }
}

/** Returns the Sales tab, creating it and its header row when missing. */
function getSalesTab(ss, name) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SALES_HEADER.length).setValues([SALES_HEADER]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Sheet row number of the sale with this ID, or 0. */
function findRow(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2 || !id) return 0;
  const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return 0;
}

/**
 * The leading apostrophe makes Sheets store the value as plain text, so an item
 * named "=IMPORTDATA(...)" is never run as a formula and IDs are never turned
 * into numbers or dates. The apostrophe itself is not shown or read back.
 */
function text(value) {
  return "'" + String(value == null ? "" : value);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
