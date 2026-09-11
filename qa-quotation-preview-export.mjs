import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const screenshotPath = process.argv[3];
const pdfPath = process.argv[4] || "/tmp/Quotation_RATE-DEMO-001.pdf";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();

  const quoteName = "2026 Retail California FTL";
  await page.getByText(quoteName, { exact: true }).first().click();
  await page.getByRole("heading", { name: quoteName, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Preview", exact: true }).count(), 0, "Quotation preview is not a primary header action");
  await page.getByRole("button", { name: "More quotation actions", exact: true }).click();
  const actionsMenu = page.getByRole("menu", { name: "Quotation actions", exact: true });
  const actionItems = actionsMenu.getByRole("menuitem");
  assert.equal(await actionItems.first().innerText(), "Export", "Export is the first quotation action");
  await actionsMenu.getByRole("menuitem", { name: "Export", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: /^Quotation Preview/ });
  await dialog.waitFor();
  await dialog.getByText("QUOTE NO. RATE-DEMO-001", { exact: true }).waitFor();
  await dialog.getByText("Demo Retail Distribution LLC", { exact: true }).waitFor();
  await dialog.getByRole("heading", { name: "Pricing Schedule", exact: true }).waitFor();
  await dialog.getByText("3 rates", { exact: true }).waitFor();
  await dialog.getByText("Additional delivery stop", { exact: true }).waitFor();
  await dialog.getByText("Detention", { exact: true }).waitFor();
  assert.equal(await dialog.getByText("Q-DEMO-001", { exact: false }).count(), 0, "Quotation export uses the Prototype rate-plan identity");
  assert.equal(await dialog.getByRole("button", { name: "Export PDF", exact: true }).count(), 1, "Quotation preview exposes one PDF export action");
  assert.equal(await dialog.getByText("Invoice", { exact: false }).count(), 0, "Quotation preview is not presented as an invoice");
  if (screenshotPath) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(pdfPath);
  assert.equal(download.suggestedFilename(), "Quotation_RATE-DEMO-001.pdf");
  const pdfInfo = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert.match(pdfInfo, /^Pages:\s+1$/m, "Quotation export contains exactly one preview page");

  console.log(JSON.stringify({ status: "passed", quoteId: "RATE-DEMO-001", exportedPdfPages: 1, pdfPath }));
  await context.close();
} finally {
  await browser.close();
}
