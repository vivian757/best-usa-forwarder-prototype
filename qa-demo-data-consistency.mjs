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
assert.equal(readFileSync(fixturePath, "utf8").includes('"appliesWhen"'), false, "Runtime fixture uses structured conditions instead of appliesWhen");
assert.equal(readFileSync(fixturePath, "utf8").includes('"templateKey"'), false, "Runtime fixture uses ruleType as the canonical calculation field");
assert.equal(fixture.jobDraft.routeStops.every((stop) => typeof stop.contact === "object" && "name" in stop.contact && "phone" in stop.contact), true, "Route stop contacts keep name and phone as separate fields");
assert.equal(fixture.jobDraft.routeStops.every((stop) => stop.timeWindow?.startAt && stop.timeWindow?.endAt && stop.timeWindow?.timeZone), true, "Route stop time windows keep structured start, end, and time zone values");
assert.equal(readFileSync(fixturePath, "utf8").includes('"arrivalDateTime"'), false, "Air arrival is represented once by the master ETA instead of a duplicate House field");
const transportPreviewRows = fixture.managementDemo.extensionData.transportStagePreviewRows;
const internationalPreviewRows = transportPreviewRows.filter((row) => ["OCEAN", "AIR"].includes(row.transportMode));
assert.equal(internationalPreviewRows.every((row) => ["IMPORT", "EXPORT"].includes(row.operationDirection)), true, "Ocean and Air list fixtures carry an explicit operation direction");
assert.equal(transportPreviewRows.filter((row) => row.transportMode === "AIR").every((row) => !Object.hasOwn(row, "loadType")), true, "Air fixture rows do not introduce a non-canonical Load Type");

const quote = fixture.managementDemo.quotations.find((item) => item.quoteId === "RATE-DEMO-001");
assert.ok(quote);
assert.equal(quote.name, "2026 Retail California FTL");
assert.equal(quote.serviceType, "FTL");
assert.equal(quote.status, "accepted");
assert.equal(quote.version, 3);
assert.deepEqual(
  quote.rateMatrix.map(({ name, rateCategory, equipmentType, ruleType, billingUnit, conditions }) => ({ name, rateCategory, equipmentType, ruleType, billingUnit, conditions })),
  [{ name: "Base FTL freight", rateCategory: "base", equipmentType: "Van / Dry Van (V)", ruleType: "flat_rate", billingUnit: "TRUCK", conditions: [{ field: "serviceType", operator: "equals", value: "FTL" }] }],
);
const runtimeQuote = prototypeRepository.getQuotations().find((item) => item.quoteId === "RATE-DEMO-001");
assert.deepEqual(runtimeQuote.pricingRules, [...runtimeQuote.rateMatrix, ...runtimeQuote.surchargeRules]);
assert.equal(runtimeQuote.pricingRules.every((rule) => rule.ruleType && Array.isArray(rule.conditions) && !("appliesWhen" in rule) && !("templateKey" in rule)), true);
assert.deepEqual(
  quote.surchargeRules.map(({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions }) => ({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions })),
  [
    { code: "MULTI_STOP", rateCategory: "additional", equipmentType: null, ruleType: "per_unit", billingUnit: "STOP", conditions: [{ field: "deliveryStopNumber", operator: "greaterThan", value: 1 }] },
    { code: "DETENTION", rateCategory: "additional", equipmentType: null, ruleType: "threshold_time", billingUnit: "30_MIN", conditions: [{ field: "detentionMinutes", operator: "greaterThan", value: 30 }] },
  ],
);

const pricing = fixture.managementDemo.pricingResults["TRK-DEMO-001"];
assert.equal(pricing.ratePlanId, "RATE-DEMO-001");
assert.equal(pricing.chargeLines.reduce((sum, line) => sum + line.amount, 0), 2550);
assert.deepEqual(
  pricing.chargeLines.map(({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions, unitPrice }) => ({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions, unitPrice })),
  [
    { code: "BASE_FTL", rateCategory: "base", equipmentType: "Van / Dry Van (V)", ruleType: "flat_rate", billingUnit: "TRUCK", conditions: [{ field: "serviceType", operator: "equals", value: "FTL" }], unitPrice: 2400 },
    { code: "MULTI_STOP", rateCategory: "additional", equipmentType: null, ruleType: "per_unit", billingUnit: "STOP", conditions: [{ field: "deliveryStopNumber", operator: "greaterThan", value: 1 }], unitPrice: 150 },
  ],
);

