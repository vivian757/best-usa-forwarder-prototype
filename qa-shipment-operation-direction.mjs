import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  assert.equal((await page.locator(".detail-page-header .detail-title-block > p").textContent()).trim(), "Trucking · FTL", "Trucking header uses its mode and load type scope");
  assert.equal(await page.getByText("Direction", { exact: true }).count(), 0, "Domestic Trucking hides the module-derived direction in View mode");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.getByLabel("Direction", { exact: true }).count(), 0, "Domestic Trucking has no redundant direction control in Edit mode");
  await page.screenshot({ path: "/private/tmp/best-usa-trucking-derived-operation-direction.png", fullPage: false });

  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.getByRole("heading", { name: "Ocean", exact: true }).waitFor();
  assert.equal(await page.getByRole("columnheader", { name: "Direction", exact: true }).count(), 1, "Ocean list exposes the required direction");
  assert.equal(await page.getByRole("columnheader", { name: "Load Type", exact: true }).count(), 1, "Ocean list retains its FCL/LCL load type");
  await page.locator('.MuiDataGrid-row[data-id="OCN-DEMO-001"]').click();
  await page.getByRole("heading", { name: "OCN-DEMO-001", exact: true }).waitFor();
  assert.equal((await page.locator(".detail-page-header .detail-title-block > p").textContent()).trim(), "Ocean · Import · FCL", "Ocean header includes the direction after the mode");
  assert.equal(await page.getByText("Transport mode", { exact: true }).count(), 0, "Ocean Overview does not repeat the immutable transport mode");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.getByLabel("Transport mode", { exact: true }).count(), 0, "Ocean Edit does not expose transport mode as a field");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  await page.getByText("Direction", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Air", exact: true }).click();
  await page.getByRole("heading", { name: "Air", exact: true }).waitFor();
  const directionHeader = page.getByRole("columnheader", { name: "Direction", exact: true });
  assert.equal(await directionHeader.count(), 1, "Air list exposes the required direction");
  const directionSeparator = directionHeader.locator(".MuiDataGrid-columnSeparator");
  assert.equal(await directionSeparator.count(), 1, "Data Grid keeps the MUI column resize handle");
  const initialDirectionWidth = (await directionHeader.boundingBox()).width;
  await directionHeader.hover();
  assert.equal(await directionSeparator.evaluate((element) => getComputedStyle(element).opacity), "1", "Data Grid exposes the resize handle when the header is hovered");
  const separatorBox = await directionSeparator.boundingBox();
  await page.mouse.move(separatorBox.x + separatorBox.width / 2, separatorBox.y + separatorBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(separatorBox.x + separatorBox.width / 2 + 24, separatorBox.y + separatorBox.height / 2);
  await page.mouse.up();
  assert.ok((await directionHeader.boundingBox()).width >= initialDirectionWidth + 20, "Data Grid adjusts a column width through the MUI resize handle");
  assert.equal(await page.getByRole("columnheader", { name: "Load Type", exact: true }).count(), 0, "Air list never displays a Load Type column");
  await page.locator('.MuiDataGrid-row[data-id="AIR-DEMO-002"]').click();
  await page.getByRole("heading", { name: "AIR-DEMO-002", exact: true }).waitFor();
  assert.equal((await page.locator(".detail-page-header .detail-title-block > p").textContent()).trim(), "Air · Import", "Air header includes the direction without a Load Type");
  assert.equal(await page.getByText("Transport mode", { exact: true }).count(), 0, "Air Overview does not repeat the immutable transport mode");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.getByLabel("Transport mode", { exact: true }).count(), 0, "Air Edit does not expose transport mode as a field");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Air", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  await page.getByText("Direction", { exact: true }).waitFor();

  console.log("Shipment direction QA passed: Ocean and Air lists expose Direction; Air has no Load Type.");
} finally {
  await browser.close();
}
