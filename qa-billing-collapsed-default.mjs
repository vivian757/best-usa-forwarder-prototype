import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Billing & Accounting", exact: true }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();

  const groups = page.locator(".billing-counterparty-toggle");
  assert.ok(await groups.count() > 0, "Billing groups are rendered");
  assert.deepEqual(await groups.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-expanded"))),
    Array(await groups.count()).fill("false"), "Billing groups are collapsed by default");
  assert.equal(await page.locator(".billing-counterparty-body").count(), 0, "No billing details open automatically");

  await groups.first().click();
  assert.equal(await groups.first().getAttribute("aria-expanded"), "true", "The first billing group still opens on demand");
  assert.equal(await page.locator(".billing-counterparty-body").count(), 1, "Only the selected billing group opens");

  const arGroup = page.locator(".billing-counterparty-group", { hasText: "Demo Retail Distribution LLC" });
  if ((await arGroup.locator(".billing-counterparty-toggle").getAttribute("aria-expanded")) !== "true") {
    await arGroup.locator(".billing-counterparty-toggle").click();
  }
  const arRow = arGroup.locator("tr", { hasText: "BILL-DEMO-004" });
  await arRow.waitFor();
  assert.match(await arRow.innerText(), /TRK-DEMO-001/);
  assert.match(await arRow.innerText(), /\$2,550(?:\.00)?/);

  await page.getByRole("tab", { name: "Pay-to (AP)", exact: true }).click();
  const apGroup = page.locator(".billing-counterparty-group", { hasText: "Pacific Linehaul LLC" });
  await apGroup.locator(".billing-counterparty-toggle").click();
  const apRow = apGroup.locator("tr", { hasText: "BILL-DEMO-005" });
  await apRow.waitFor();
  assert.match(await apRow.innerText(), /TRK-DEMO-001/);
  assert.match(await apRow.innerText(), /\$1,975(?:\.00)?/);

  console.log("Billing grouped AR/AP QA passed.");
} finally {
  await browser.close();
}
