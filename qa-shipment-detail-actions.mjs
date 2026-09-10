import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.getByText("TRK-DEMO-003", { exact: true }).first().click();
  await page.getByRole("heading", { name: "TRK-DEMO-003", exact: true }).waitFor();

  const moreButton = page.getByRole("button", { name: "More shipment actions", exact: true });
  await moreButton.waitFor();
  await moreButton.click();
  const deleteAction = page.getByRole("menuitem", { name: "Delete shipment", exact: true });
  await deleteAction.waitFor();
  assert.match(await deleteAction.evaluate((element) => getComputedStyle(element).color), /rgb\(215, 71, 71\)/, "Delete action uses the error color contract");

  await deleteAction.click();
  const confirmDialog = page.getByRole("dialog", { name: "Delete Shipment?", exact: true });
  await confirmDialog.waitFor();
  await confirmDialog.getByText("Delete TRK-DEMO-003 from this demo session? This action cannot be undone.", { exact: true }).waitFor();
  await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();

  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  assert.equal(await page.getByText("TRK-DEMO-003", { exact: true }).count(), 0, "Deleted shipment is removed from the current list session");
  await page.getByText("TRK-DEMO-003 deleted from this demo session.", { exact: true }).waitFor();

  console.log("Shipment detail actions QA passed.");
  await context.close();
} finally {
  await browser.close();
}
