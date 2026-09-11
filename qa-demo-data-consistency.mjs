import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "vite";

const appRoot = resolve(import.meta.dirname);
const prototypeRoot = resolve(appRoot, "..");
const bundleRoot = resolve(prototypeRoot, "demo-data/TRK-DEMO-001");
const fixturePath = resolve(appRoot, "src/fixture.json");
const publishedFixturePath = resolve(prototypeRoot, "BEST_USA_Demo_Mock_Source_Set_TRK-DEMO-001.json");
const manifestPath = resolve(bundleRoot, "manifest.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = readJson(fixturePath);
const publishedFixture = readJson(publishedFixturePath);
const manifest = readJson(manifestPath);
const vite = await createServer({ root: appRoot, appType: "custom", server: { middlewareMode: true } });
const { prototypeRepository } = await vite.ssrLoadModule("/src/data/prototypeRepository.js");
await vite.close();
assert.deepEqual(publishedFixture, fixture, "Published mock source set matches the runtime fixture");

const quote = fixture.managementDemo.quotations.find((item) => item.quoteId === "RATE-DEMO-001");
assert.ok(quote);
assert.equal(quote.name, "2026 Retail California FTL");
assert.equal(quote.serviceType, "FTL");
assert.equal(quote.status, "accepted");
assert.equal(quote.version, 3);

const pricing = fixture.managementDemo.pricingResults["TRK-DEMO-001"];
assert.equal(pricing.ratePlanId, "RATE-DEMO-001");
assert.equal(pricing.chargeLines.reduce((sum, line) => sum + line.amount, 0), 2550);

const carrierRate = prototypeRepository.getCostRatePlans()["TRK-DEMO-001"];
assert.equal(carrierRate.ratePlanId, "COST-DEMO-001");
assert.equal(carrierRate.serviceType, "FTL");
assert.equal(carrierRate.status, "accepted");
const carrierPricing = prototypeRepository.getCostRatePlanOptions().find((item) => item.ratePlanId === "COST-DEMO-001");
assert.equal(carrierPricing.chargeLines.reduce((sum, line) => sum + line.amount, 0), 1975);

const billing = prototypeRepository.getBillingRecords();
const customerAr = billing.find((item) => item.billingId === "BILL-DEMO-004");
const carrierAp = billing.find((item) => item.billingId === "BILL-DEMO-005");
assert.deepEqual([customerAr.shipmentId, customerAr.billingType, customerAr.amount], ["TRK-DEMO-001", "customer_ar", 2550]);
assert.deepEqual([carrierAp.shipmentId, carrierAp.billingType, carrierAp.amount], ["TRK-DEMO-001", "vendor_ap", 1975]);

assert.deepEqual(manifest.expectedScenario, {
  transportMode: "TRUCKING",
  serviceType: "FTL",
  pickupStops: 1,
  deliveryStops: 2,
  consignees: 2,
  handlingUnits: 12,
  packages: 168,
  weightLb: 3950,
  acceptedCustomerQuote: "RATE-DEMO-001",
  customerArUsd: 2550,
  acceptedCarrierRate: "COST-DEMO-001",
  carrierApUsd: 1975,
  outputPdfCount: 1,
  bolPages: 2,
});

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const file of [
  "Cargo_Details_TRK-DEMO-001.xlsx",
  "Shipping_Request_TRK-DEMO-001.pdf",
  "Trucking_Request_TRK-DEMO-001.eml",
]) {
  assert.equal(
    digest(resolve(bundleRoot, "input", file)),
    digest(resolve(appRoot, "public/demo-data/TRK-DEMO-001/input", file)),
    `${file} matches the public prototype copy`,
  );
}

for (const [file, expectedPages] of [
  ["input/Shipping_Request_TRK-DEMO-001.pdf", 1],
  ["output/BOL_TRK-DEMO-001.pdf", 2],
  ["output/Quotation_RATE-DEMO-001.pdf", 1],
]) {
  const result = spawnSync("pdfinfo", [resolve(bundleRoot, file)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || `pdfinfo failed for ${file}`);
  assert.match(result.stdout, new RegExp(`^Pages:\\s+${expectedPages}$`, "m"));
}

for (const path of [
  fixturePath,
  publishedFixturePath,
  manifestPath,
  resolve(bundleRoot, "README.md"),
  resolve(prototypeRoot, "BEST_USA_Demo_Prototype_Validation_Brief_2026-09-07.md"),
  resolve(appRoot, "src/data/prototypeRepository.js"),
]) {
  const text = readFileSync(path, "utf8");
  for (const staleToken of ["2026 Retail West LTL", "Pacific LTL Cost 2026", "COST-DEMO-009"]) {
    assert.equal(text.includes(staleToken), false, `${path} does not contain stale token: ${staleToken}`);
  }
}

console.log("Demo data consistency QA passed: FTL multi-stop input, pricing, BOL pages, AR and AP are aligned.");
