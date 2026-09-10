import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 814 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.getByText("TRK-DEMO-004", { exact: true }).first().click();
  const lockedChip = page.getByText("Locked", { exact: true });
  await lockedChip.waitFor();
  assert.equal(await page.locator("#job-fields-section input").count(), 0, "Confirmed shipment details remain read-only");
  await lockedChip.hover();
  await page.getByRole("tooltip", { name: "Shipment details are locked after confirmation. Documents can still be managed from the Documents tab." }).waitFor();

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-003", { exact: true }).first().click();
  assert.equal(await page.getByText("Locked", { exact: true }).count(), 0, "Draft shipment does not show a Locked state");

  console.log("Confirmed shipment Locked state QA passed.");
  await context.close();
} finally {
  await browser.close();
}
