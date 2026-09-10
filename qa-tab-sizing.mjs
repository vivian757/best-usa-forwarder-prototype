import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const readTabMetrics = (locator) => locator.evaluateAll((tabs) => tabs.map((tab) => {
  const rect = tab.getBoundingClientRect();
  const styles = window.getComputedStyle(tab);
  return {
    label: tab.textContent.trim(),
    fontSize: styles.fontSize,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}));

const assertTabScale = async (page, selector, minimumHeight) => {
  const metrics = await readTabMetrics(page.locator(`${selector} .MuiTab-root`));
  assert.ok(metrics.length > 0, `${selector} contains visible tabs`);
  assert.ok(metrics.every((tab) => tab.fontSize === "14px"), `${selector} uses the enlarged 14px label size`);
  assert.ok(metrics.every((tab) => tab.height >= minimumHeight), `${selector} provides the enlarged tab hit area`);
  return metrics;
};

try {
  const context = await browser.newContext({ viewport: { width: 1155, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Partners" }).click();
  await page.getByRole("heading", { name: "Partners", exact: true }).waitFor();
  const partnerTabs = await assertTabScale(page, ".partner-list-tabs", 52);
  if (process.env.QA_SCREENSHOT) await page.screenshot({ path: process.env.QA_SCREENSHOT, fullPage: false });

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Billing & Accounting" }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();
  const billingTabs = await assertTabScale(page, ".partner-list-tabs", 52);
  assert.equal(await page.locator(".billing-grid-header .billing-export-header-actions").count(), 1, "Billing export actions remain in the grid header");

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Trucking" }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await page.getByText("TRK-DEMO-001", { exact: true }).first().click();
  await page.getByRole("tablist", { name: "Shipment workspace" }).waitFor();
  const workspaceTabs = await assertTabScale(page, ".shipment-workspace-tabs", 52);

  console.log(JSON.stringify({ status: "passed", url, partnerTabs, billingTabs, workspaceTabs }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
