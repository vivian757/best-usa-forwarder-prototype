import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const targetUrl = "http://127.0.0.1:5188/";
const reviewDir = ".impeccable/review";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await fs.mkdir(reviewDir, { recursive: true });

let executablePath;
try {
  await fs.access(chromePath);
  executablePath = chromePath;
} catch {
  executablePath = undefined;
}

const browser = await chromium.launch({ headless: true, executablePath });
const browserErrors = [];

function collectErrors(page) {
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
}

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await desktopContext.newPage();
  collectErrors(page);
  await page.goto(targetUrl, { waitUntil: "networkidle" });

  assert.equal(await page.title(), "BEST USA Forwarder — Demo Prototype");
  await page.getByRole("heading", { name: "Shipments", exact: true }).waitFor();
  assert.equal(await page.locator(".data-table tbody tr").count(), 4);
  await page.getByRole("heading", { name: "TRK-DEMO-001" }).waitFor();
  await page.getByText("Source evidence", { exact: true }).waitFor();

  const desktopFit = await page.evaluate(() => {
    const selectors = [".sidebar", ".page-header", ".table-frame", ".workbook", ".workbook-footer"];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      regions: selectors.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect ? { selector, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null;
      }).filter(Boolean),
    };
  });
  assert.ok(desktopFit.document.width <= desktopFit.viewport.width, `desktop page overflow: ${JSON.stringify(desktopFit)}`);
  assert.ok(desktopFit.regions.every((rect) => rect.left >= -1 && rect.right <= desktopFit.viewport.width + 1), `desktop clipped region: ${JSON.stringify(desktopFit)}`);
  assert.ok(desktopFit.regions.find((rect) => rect.selector === ".workbook-footer")?.bottom <= desktopFit.viewport.height + 1);

  await page.screenshot({ path: `${reviewDir}/desktop.png`, fullPage: false });

  await page.getByRole("button", { name: "Run commit check" }).click();
  await page.getByText(/Commit blocked by 2 candidate issues/).waitFor();

  await page.getByRole("button", { name: "Add demo value" }).click();
  await page.getByRole("button", { name: "Use 10 pallets" }).click();
  await page.getByRole("button", { name: "Commit shipment" }).click();
  await page.getByText("Shipment confirmed for this browser session").waitFor();
  await page.getByText("Bill of Lading Preview").waitFor();
  await page.getByText("10 pallets", { exact: true }).waitFor();
  await page.getByText("Dry Van", { exact: true }).waitFor();
  await page.screenshot({ path: `${reviewDir}/desktop-committed.png`, fullPage: false });

  await page.locator(".journey-rail").getByRole("button", { name: "Billing" }).click();
  await page.getByRole("heading", { name: "Billing / Invoicing" }).waitFor();
  assert.equal(await page.locator(".search-field input").inputValue(), "TRK-DEMO-001");
  await page.getByText("No billing record yet for TRK-DEMO-001. Billing starts after an accepted quote.").waitFor();

  await page.getByRole("navigation").getByRole("button", { name: /Shipments/ }).click();
  await page.getByRole("heading", { name: "Shipments", exact: true }).waitFor();
  await page.locator(".data-table tbody tr").first().waitFor();
  await page.locator(".data-table tbody tr").filter({ hasText: "TRK-DEMO-001" }).click();
  await page.getByRole("button", { name: "Quote" }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Q-DEMO-001" }).waitFor();
  await page.screenshot({ path: `${reviewDir}/desktop-quotation.png`, fullPage: false });

  await page.getByRole("navigation").getByRole("button", { name: /Billing/ }).click();
  await page.getByRole("heading", { name: "Billing / Invoicing" }).waitFor();
  await page.getByText("BILL-DEMO-001", { exact: true }).first().click();
  await page.getByRole("heading", { name: "BILL-DEMO-001" }).waitFor();
  await page.getByRole("heading", { name: "Billing readiness", exact: true }).waitFor();

  await page.getByRole("navigation").getByRole("button", { name: /Reports/ }).click();
  await page.getByRole("heading", { name: "Connected data preview", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Data readiness register" }).waitFor();
  assert.equal(await page.locator(".report-callouts").count(), 0);
  await page.getByText("Shipment profitability ledger").waitFor();

  await page.getByRole("navigation").getByRole("button", { name: /Shipments/ }).click();
  await page.locator(".data-table tbody tr").filter({ hasText: "TRK-DEMO-002" }).click();
  await page.getByRole("heading", { name: "TRK-DEMO-002" }).waitFor();
  assert.equal(await page.locator(".workbook-tabs [role=tab]").count(), 1);
  assert.equal(await page.getByRole("tab", { name: "Documents" }).count(), 0);
  assert.equal(await page.getByRole("tab", { name: "BOL preview" }).count(), 0);
  await page.getByText("Summary-only demo record").waitFor();
  await page.getByRole("button", { name: "Close details" }).click();

  const search = page.getByPlaceholder("Search shipment, customer, reference or route");
  await search.fill("Medical");
  assert.equal(await page.locator(".data-table tbody tr").count(), 1);
  await search.fill("No matching shipment");
  await page.getByText("No matching records").waitFor();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.locator(".filter-field select").selectOption("confirmed");
  assert.ok(await page.locator(".data-table tbody tr").count() >= 1);
  await page.locator(".filter-field select").selectOption("all");

  await page.getByRole("button", { name: "Create shipment" }).click();
  await page.getByRole("heading", { name: "Create shipment" }).waitFor();
  await page.getByText("Prepared source set").waitFor();
  await page.getByRole("button", { name: "Prepare job draft" }).click();
  await page.getByText("Review the four working issues before commit").waitFor();

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const mobile = await mobileContext.newPage();
  collectErrors(mobile);
  await mobile.goto(targetUrl, { waitUntil: "networkidle" });
  await mobile.getByRole("heading", { name: "TRK-DEMO-001" }).waitFor();

  const mobilePanelFit = await mobile.evaluate(() => {
    const workbook = document.querySelector(".workbook")?.getBoundingClientRect();
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      workbook: workbook ? { left: workbook.left, right: workbook.right, top: workbook.top, bottom: workbook.bottom } : null,
    };
  });
  assert.ok(mobilePanelFit.scrollWidth <= mobilePanelFit.width, `mobile page overflow: ${JSON.stringify(mobilePanelFit)}`);
  assert.ok(mobilePanelFit.workbook && mobilePanelFit.workbook.left >= -1 && mobilePanelFit.workbook.right <= mobilePanelFit.width + 1);
  await mobile.screenshot({ path: `${reviewDir}/mobile-review.png`, fullPage: false });

  await mobile.getByRole("button", { name: "Close details" }).click();
  await mobile.locator(".workbook").waitFor({ state: "detached" });
  await mobile.getByRole("heading", { name: "Shipments", exact: true }).waitFor();
  const mobileShellFit = await mobile.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    navBottom: document.querySelector(".sidebar")?.getBoundingClientRect().bottom,
    headerBottom: document.querySelector(".page-header")?.getBoundingClientRect().bottom,
  }));
  assert.ok(mobileShellFit.scrollWidth <= mobileShellFit.width, `mobile shell overflow: ${JSON.stringify(mobileShellFit)}`);
  assert.ok(mobileShellFit.navBottom > 0 && mobileShellFit.headerBottom > mobileShellFit.navBottom);
  await mobile.screenshot({ path: `${reviewDir}/mobile.png`, fullPage: false });
  await mobileContext.close();

  assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join("\n")}`);
  console.log(JSON.stringify({
    functional: "passed",
    exploratory: ["blocked commit", "empty search", "status filter", "mobile drawer close"],
    desktopFit,
    mobilePanelFit,
    mobileShellFit,
    browserErrors,
    screenshots: [
      `${reviewDir}/desktop.png`,
      `${reviewDir}/desktop-committed.png`,
      `${reviewDir}/desktop-quotation.png`,
      `${reviewDir}/mobile-review.png`,
      `${reviewDir}/mobile.png`,
    ],
  }, null, 2));
} finally {
  await browser.close();
}
