import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 571, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: "Open navigation", exact: true });
  await button.waitFor();
  const color = await button.evaluate((element) => getComputedStyle(element).color);
  assert.equal(color, "rgb(255, 255, 255)", "Mobile navigation icon is white");
  console.log(JSON.stringify({ status: "passed", url, color }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
