import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const expectedOrder = ["Ocean", "Air", "Trucking"];

const getShipmentSubmenuOrder = async (page) => {
  const labels = await page.locator('.best-sidebar-shell:visible nav [role="button"]').evaluateAll((items) => items
    .map((item) => item.textContent?.trim())
    .filter((label) => ["Ocean", "Air", "Trucking"].includes(label)));
  return labels;
};

try {
  const desktop = await browser.newContext({ viewport: { width: 1155, height: 814 }, reducedMotion: "reduce" });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(url, { waitUntil: "networkidle" });
  assert.deepEqual(await getShipmentSubmenuOrder(desktopPage), expectedOrder, "Desktop submenu order");
  await desktopPage.getByRole("button", { name: "Trucking", exact: true }).click();
  await desktopPage.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 571, height: 814 }, reducedMotion: "reduce" });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "Open navigation", exact: true }).click();
  assert.deepEqual(await getShipmentSubmenuOrder(mobilePage), expectedOrder, "Mobile submenu order");
  await mobile.close();

  console.log(JSON.stringify({ status: "passed", url, order: expectedOrder }, null, 2));
} finally {
  await browser.close();
}
