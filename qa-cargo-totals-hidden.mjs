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
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-002", { exact: true }).first().click();
  await page.getByRole("heading", { name: "TRK-DEMO-002", exact: true }).waitFor();

  assert.equal(await page.locator('[aria-label="Cargo totals"]').count(), 0, "Cargo totals summary is not rendered");
  assert.equal(await page.getByText("Total Handling Units", { exact: true }).count(), 0, "Handling unit total is not rendered");
  assert.equal(await page.getByText("Total Packages / Pieces", { exact: true }).count(), 0, "Package total is not rendered");

  console.log("Cargo totals hidden QA passed.");
  await context.close();
} finally {
  await browser.close();
}
