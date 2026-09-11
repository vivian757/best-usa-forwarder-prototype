import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const contactName = page.getByLabel("Contact name", { exact: true }).first();
  const contactPhone = page.getByLabel("Contact phone", { exact: true }).first();
  assert.equal(await contactName.inputValue(), "Station Operations");
  assert.equal(await contactPhone.inputValue(), "+1 925-555-0101");
  assert.equal(await contactPhone.getAttribute("type"), "tel", "Contact phone uses a telephone control");
  const routeDate = page.getByLabel("Time window date", { exact: true }).first();
  assert.equal(await routeDate.getAttribute("type"), "text", "The visible route date control is locale-independent");
  assert.equal(await routeDate.inputValue(), "Sep 14, 2026", "Structured Time window uses an English date label");
  assert.equal(await page.getByLabel("Start time", { exact: true }).first().inputValue(), "9:00 AM");
  assert.equal(await page.getByLabel("End time", { exact: true }).first().inputValue(), "12:00 PM");
  await page.getByRole("button", { name: "Choose time window date", exact: true }).first().click();
  await page.getByText("September 2026", { exact: true }).waitFor();
  await page.getByRole("dialog", { name: "Choose time window date", exact: true }).screenshot({ path: "/private/tmp/best-usa-english-date-picker.png" });
  await page.getByRole("button", { name: "September 16, 2026", exact: true }).click();
  assert.equal(await routeDate.inputValue(), "Sep 16, 2026", "The English calendar writes the selected ISO date back to the visible field");
  await page.locator("#field-section-shipper").screenshot({ path: "/private/tmp/best-usa-structured-contact-time-window.png" });

  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  assert.equal(await page.getByLabel("ETD", { exact: true }).getAttribute("type"), "text");
  assert.equal(await page.getByLabel("ETA", { exact: true }).getAttribute("type"), "text");
  assert.equal(await page.getByLabel("Place of Delivery ETA", { exact: true }).getAttribute("type"), "text");
  assert.equal(await page.getByLabel("ETD", { exact: true }).getAttribute("placeholder"), "MMM D, YYYY");
  await page.getByLabel("ETD", { exact: true }).fill("Sep 18, 2026");
  await page.getByLabel("ETD", { exact: true }).press("Enter");
  assert.equal(await page.getByLabel("ETD", { exact: true }).inputValue(), "Sep 18, 2026");

  await page.getByRole("button", { name: "Air", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  assert.equal(await page.getByLabel("ETD date", { exact: true }).getAttribute("type"), "text");
  assert.equal(await page.getByLabel("ETD time", { exact: true }).getAttribute("type"), "text");
  assert.equal(await page.getByLabel("ETA date", { exact: true }).getAttribute("placeholder"), "MMM D, YYYY");
  await page.getByLabel("ETD date", { exact: true }).fill("Sep 18, 2026");
  await page.getByLabel("ETD date", { exact: true }).press("Enter");
  await page.getByLabel("ETD time", { exact: true }).fill("2:30 PM");
  await page.getByLabel("ETD time", { exact: true }).press("Enter");
  assert.equal(await page.getByLabel("ETD time", { exact: true }).inputValue(), "2:30 PM");
  assert.doesNotMatch(await page.locator("body").innerText(), /上午|下午/, "Visible date and time fields do not depend on the browser's Chinese day-period labels");
  assert.equal(await page.getByText("Arrival Date / Time", { exact: true }).count(), 0, "House shipment does not duplicate the master arrival time");
  await page.locator("#mode-section-master").screenshot({ path: "/private/tmp/best-usa-english-date-time-fields.png" });

  console.log("Field format QA passed: all visible date and time fields use explicit English formats while preserving ISO values.");
} finally {
  await browser.close();
}
