import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Billing" }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();

  const exportButton = page.getByRole("button", { name: "Export", exact: true });
  await exportButton.click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  assert.equal(csv.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].startsWith('"Counterparty",'), true, "Billing CSV starts with Counterparty");

  await exportButton.click();
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("menuitem", { name: "Export PDF", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  assert.equal((await popup.locator("thead th").first().textContent())?.trim(), "Counterparty", "Billing PDF starts with Counterparty");
  assert.equal(await popup.getByRole("heading", { name: "BEST USA Billing", exact: true }).count(), 1, "Billing PDF title omits Report");

  console.log(JSON.stringify({ status: "passed", csvFirstField: "Counterparty", pdfFirstField: "Counterparty" }));
  await context.close();
} finally {
  await browser.close();
}
