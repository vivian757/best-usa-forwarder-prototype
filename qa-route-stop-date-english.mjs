import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const dateInputs = page.getByLabel("Time window date", { exact: true });
  assert.ok(await dateInputs.count() > 0, "Route stops expose locale-independent English date fields");
  const firstDate = dateInputs.first();
  assert.equal(await firstDate.getAttribute("type"), "text");
  assert.equal(await firstDate.inputValue(), "Sep 14, 2026");
  await firstDate.fill("Sep 15, 2026");
  await firstDate.press("Enter");
  assert.equal(await firstDate.inputValue(), "Sep 15, 2026");
  assert.equal(await page.getByLabel("Start time", { exact: true }).first().inputValue(), "9:00 AM");
  assert.equal(await page.getByLabel("End time", { exact: true }).first().inputValue(), "12:00 PM");
  assert.doesNotMatch(await page.locator("body").innerText(), /上午|下午/);
  await page.screenshot({ path: "/tmp/route-stop-date-english.png", fullPage: true });

  console.log(JSON.stringify({ control: "english-date-picker", displayFormat: "MMM D, YYYY", storedFormat: "YYYY-MM-DD" }));
} finally {
  await browser.close();
}
