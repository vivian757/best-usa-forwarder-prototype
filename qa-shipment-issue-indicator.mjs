import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const shipmentRow = page.locator('[data-id="TRK-DEMO-001"]');
  const listIssueIndicator = shipmentRow.getByLabel("Blocking issues", { exact: true });
  await listIssueIndicator.waitFor();
  assert.equal((await listIssueIndicator.innerText()).trim(), "", "Shipment list shows no blocking issue number");
  assert.equal(await listIssueIndicator.locator("svg").count(), 1, "Shipment list retains the blocking issue icon");

  await shipmentRow.click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  const sectionCounts = await page.locator(".anchor-issue-count.is-blocker").allInnerTexts();
  const detailIssueCount = sectionCounts.reduce((total, value) => total + Number(value), 0);
  assert.equal(detailIssueCount, 2, "Blocking issue numbers remain available in the detail navigation");

  console.log("Shipment outer issue indicator QA passed.");
  await context.close();
} finally {
  await browser.close();
}
