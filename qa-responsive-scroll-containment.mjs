import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  for (const viewport of [{ width: 1280, height: 814 }, { width: 900, height: 814 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Air", exact: true }).click();
    await page.locator('.MuiDataGrid-row[data-id="AIR-DEMO-014"]').click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.evaluate(() => window.scrollTo({ left: 9999, top: 360 }));
    await page.waitForTimeout(120);

    const layout = await page.evaluate(() => {
      const header = document.querySelector(".detail-page-header")?.getBoundingClientRect();
      const main = document.querySelector(".mui-main-area")?.getBoundingClientRect();
      return {
        scrollX: window.scrollX,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        main: main && { left: main.left, right: main.right },
        header: header && { left: header.left, right: header.right },
      };
    });

    assert.equal(layout.scrollX, 0, `page does not horizontally scroll at ${viewport.width}px`);
    assert.equal(layout.documentWidth, layout.viewportWidth, `app shell contains horizontal overflow at ${viewport.width}px`);
    assert.equal(layout.header.left, layout.main.left, `sticky header remains aligned with content at ${viewport.width}px`);
    assert.ok(layout.header.right <= layout.viewportWidth, `sticky header stays inside the viewport at ${viewport.width}px`);
    await context.close();
  }
  console.log("Responsive scroll containment QA passed: detail tables retain local scroll without shifting the application shell.");
} finally {
  await browser.close();
}
