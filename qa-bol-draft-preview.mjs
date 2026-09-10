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

  const previewButton = page.getByRole("button", { name: "Preview Bill of Lading", exact: true });
  await previewButton.click();
  const dialog = page.getByRole("dialog", { name: /^Bill Of Lading Preview/ });
  await dialog.waitFor();
  await dialog.getByText("Draft preview", { exact: true }).waitFor();
  await dialog.getByText("Pending submission", { exact: true }).first().waitFor();
  assert.equal(await dialog.getByRole("button", { name: "Download", exact: true }).count(), 0, "Draft preview does not expose a final document download");

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await previewButton.evaluate((element) => document.activeElement === element), true, "Closing the preview returns focus to its trigger");

  console.log("Draft BOL modal preview QA passed.");
} finally {
  await browser.close();
}
