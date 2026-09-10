import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const pdfPath = "/tmp/TRK-DEMO-001-2-BOLs.pdf";
const screenshotPath = "/tmp/bol-multi-page-preview.png";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  console.log("Loaded prototype");

  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"] [data-field="shipmentId"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByText("2 BOLs", { exact: true }).waitFor();
  assert.equal(await page.getByText("Bill of Lading · Pickup", { exact: true }).count(), 0, "Documents excludes the shipper pickup stop");
  assert.equal(await page.getByText(/Bill of Lading · Consignee/).count(), 2, "Documents lists one BOL per consignee stop");
  console.log("Documents count passed");

  const exportButton = page.getByRole("button", { name: "Export BOL", exact: true });
  await exportButton.waitFor();
  let automaticDownloadCount = 0;
  page.on("download", () => { automaticDownloadCount += 1; });
  await exportButton.click();
  const previewDialog = page.locator(".bol-preview-dialog [role=dialog]");
  await previewDialog.waitFor();
  await page.waitForTimeout(500);
  assert.equal(automaticDownloadCount, 0, "Header Export BOL opens preview without downloading");
  const previewPageIndicator = previewDialog.locator(".bol-preview-page-indicator");
  await previewPageIndicator.waitFor();
  assert.equal(await previewPageIndicator.innerText(), "1 / 2", "Preview count matches consignee stops only");
  await previewDialog.getByRole("button", { name: "Export 2 BOLs", exact: true }).waitFor();
  await previewDialog.getByText(/Page 1 of 2/, { exact: false }).waitFor();
  await previewDialog.getByRole("button", { name: "Next BOL", exact: true }).click();
  assert.equal(await previewPageIndicator.innerText(), "2 / 2", "Preview can navigate to the second consignee BOL");
  await previewDialog.getByText(/Page 2 of 2/, { exact: false }).waitFor();
  await previewDialog.screenshot({ path: screenshotPath });
  console.log("Multi-page preview passed");

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