const manualAdjustment = fixture.managementDemo.pricingResults["TRK-DEMO-004"].initialAdjustments[0];
assert.deepEqual(
  {
    sourceType: manualAdjustment.sourceType,
    hasRuleType: Object.hasOwn(manualAdjustment, "ruleType"),
    hasEquipmentType: Object.hasOwn(manualAdjustment, "equipmentType"),
    hasConditions: Object.hasOwn(manualAdjustment, "conditions"),
  },
  { sourceType: "MANUAL_ADJUSTMENT", hasRuleType: false, hasEquipmentType: false, hasConditions: false },
  "Manual adjustments retain their note without inheriting Rate Plan applicability or Rule Type fields",
);

const carrierRate = prototypeRepository.getCostRatePlans()["TRK-DEMO-001"];
assert.equal(carrierRate.ratePlanId, "COST-DEMO-001");
assert.equal(carrierRate.serviceType, "FTL");
assert.equal(carrierRate.status, "accepted");
const carrierPricing = prototypeRepository.getCostRatePlanOptions().find((item) => item.ratePlanId === "COST-DEMO-001");
assert.equal(carrierPricing.pricingRules.every((rule) => rule.ruleType && Array.isArray(rule.conditions) && !("appliesWhen" in rule) && !("templateKey" in rule)), true);
assert.equal(carrierPricing.chargeLines.reduce((sum, line) => sum + line.amount, 0), 1975);
assert.deepEqual(
  carrierPricing.chargeLines.map(({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions, unitPrice }) => ({ code, rateCategory, equipmentType, ruleType, billingUnit, conditions, unitPrice })),
  [
    { code: "BASE_FTL", rateCategory: "base", equipmentType: "Van / Dry Van (V)", ruleType: "flat_rate", billingUnit: "TRUCK", conditions: [{ field: "loadType", operator: "equals", value: "FTL" }], unitPrice: 1850 },
    { code: "MULTI_STOP", rateCategory: "additional", equipmentType: null, ruleType: "per_unit", billingUnit: "STOP", conditions: [{ field: "deliveryStopNumber", operator: "greaterThan", value: 1 }], unitPrice: 125 },
  ],
);

const billing = prototypeRepository.getBillingRecords();
const transportModeByShipmentId = Object.fromEntries(prototypeRepository.getShipments().map((shipment) => [shipment.shipmentId, shipment.transportMode]));
assert.equal(billing.every((record) => record.transportMode === transportModeByShipmentId[record.shipmentId]), true, "Billing transport mode is derived from its linked canonical Shipment");
const customerAr = billing.find((item) => item.billingId === "BILL-DEMO-004");
const carrierAp = billing.find((item) => item.billingId === "BILL-DEMO-005");
assert.deepEqual([customerAr.shipmentId, customerAr.billingType, customerAr.amount], ["TRK-DEMO-001", "customer_ar", 2550]);
assert.deepEqual([carrierAp.shipmentId, carrierAp.billingType, carrierAp.amount], ["TRK-DEMO-001", "vendor_ap", 1975]);

assert.deepEqual(manifest.expectedScenario, {
  transportMode: "TRUCKING",
  operationDirection: "DOMESTIC",
  loadType: "FTL",
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
assert.equal(manifest.generatedFromCanonicalFixture, true);
assert.deepEqual(manifest.intentionalIssues, fixture.reviewIssues.map((issue) => ({
  type: issue.issueType === "missing" ? "missing_information" : issue.issueType,
  fieldPath: issue.fieldPath,
  value: issue.correctedValue ?? issue.proposedValue ?? issue.originalValue ?? null,
  resolutionHint: issue.prototypeQuestion,
})), "Manifest review issues are derived from the canonical fixture");

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

const repositorySource = readFileSync(resolve(appRoot, "src/data/prototypeRepository.js"), "utf8");
for (const fixtureOwnedValue of ["COST-DEMO-001", "RATE-DEMO-099", "Demo Pacific Air Cargo", "Demo Ocean Network"]) {
  assert.equal(repositorySource.includes(fixtureOwnedValue), false, `Repository does not hardcode fixture-owned business value: ${fixtureOwnedValue}`);
}

console.log("Demo data consistency QA passed: FTL multi-stop input, pricing, BOL pages, AR and AP are aligned.");
