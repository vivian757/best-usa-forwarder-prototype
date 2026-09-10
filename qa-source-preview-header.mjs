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
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  const previewRow = page.getByRole("button", { name: "Preview Trucking_Request_TRK-DEMO-001.eml", exact: true });
  assert.equal(await previewRow.locator("svg.lucide-arrow-up-right").count(), 1, "Source preview uses the same ArrowUpRight icon as BOL");
  assert.equal(await previewRow.locator("svg.lucide-eye").count(), 0, "The separate eye icon action is removed");
  const [previewBox, sourceRowBox] = await Promise.all([previewRow.boundingBox(), previewRow.locator("xpath=..").boundingBox()]);
  assert.ok(previewBox && sourceRowBox && previewBox.width / sourceRowBox.width > 0.9, "The source row itself is the primary preview target");
  await previewRow.click();

  const dialog = page.getByRole("dialog", { name: /^Trucking_Request_TRK-DEMO-001\.eml/ });
  await dialog.waitFor();
  assert.equal(await dialog.getByText("Trucking_Request_TRK-DEMO-001.eml", { exact: true }).count(), 1, "The filename appears only in the dialog title");
  assert.equal(await dialog.getByText("Mock source preview", { exact: true }).count(), 0, "The repeated preview subtitle is removed");
  await dialog.getByText("Page 1", { exact: true }).waitFor();
  assert.equal(await dialog.getByRole("button", { name: "Close document preview", exact: true }).count(), 0, "The duplicate title-bar close control is removed");
  assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1, "The dialog keeps one conventional footer close action");
  const pageMetaHeight = await dialog.locator(".source-document-page-meta").evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(pageMetaHeight <= 34, "The remaining page metadata uses a compact toolbar");

  console.log("Source preview header QA passed.");
} finally {
  await browser.close();
}
