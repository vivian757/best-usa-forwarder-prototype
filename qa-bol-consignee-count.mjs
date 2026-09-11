import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const pdfPath = "/tmp/TRK-DEMO-001-2-BOLs.pdf";
const screenshotPath = "/tmp/bol-multi-page-preview.png";
const viewport = { width: 800, height: 814 };
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport, acceptDownloads: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  console.log("Loaded prototype");

  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"] [data-field="shipmentNumber"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByText("2 consignee BOLs · Generate BOL to preview", { exact: true }).waitFor();
  assert.equal(await page.locator(".output-document-table tbody tr").count(), 1, "Documents shows one combined output PDF");
  assert.equal(await page.getByText("Bill of Lading · Pickup", { exact: true }).count(), 0, "Documents excludes the shipper pickup stop");
  assert.match(await page.locator(".output-document-table tbody tr small").innerText(), /^2 consignee BOLs ·/, "The output row reports one BOL page per consignee stop");
  console.log("Combined output count passed");

  const exportButton = page.getByRole("button", { name: "BOL", exact: true });
  await exportButton.waitFor();
  let automaticDownloadCount = 0;
  page.on("download", () => { automaticDownloadCount += 1; });
  await exportButton.click();
  const previewDialog = page.locator(".bol-preview-dialog [role=dialog]");
  await previewDialog.waitFor();
  await page.waitForTimeout(500);
  const previewDialogBox = await previewDialog.boundingBox();
  assert.ok(previewDialogBox.y >= 16 && previewDialogBox.y + previewDialogBox.height <= viewport.height - 16, "Preview dialog fits within the selected viewport");
  assert.equal(automaticDownloadCount, 0, "Header BOL button opens preview without downloading");
  assert.equal(await previewDialog.locator('iframe[title="Bill of Lading PDF preview"]').count(), 0, "Preview remains HTML instead of embedding a PDF viewer");
  const previewPageIndicator = previewDialog.locator(".bol-preview-page-indicator");
  await previewPageIndicator.waitFor();
  assert.equal(await previewPageIndicator.innerText(), "1/2", "Preview count matches consignee stops only");
  await previewDialog.getByRole("button", { name: "Export 2 BOLs", exact: true }).waitFor({ state: "visible" });
  const previousBolButton = previewDialog.getByRole("button", { name: "Previous BOL", exact: true });
  const nextBolButton = previewDialog.getByRole("button", { name: "Next BOL", exact: true });
  assert.equal(await previousBolButton.isDisabled(), true, "Previous BOL is disabled on the first page");
  assert.equal(await nextBolButton.isEnabled(), true, "Next BOL is enabled on the first page");
  const previewDocuments = previewDialog.locator(".bol-preview-document-page");
  assert.equal(await previewDocuments.count(), 2, "HTML preview renders both consignee BOLs in one vertical flow");
  assert.equal(await previewDialog.locator(".bol-dialog-sheet:visible").count(), 2, "Both HTML document sheets are visible together");
  assert.deepEqual(await previewDialog.locator(".bol-preview-document-marker").allTextContents().then((labels) => labels.map((label) => label.replace(/\s+/g, " ").trim())), ["1/2", "2/2"], "Each HTML document marker only shows its position");
  const pdfSourceText = await previewDialog.locator(".bol-preview-documents").innerText();
  assert.doesNotMatch(pdfSourceText, /Freight Forwarding/i, "Document branding removes Forwarding");
  assert.match(pdfSourceText, /Freight & Logistics/i, "Document branding keeps the simplified subtitle");
  assert.match(pdfSourceText, /PO-DEMO-260914/, "BOL reads the current Customer PO from the fixture");
  assert.match(pdfSourceText, /Third Party/, "BOL reads the current freight terms from the fixture");
  assert.match(pdfSourceText, /Pacific Linehaul LLC/, "BOL reads the assigned carrier from the fixture");
  assert.match(pdfSourceText, /COST-DEMO-001/, "BOL reads the carrier rate reference from the fixture");
  assert.match(pdfSourceText, /REF-DEMO-0914/, "BOL reads the shipment reference from the fixture");
  assert.match(pdfSourceText, /Demo Components West LLC/, "BOL resolves the shipper from the canonical Pickup route stop");
  assert.match(pdfSourceText, /Alex Chen/, "BOL uses the Pickup contact instead of the Email requester");
  assert.match(pdfSourceText, /Freight must remain upright\./, "BOL preserves the structured upright handling requirement");
  assert.doesNotMatch(pdfSourceText, /PO-MO-001|BEST USA Contracted Carrier|\$25,000 USD/, "BOL excludes superseded hard-coded values");
  await previewDialog.screenshot({ path: "/tmp/bol-multi-page-preview-initial.png" });
  await nextBolButton.click();
  await page.waitForTimeout(150);
  assert.equal(await previewPageIndicator.innerText(), "2/2", "Next BOL anchors to the second document");
  assert.equal(await nextBolButton.isDisabled(), true, "Next BOL is disabled on the final page");
  assert.equal(await previousBolButton.isEnabled(), true, "Previous BOL is enabled on the final page");
  await previewDialog.screenshot({ path: screenshotPath });
  await previousBolButton.click();
  await page.waitForTimeout(150);
  assert.equal(await previewPageIndicator.innerText(), "1/2", "Previous BOL anchors back to the first document");
  console.log("HTML preview passed");

  const downloadPromise = page.waitForEvent("download");
  await previewDialog.getByRole("button", { name: "Export 2 BOLs", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(pdfPath);
  console.log("PDF downloaded");
  assert.equal(download.suggestedFilename(), "TRK-DEMO-001-2-BOLs.pdf", "Export filename reflects the BOL count");
  const pdfInfo = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert.match(pdfInfo, /^Pages:\s+2$/m, "Exported PDF contains one page per consignee stop");

  console.log(JSON.stringify({ documents: 2, previewPages: 2, exportedPdfPages: 2, pdfPath, screenshotPath }));
} finally {
  await browser.close();
}
