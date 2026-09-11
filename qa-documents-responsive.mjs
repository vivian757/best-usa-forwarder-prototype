import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const inspectViewport = async (width, screenshotPath) => {
  const context = await browser.newContext({ viewport: { width, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${url}?view=shipment&id=TRK-DEMO-003&module=shipments-trucking&tab=documents`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Reference", exact: true }).waitFor();

  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right, width: box.width } : null;
    };
    const scrollArea = document.querySelector(".source-document-table-scroll");
    if (scrollArea) scrollArea.scrollLeft = 100;

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      body: rect(".detail-page-body"),
      workspace: rect(".shipment-single-page"),
      section: rect(".source-page-section"),
      card: rect(".document-group"),
      scrollArea: rect(".source-document-table-scroll"),
      table: rect(".source-document-table"),
      internalScrollWidth: scrollArea?.scrollWidth || 0,
      internalClientWidth: scrollArea?.clientWidth || 0,
      internalScrollLeft: scrollArea?.scrollLeft || 0,
    };
  });

  await page.evaluate(() => {
    document.querySelectorAll(".source-document-table-scroll").forEach((element) => { element.scrollLeft = 0; });
  });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await context.close();
  return metrics;
};

try {
  const mobile = await inspectViewport(442, "/private/tmp/best-usa-documents-442.png");
  const desktop = await inspectViewport(1440, "/private/tmp/best-usa-documents-1440.png");
  console.log(JSON.stringify({ mobile, desktop }, null, 2));

  for (const [label, metrics] of [["mobile", mobile], ["desktop", desktop]]) {
    assert.equal(metrics.documentWidth, metrics.viewportWidth, `${label} viewport must not have page-level horizontal overflow`);
    assert.ok(metrics.workspace.width <= metrics.body.width + 1, `${label} workspace must fit the detail body`);
    assert.ok(metrics.section.right <= metrics.body.right + 1, `${label} documents section must fit the detail body`);
    assert.ok(metrics.card.right <= metrics.section.right + 1, `${label} document card must fit the documents section`);
    assert.ok(metrics.scrollArea.right <= metrics.card.right + 1, `${label} table scroller must fit the document card`);
  }
  assert.ok(mobile.internalScrollWidth > mobile.internalClientWidth, "mobile document table should scroll inside its card");
  assert.ok(mobile.internalScrollLeft > 0, "mobile document table must accept horizontal scrolling");
  assert.ok(desktop.table.width <= desktop.scrollArea.width + 1, "desktop document table should fit without unnecessary scrolling");

  console.log("Documents responsive width QA passed at 442px and 1440px.");
} finally {
  await browser.close();
}
