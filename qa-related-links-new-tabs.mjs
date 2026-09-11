import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function expectPopup(page, action, expectedView, expectedId, expectedHeading) {
  const [popup] = await Promise.all([page.waitForEvent("popup"), action()]);
  await popup.waitForLoadState("domcontentloaded");
  await popup.getByRole("heading", { name: expectedHeading, exact: true }).waitFor();
  const popupUrl = new URL(popup.url());
  assert.equal(popupUrl.searchParams.get("view"), expectedView);
  assert.equal(popupUrl.searchParams.get("id"), expectedId);
  assert.equal(await popup.evaluate(() => window.opener), null, "New detail tab does not retain access to its opener");
  await popup.close();
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${url}?view=shipment&id=TRK-DEMO-001&module=shipments-trucking&tab=billing`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Customer Charge", exact: true }).waitFor();

  await expectPopup(
    page,
    () => page.getByRole("button", { name: /Open 2026 Retail California FTL version 3 in new tab/ }).click(),
    "quotation",
    "RATE-DEMO-001",
    "2026 Retail California FTL",
  );
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();

  await expectPopup(
    page,
    () => page.getByRole("button", { name: /Open Pacific FTL Multi-stop Cost 2026 in new tab/ }).click(),
    "carrier-rate",
    "COST-DEMO-001",
    "Pacific FTL Multi-stop Cost 2026",
  );

  await page.getByRole("button", { name: "Billing & Accounting", exact: true }).click();
  const firstBillingGroup = page.locator(".billing-counterparty-toggle").first();
  await firstBillingGroup.click();
  const shipmentLink = page.getByRole("button", { name: /Open shipment .* in new tab/ }).first();
  const shipmentId = (await shipmentLink.getAttribute("aria-label")).match(/^Open shipment (.+) in new tab$/)?.[1];
  assert.ok(shipmentId);
  await expectPopup(
    page,
    () => shipmentLink.click(),
    "shipment",
    shipmentId,
    shipmentId,
  );

  const billingRecordLink = page.getByRole("button", { name: /Open billing record .* in new tab/ }).first();
  await expectPopup(
    page,
    () => billingRecordLink.click(),
    "shipment",
    shipmentId,
    shipmentId,
  );

  console.log("Related-record new-tab QA passed.");
  await context.close();
} finally {
  await browser.close();
}
