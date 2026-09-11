import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const prototypeRoot = resolve(appRoot, "..");
const fixturePath = resolve(appRoot, "src/fixture.json");
const publishedFixturePath = resolve(prototypeRoot, "BEST_USA_Demo_Mock_Source_Set_TRK-DEMO-001.json");
const manifestPath = resolve(prototypeRoot, "demo-data/TRK-DEMO-001/manifest.json");
const checkOnly = process.argv.includes("--check");

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const shipmentId = fixture.fixtureId;
const job = fixture.jobDraft;
const representativeShipment = fixture.managementDemo.shipments.find((shipment) => shipment.shipmentId === shipmentId);
const pricingResult = fixture.managementDemo.pricingResults[shipmentId];
const carrierRate = fixture.managementDemo.carrierRatePlans[shipmentId];
const customerAr = fixture.managementDemo.billing.find((entry) => entry.shipmentId === shipmentId && entry.billingType === "customer_ar");
const carrierAp = fixture.managementDemo.billing.find((entry) => entry.shipmentId === shipmentId && entry.billingType === "vendor_ap");
const pickupStops = job.routeStops.filter((stop) => stop.activity.toLowerCase() === "pickup");
const deliveryStops = job.routeStops.filter((stop) => stop.activity.toLowerCase() === "delivery");
const consignees = new Set(deliveryStops.map((stop) => stop.company));

assert.ok(representativeShipment, `Missing representative shipment ${shipmentId}`);
assert.ok(pricingResult, `Missing pricing result for ${shipmentId}`);
assert.ok(carrierRate, `Missing carrier rate for ${shipmentId}`);
assert.ok(customerAr, `Missing customer AR for ${shipmentId}`);
assert.ok(carrierAp, `Missing carrier AP for ${shipmentId}`);

const expectedScenario = {
  transportMode: representativeShipment.transportMode,
  operationDirection: representativeShipment.operationDirection || job.overview.operationDirection,
  loadType: representativeShipment.loadType || representativeShipment.serviceType || job.overview.loadType || job.overview.serviceType,
  pickupStops: pickupStops.length,
  deliveryStops: deliveryStops.length,
  consignees: consignees.size,
  handlingUnits: job.cargoTotals.totalHandlingUnits,
  packages: job.cargoTotals.totalPackagesPieces,
  weightLb: job.cargoTotals.shipmentTotalWeight.value,
  acceptedCustomerQuote: pricingResult.ratePlanId,
  customerArUsd: customerAr.amount,
  acceptedCarrierRate: carrierRate.ratePlanId,
  carrierApUsd: carrierAp.amount,
  outputPdfCount: deliveryStops.length ? 1 : 0,
  bolPages: deliveryStops.length,
};

const intentionalIssues = fixture.reviewIssues.map((issue) => ({
  type: issue.issueType === "missing" ? "missing_information" : issue.issueType,
  fieldPath: issue.fieldPath,
  value: issue.correctedValue ?? issue.proposedValue ?? issue.originalValue ?? null,
  resolutionHint: issue.prototypeQuestion,
}));

const generatedManifest = {
  fixtureId: fixture.fixtureId,
  version: "2.0",
  type: "synthetic_demo_evidence_bundle",
  createdAt: "2026-09-11T11:24:00+08:00",
  canonicalFixture: "../../demo-prototype/src/fixture.json",
  generatedFromCanonicalFixture: true,
  privacy: "All parties, contacts, addresses, identifiers, and amounts are synthetic.",
  demoSequence: [
    "Create the Trucking shipment from the customer email, Shipping Request PDF, and Cargo Details workbook.",
    "Run the mock extraction and open the Shipment Details workspace.",
    "Inspect the source document for extracted fields and complete the missing Equipment Type.",
    "Review the accepted Customer Quote and Carrier Rate in Charge & Cost, then save changes.",
    "Preview and export one PDF containing two consignee BOL pages.",
    "Open Billing & Accounting to review the customer AR and carrier AP for TRK-DEMO-001."
  ],
  intentionalIssues,
  expectedScenario,
  files: [
    "input/Trucking_Request_TRK-DEMO-001.eml",
    "input/Shipping_Request_TRK-DEMO-001.pdf",
    "input/Cargo_Details_TRK-DEMO-001.xlsx",
    "input/Pickup_Instructions_TRK-DEMO-001.txt",
    "output/BOL_TRK-DEMO-001.pdf",
    "output/Quotation_RATE-DEMO-001.pdf",
    "README.md"
  ]
};

const fixtureOutput = `${JSON.stringify(fixture, null, 2)}\n`;
const manifestOutput = `${JSON.stringify(generatedManifest, null, 2)}\n`;

if (checkOnly) {
  assert.equal(await readFile(publishedFixturePath, "utf8"), fixtureOutput, "Published fixture is stale; run npm run sync:demo-artifacts");
  assert.equal(await readFile(manifestPath, "utf8"), manifestOutput, "Manifest is stale; run npm run sync:demo-artifacts");
  console.log("Generated demo artifacts match the canonical fixture.");
} else {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(publishedFixturePath, fixtureOutput);
  await writeFile(manifestPath, manifestOutput);
  console.log("Published fixture and manifest generated from src/fixture.json.");
}
