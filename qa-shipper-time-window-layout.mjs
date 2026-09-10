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

  const shipperSection = page.locator("#field-section-shipper");
  const contact = shipperSection.locator(".field-control").filter({ has: page.getByText("Contact", { exact: true }) });
  const timeWindow = shipperSection.locator(".field-control").filter({ has: page.getByText("Time Window", { exact: true }) });
  const [contactBox, timeWindowBox] = await Promise.all([contact.boundingBox(), timeWindow.boundingBox()]);

  assert.ok(contactBox && timeWindowBox, "Shipper contact and time window are visible");
  assert.ok(Math.abs(contactBox.y - timeWindowBox.y) < 4, "Time Window is aligned beside Contact");
  assert.ok(timeWindowBox.x > contactBox.x, "Time Window occupies the right column");
  assert.ok(Math.abs(contactBox.width - timeWindowBox.width) < 4, "Both fields use equal column widths");

  console.log("Shipper Time Window layout QA passed.");
} finally {
  await browser.close();
}
