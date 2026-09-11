import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-001", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  const previewRow = page.getByRole("button", { name: "Preview Trucking_Request_TRK-DEMO-001.eml", exact: true });
  assert.equal(await previewRow.locator("svg.lucide-arrow-up-right").count(), 1, "Source preview uses the same ArrowUpRight icon as BOL");
  assert.equal(await previewRow.locator("svg.lucide-eye").count(), 0, "The separate eye icon action is removed");
  const [previewBox, sourceRowBox] = await Promise.all([previewRow.boundingBox(), previewRow.locator("xpath=..").boundingBox()]);
  assert.ok(previewBox && sourceRowBox && previewBox.width > 0 && previewBox.x >= sourceRowBox.x, "The source preview control is visible in its row");
  await previewRow.click();

  const dialog = page.getByRole("dialog", { name: /^Trucking_Request_TRK-DEMO-001\.eml/ });
  await dialog.waitFor();
  assert.equal(await dialog.getByText("Trucking_Request_TRK-DEMO-001.eml", { exact: true }).count(), 1, "The filename appears only in the dialog title");
  assert.equal(await dialog.getByText("Mock source preview", { exact: true }).count(), 0, "The repeated preview subtitle is removed");
  await dialog.getByText("Email", { exact: true }).waitFor();
  await dialog.getByText("FTL multi-stop pickup request - PO-DEMO-260914 - Sep 14", { exact: true }).waitFor();
  await dialog.getByText(/For pickup, contact Alex Chen/, { exact: false }).waitFor();
  assert.equal(await dialog.locator(".source-document-email.is-parsed-source").count(), 1, "Email preview is parsed from the source EML file");
  assert.equal(await dialog.getByRole("button", { name: "Close document preview", exact: true }).count(), 0, "The duplicate title-bar close control is removed");
  assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1, "The dialog keeps one conventional footer close action");
  const pageMetaHeight = await dialog.locator(".source-document-page-meta").evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(pageMetaHeight <= 34, "The remaining page metadata uses a compact toolbar");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Preview Cargo_Details_TRK-DEMO-001.xlsx", exact: true }).click();
  const spreadsheetDialog = page.getByRole("dialog", { name: /^Cargo_Details_TRK-DEMO-001\.xlsx/ });
  await spreadsheetDialog.getByText("Cargo Details TRK-DEMO-001", { exact: true }).waitFor();
  assert.equal(await spreadsheetDialog.locator(".source-document-sheet.is-parsed-source").count(), 1, "Spreadsheet preview is parsed from the source XLSX file");
  await page.screenshot({ path: "../../.impeccable/review/source-xlsx-preview.png", fullPage: false });
  await spreadsheetDialog.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Preview Shipping_Request_TRK-DEMO-001.pdf", exact: true }).click();
  const pdfDialog = page.getByRole("dialog", { name: /^Shipping_Request_TRK-DEMO-001\.pdf/ });
  await pdfDialog.locator("object[type='application/pdf']").waitFor();

  console.log("Source preview header QA passed.");
} finally {
  await browser.close();
}
