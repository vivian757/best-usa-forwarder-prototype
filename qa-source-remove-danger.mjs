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

  const uploadControl = page.locator("label.MuiButton-root", { hasText: "Upload" });
  assert.equal(await uploadControl.count(), 0, "View mode hides Upload");
  assert.equal(await page.getByRole("button", { name: "Remove Trucking_Request_TRK-DEMO-001.eml", exact: true }).count(), 0, "View mode hides Delete");
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const removeButton = page.getByRole("button", { name: "Remove Trucking_Request_TRK-DEMO-001.eml", exact: true });
  await removeButton.waitFor();
  await uploadControl.waitFor();
  assert.match(await removeButton.getAttribute("class"), /MuiIconButton-colorError/, "Remove action uses the MUI error color contract");

  const defaultStyles = await removeButton.evaluate((element) => ({
    color: getComputedStyle(element).color,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }));
  assert.equal(defaultStyles.color, "rgb(215, 71, 71)", "Remove action is danger red by default");

  await removeButton.hover();
  await page.waitForTimeout(200);
  const hoverStyles = await removeButton.evaluate((element) => ({
    color: getComputedStyle(element).color,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }));
  assert.equal(hoverStyles.color, "rgb(183, 53, 53)", "Hover uses the darker danger tone");
  assert.notEqual(hoverStyles.backgroundColor, defaultStyles.backgroundColor, "Hover adds a danger background cue");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-002", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  assert.equal(await uploadControl.count(), 0, "Confirmed shipment view mode hides Upload");
  assert.equal(await page.getByRole("button", { name: /Remove / }).count(), 0, "Confirmed shipment view mode hides Delete");
  await page.getByRole("button", { name: "Edit documents", exact: true }).click();
  await uploadControl.waitFor();
  assert.ok(await page.getByRole("button", { name: /Remove / }).count() > 0, "Confirmed shipment edit mode allows Delete");
  assert.equal(await page.getByText("Add version", { exact: true }).count(), 0, "Version-specific action is removed");

  console.log("Source document View/Edit actions QA passed.");
} finally {
  await browser.close();
}
