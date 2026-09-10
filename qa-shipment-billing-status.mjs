import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1087, height: 814 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const inProgressLink = page.getByRole("button", { name: "Billing in progress for TRK-DEMO-002. AR Pending · AP Pending", exact: true });
  await inProgressLink.waitFor();
  assert.equal(await inProgressLink.getByText("In progress", { exact: true }).count(), 1, "Pending billing uses the neutral progress label");
  assert.equal(await page.getByText("Needs attention", { exact: true }).count(), 0, "Legacy warning label is removed from the shipment list");

  console.log("Shipment billing progress status QA passed.");
  await context.close();
} finally {
  await browser.close();
}
