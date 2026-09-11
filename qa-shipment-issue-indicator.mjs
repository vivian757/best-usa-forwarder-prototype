import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();

  const shipmentRow = page.locator('[data-id="TRK-DEMO-001"]');
  await shipmentRow.waitFor();
  await shipmentRow.click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  const sectionCounts = await page.locator(".anchor-issue-count.is-blocker").allInnerTexts();
  const detailIssueCount = sectionCounts.reduce((total, value) => total + Number(value), 0);
  assert.equal(detailIssueCount, 1, "Only the remaining equipment blocker appears in detail navigation");

  console.log("Shipment outer issue indicator QA passed.");
  await context.close();
} finally {
  await browser.close();
}
