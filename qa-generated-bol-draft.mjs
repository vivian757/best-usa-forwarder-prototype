import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`Page error: ${error.message}`));
  await page.goto(`${url}?view=shipment&id=TRK-DEMO-001&module=shipments-trucking`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  const shipmentStatus = page.getByRole("combobox", { name: "Shipment status", exact: true });
  await shipmentStatus.waitFor();
  assert.equal((await shipmentStatus.textContent()).trim(), "Draft");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByRole("heading", { name: "Output", exact: true }).waitFor();
  assert.equal(await page.locator(".output-document-table tbody tr").count(), 1, "Output represents the single combined PDF before generation");
  await page.getByText("2 consignee BOLs · Generate BOL to preview", { exact: true }).waitFor();

  await page.getByRole("button", { name: "BOL", exact: true }).click();
  await page.getByRole("button", { name: "Generating…", exact: true }).waitFor();
  await page.getByText("Bill Of Lading Preview", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("heading", { name: "Output", exact: true }).waitFor();
  assert.equal(await page.getByText("Generate BOL to preview", { exact: true }).count(), 0, "Generated draft no longer shows pending-copy rows");
  await page.getByText("2 consignee BOLs", { exact: true }).waitFor();
  assert.equal(await page.locator(".output-document-table tbody tr").count(), 1, "Generated Output keeps one row for the combined PDF");
  assert.equal(await page.getByRole("button", { name: "Preview Bill of Lading PDF", exact: true }).count(), 1, "The combined PDF has one preview action while the shipment remains Draft");
  assert.equal(await page.locator(".output-document-table time").count(), 1, "The combined PDF has one Generated-at value");
  await page.screenshot({ path: "/private/tmp/best-usa-bol-output-single-row.png", fullPage: false });
  await page.getByRole("button", { name: "Preview Bill of Lading PDF", exact: true }).click();
  await page.getByText("Bill Of Lading Preview", { exact: true }).waitFor();
  await page.getByText("1/2", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal((await shipmentStatus.textContent()).trim(), "Draft", "Generating and previewing BOL does not change shipment status");

  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  const row = page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]');
  await row.getByRole("button", { name: "View BOL for TRK-DEMO-001", exact: true }).waitFor();

  console.log("Draft BOL generation QA passed.");
  await context.close();
} finally {
  await browser.close();
}
