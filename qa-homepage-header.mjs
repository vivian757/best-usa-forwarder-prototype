import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const assertHeader = async (page, title) => {
  const heading = page.getByRole("heading", { name: title, exact: true });
  await heading.waitFor();
  const header = page.locator("header.mui-page-header");
  const content = page.locator("section.content-area");
  const styles = await header.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      borderBottomWidth: computed.borderBottomWidth,
      paddingLeft: computed.paddingLeft,
      paddingBottom: computed.paddingBottom,
    };
  });
  assert.equal(styles.backgroundColor, "rgba(0, 0, 0, 0)", `${title} header is transparent`);
  assert.equal(styles.borderBottomWidth, "0px", `${title} header has no bottom border`);
  assert.equal(styles.paddingLeft, "24px", `${title} aligns to the desktop page gutter`);
  assert.equal(styles.paddingBottom, "0px", `${title} delegates the vertical gap to content spacing`);

  const headerBox = await header.boundingBox();
  const firstContentBox = await content.locator(":scope > *").first().boundingBox();
  assert.ok(headerBox && firstContentBox, `${title} layout boxes are available`);
  const gap = Math.round(firstContentBox.y - (headerBox.y + headerBox.height));
  assert.equal(gap, 24, `${title} has a 24px gap before its first content block`);
  return { title, gap };
};

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1155, height: 814 }, reducedMotion: "reduce" });
  const page = await desktopContext.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const results = [await assertHeader(page, "Trucking")];
  for (const title of ["Quotations", "Billing & Accounting", "Reports", "Partners"]) {
    await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: title }).click();
    results.push(await assertHeader(page, title));
  }
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 571, height: 814 }, reducedMotion: "reduce" });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  const mobileHeader = mobilePage.locator("header.mui-page-header");
  const mobileStyles = await mobileHeader.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { backgroundColor: computed.backgroundColor, paddingLeft: computed.paddingLeft };
  });
  assert.equal(mobileStyles.backgroundColor, "rgba(0, 0, 0, 0)", "Mobile header is transparent");
  assert.equal(mobileStyles.paddingLeft, "16px", "Mobile header uses the 16px page gutter");
  await mobileContext.close();

  console.log(JSON.stringify({ status: "passed", url, pages: results, mobile: mobileStyles }, null, 2));
} finally {
  await browser.close();
}
