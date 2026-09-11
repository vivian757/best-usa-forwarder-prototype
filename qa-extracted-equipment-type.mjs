import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const modes = [
  { name: "Ocean", selection: "20' General" },
  { name: "Air", selection: "Loose cargo" },
  { name: "Trucking", selection: "Van / Dry Van (V)" },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function openCreateDialog(page, mode) {
  await page.getByRole("button", { name: mode, exact: true }).click();
  await page.getByRole("heading", { name: mode, exact: true }).waitFor();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create shipment" });
  await dialog.waitFor();
  return dialog;
}

try {
  for (const mode of modes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error(`${mode.name} page error: ${error.message}`));
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const dialog = await openCreateDialog(page, mode.name);
    await dialog.getByLabel("Choose source files").setInputFiles({
      name: `${mode.name}_Shipping_Request.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`mock ${mode.name.toLowerCase()} shipping request`),
    });
    await dialog.getByText("Uploading", { exact: true }).first().waitFor({ state: "detached" });
    await dialog.getByRole("button", { name: "Extract", exact: true }).click();
    await dialog.getByText("Scanning documents", { exact: true }).waitFor();
    await dialog.waitFor({ state: "detached" });

    const equipmentControl = page.locator(".best-form-control").filter({ has: page.locator("label", { hasText: /^Equipment Type$/ }) });
    const equipmentType = equipmentControl.getByRole("combobox");
    await equipmentType.waitFor();
    await page.getByText("Select an equipment type.", { exact: true }).waitFor();
    assert.equal(await equipmentType.getAttribute("aria-invalid"), "true", `${mode.name} Extract marks Equipment Type invalid`);
    assert.equal(await page.getByLabel("1 unresolved blocker").count(), 1, `${mode.name} Extract shows one navigation blocker`);

    if (mode.name === "Trucking") {
      await equipmentType.fill(mode.selection);
    } else {
      await equipmentType.click();
      await page.getByRole("option", { name: mode.selection, exact: true }).click();
    }
    await page.getByText("Select an equipment type.", { exact: true }).waitFor({ state: "detached" });
    assert.notEqual(await equipmentType.getAttribute("aria-invalid"), "true", `${mode.name} Equipment Type clears after selection`);
    assert.equal(await page.getByLabel("1 unresolved blocker").count(), 0, `${mode.name} navigation blocker clears after selection`);
    console.log(`${mode.name} Extract Equipment Type QA passed.`);
    await context.close();
  }

  const scratchContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const scratchPage = await scratchContext.newPage();
  await scratchPage.goto(url, { waitUntil: "domcontentloaded" });
  const scratchDialog = await openCreateDialog(scratchPage, "Ocean");
  await scratchDialog.getByRole("button", { name: "Start from scratch", exact: true }).click();
  const scratchEquipmentControl = scratchPage.locator(".best-form-control").filter({ has: scratchPage.locator("label", { hasText: /^Equipment Type$/ }) });
  const scratchEquipmentType = scratchEquipmentControl.getByRole("combobox");
  await scratchEquipmentType.waitFor();
  assert.notEqual(await scratchEquipmentType.getAttribute("aria-invalid"), "true", "Start from scratch does not show the Extract-only error");
  assert.equal(await scratchPage.getByText("Select an equipment type.", { exact: true }).count(), 0, "Start from scratch has no extraction error message");
  await scratchContext.close();

  console.log(JSON.stringify({ status: "passed", checked: modes.map(({ name }) => `${name} Extract`) }, null, 2));
} finally {
  await browser.close();
}
