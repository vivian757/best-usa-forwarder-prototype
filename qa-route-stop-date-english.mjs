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
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"] [data-field="shipmentId"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const dateInputs = page.getByRole("textbox", { name: "Date", exact: true });
  assert.ok(await dateInputs.count() > 0, "Route stops expose an English text date input");
  const firstDate = dateInputs.first();
  assert.equal(await firstDate.getAttribute("placeholder"), "MM/DD/YYYY");
  assert.equal(await firstDate.getAttribute("type"), "text", "Native localized date controls are not used");
  assert.match(await firstDate.inputValue(), /^\d{2}\/\d{2}\/\d{4}$/);
  await firstDate.fill("09/15/2026");
  assert.equal(await firstDate.inputValue(), "09/15/2026");
  await page.screenshot({ path: "/tmp/route-stop-date-english.png", fullPage: true });

  console.log(JSON.stringify({ placeholder: "MM/DD/YYYY", localizedNativeDateRemoved: true }));
} finally {
  await browser.close();
}
