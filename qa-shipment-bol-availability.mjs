import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const fixture = JSON.parse(await readFile(new URL("./src/fixture.json", import.meta.url), "utf8"));
const appSource = await readFile(new URL("./src/App.jsx", import.meta.url), "utf8");
const generatedFixtureShipments = fixture.managementDemo.shipments.filter((shipment) => shipment.transportMode === "TRUCKING" && Boolean(shipment.bolNumber));

assert.ok(generatedFixtureShipments.length >= 2, "The Trucking fixture should include generated BOL examples");
assert.equal(new Set(generatedFixtureShipments.map((shipment) => shipment.bolNumber)).size, generatedFixtureShipments.length, "Generated BOL numbers must be unique");
assert.doesNotMatch(appSource, /initialGeneratedOutputDocumentIds\s*=\s*\[/, "Initial output availability must not be a hard-coded shipment ID array");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 814 }, reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();

  const visibleBolButtons = page.getByRole("button", { name: /^View BOL for TRK-DEMO-/ });
  const visibleLabels = await visibleBolButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  assert.ok(visibleLabels.length >= 3, "The first Trucking page should show several generated BOL icons");
  assert.equal(new Set(visibleLabels).size, visibleLabels.length, "Each generated BOL icon must belong to one shipment row");
  generatedFixtureShipments.forEach((shipment) => {
    assert.ok(visibleLabels.includes(`View BOL for ${shipment.shipmentId}`), `${shipment.shipmentId} should show an icon because its fixture has bolNumber`);
  });
  await page.screenshot({ path: "/private/tmp/best-usa-trucking-bol-icons.png", fullPage: false });

  await page.getByRole("button", { name: visibleLabels[0], exact: true }).click();
  await page.getByRole("dialog", { name: "Bill Of Lading Preview" }).waitFor();
  await page.screenshot({ path: "/private/tmp/best-usa-trucking-bol-preview.png", fullPage: false });

  console.log(JSON.stringify({ generatedBolCount: visibleLabels.length, visibleLabels }, null, 2));
  console.log("Shipment BOL availability QA passed: icons are driven by bolNumber demo data.");
} finally {
  await browser.close();
}
