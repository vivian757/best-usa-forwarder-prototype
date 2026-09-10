import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1087, height: 814 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-001", { exact: true }).first().click();

  await page.getByRole("button", { name: "3 sources", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Sources", exact: true });
  await panel.getByRole("heading", { name: "Sources", exact: true }).waitFor();
  await panel.locator(".source-page-count").getByText("1", { exact: true }).waitFor();
  await panel.getByText("Trucking_Request_TRK-DEMO-001.eml", { exact: true }).waitFor();
  const panelBeforeDrag = await panel.boundingBox();
  const panelHeading = await panel.locator(".field-source-inspector-heading").boundingBox();
  assert.ok(panelBeforeDrag && panelHeading, "Source panel and draggable heading are visible");
  await page.mouse.move(panelHeading.x + 24, panelHeading.y + panelHeading.height / 2);
  await page.mouse.down();
  await page.mouse.move(panelHeading.x - 96, panelHeading.y + panelHeading.height / 2);
  await page.mouse.up();
  const panelAfterDrag = await panel.boundingBox();
  assert.ok(panelAfterDrag && panelAfterDrag.x <= panelBeforeDrag.x - 110, "Source panel can be repositioned from its heading on a narrow desktop");
  assert.ok(panelAfterDrag.x >= 0 && panelAfterDrag.y >= 0, "Dragged source panel stays inside the viewport");
  const previewViewport = panel.locator(".source-document-viewport");
  const previewBox = await previewViewport.boundingBox();
  assert.ok(previewBox && previewBox.height >= 240, "Source preview remains usable at the narrow desktop breakpoint");
  assert.equal(await previewViewport.evaluate((element) => getComputedStyle(element).overflowY), "auto", "Source preview keeps its own vertical scrolling");

  await panel.getByRole("button", { name: "Next source", exact: true }).click();
  await panel.locator(".source-page-count").getByText("2", { exact: true }).waitFor();
  await panel.getByText("Shipping_Request_TRK-DEMO-001.pdf", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "Close source panel", exact: true }).click();

  await page.getByRole("button", { name: "View source for Customer PO Number", exact: true }).click();
  const fieldPanel = page.getByRole("complementary", { name: "Source for Customer PO Number", exact: true });
  const fieldTitle = fieldPanel.getByRole("heading", { name: "Customer PO Number", exact: true });
  await fieldTitle.waitFor();
  assert.equal(await fieldTitle.evaluate((element) => getComputedStyle(element).fontSize), "15px", "Source field title uses the compact 15px heading size");
  assert.equal(await fieldPanel.locator(".source-page-navigation").count(), 0, "A field with one source does not show page navigation");
  assert.equal(await fieldPanel.getByText("Current field value", { exact: true }).count(), 0, "Unedited fields do not repeat the visible value");
  await fieldPanel.getByRole("button", { name: "Close source panel", exact: true }).click();

  await page.getByRole("button", { name: "View source and edit history for Commodity Description", exact: true }).click();
  const editedFieldPanel = page.getByRole("complementary", { name: "Source for Commodity Description", exact: true });
  await editedFieldPanel.getByText("Source value", { exact: true }).waitFor();

  console.log("Source panel page navigation QA passed.");
  await context.close();
} finally {
  await browser.close();
}
