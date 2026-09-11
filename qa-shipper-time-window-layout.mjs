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
  const contactName = shipperSection.locator(".field-control").filter({ has: page.getByText("Contact name", { exact: true }) });
  const contactPhone = shipperSection.locator(".field-control").filter({ has: page.getByText("Contact phone", { exact: true }) });
  const timeWindow = shipperSection.locator(".field-control").filter({ has: page.getByText("Time window", { exact: true }) });
  const [contactNameBox, contactPhoneBox, timeWindowBox] = await Promise.all([contactName.boundingBox(), contactPhone.boundingBox(), timeWindow.boundingBox()]);

  assert.ok(contactNameBox && contactPhoneBox && timeWindowBox, "Structured contact and time window fields are visible");
  assert.ok(Math.abs(contactNameBox.y - contactPhoneBox.y) < 4, "Contact name and phone are aligned as a pair");
  assert.ok(contactPhoneBox.x > contactNameBox.x, "Contact phone occupies the right column");
  assert.ok(timeWindowBox.y > contactNameBox.y, "Time window follows the structured contact fields");

  console.log("Shipper contact and Time Window layout QA passed.");
} finally {
  await browser.close();
}
