import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5175/";
const outputDir = "../../.impeccable/review";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Create", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create shipment" });
  await dialog.waitFor();
  const dialogBox = await dialog.boundingBox();
  assert.ok(dialogBox && dialogBox.width >= 760, "Create shipment uses a large desktop dialog");

  await dialog.getByLabel("Choose source files").setInputFiles([
    { name: "Shipping_Request.pdf", mimeType: "application/pdf", buffer: Buffer.from("mock shipping request") },
    { name: "Cargo_Details.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("mock cargo details") },
  ]);

  await dialog.getByText("Uploading", { exact: true }).first().waitFor();
  await dialog.getByText("Shipping_Request.pdf", { exact: true }).first().waitFor();
  await dialog.getByText("Cargo_Details.xlsx", { exact: true }).first().waitFor();
  await dialog.getByText("Uploading", { exact: true }).first().waitFor({ state: "detached" });

  const extractButton = dialog.getByRole("button", { name: "Extract", exact: true });
  assert.equal(await extractButton.isEnabled(), true, "Extract is enabled when all files finish uploading");

  await dialog.getByRole("button", { name: /Cargo_Details\.xlsx/ }).click();
  await dialog.getByLabel("Preview of Cargo_Details.xlsx").waitFor();
  assert.equal(await dialog.getByText("Local preview", { exact: true }).count(), 0, "Preview heading does not repeat local-file metadata");
  const addFilesButton = dialog.getByRole("button", { name: "Add files", exact: true });
  const addFilesColors = await addFilesButton.evaluate((element) => ({
    button: getComputedStyle(element).color,
    icon: getComputedStyle(element.querySelector(".MuiButton-startIcon")).color,
  }));
  assert.equal(addFilesColors.icon, addFilesColors.button, "Add files icon uses the same action blue as its label");
  await page.screenshot({ path: `${outputDir}/create-shipment-dialog-uploaded.png`, fullPage: false });

  await extractButton.click();
  await dialog.getByText("Scanning documents", { exact: true }).waitFor();
  const extractionScan = dialog.locator(".create-extraction-scan > span");
  await extractionScan.waitFor();
  assert.equal(await extractionScan.evaluate((element) => getComputedStyle(element).animationName), "create-document-scan", "Standard motion animates the document scan line");
  assert.equal(await dialog.getAttribute("aria-busy"), "true", "Dialog exposes its extraction busy state");
  assert.equal(await dialog.getByRole("button", { name: "Extracting…", exact: true }).isDisabled(), true, "Extract cannot be triggered twice while scanning");
  await page.screenshot({ path: `${outputDir}/create-shipment-dialog-extracting.png`, fullPage: false });
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  assert.equal(await dialog.count(), 0, "Extract closes the dialog and opens the draft");
  await page.getByText("Extraction complete. Review the draft information before submitting.", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByRole("heading", { name: "Reference", exact: true }).waitFor();
  await page.getByText("Shipping_Request.pdf", { exact: true }).waitFor();
  await page.getByText("Cargo_Details.xlsx", { exact: true }).waitFor();

  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "Create", exact: true }).click();
  const mobileDialog = mobilePage.getByRole("dialog", { name: "Create shipment" });
  await mobileDialog.waitFor();
  await mobileDialog.getByLabel("Choose source files").setInputFiles({
    name: "Shipping_Request.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("mock shipping request"),
  });
  await mobileDialog.getByText("Uploading", { exact: true }).first().waitFor({ state: "detached" });
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Mobile dialog has no horizontal page overflow (overflow: ${overflow}px)`);
  await mobilePage.screenshot({ path: `${outputDir}/create-shipment-dialog-mobile.png`, fullPage: false });
  await mobileDialog.getByRole("button", { name: "Extract", exact: true }).click();
  const reducedMotionScan = mobileDialog.locator(".create-extraction-scan > span");
  await reducedMotionScan.waitFor();
  assert.equal(await reducedMotionScan.evaluate((element) => getComputedStyle(element).animationName), "none", "Reduced motion keeps extraction progress without the moving scan line");
  await mobileContext.close();

  console.log(JSON.stringify({
    status: "passed",
    url,
    screenshots: [
      `${outputDir}/create-shipment-dialog-uploaded.png`,
      `${outputDir}/create-shipment-dialog-extracting.png`,
      `${outputDir}/create-shipment-dialog-mobile.png`,
    ],
  }, null, 2));
} finally {
  await browser.close();
}
