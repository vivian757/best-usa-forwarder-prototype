import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: import.meta.dirname, appType: "custom", server: { middlewareMode: true } });

try {
  const { prototypeRepository } = await vite.ssrLoadModule("/src/data/prototypeRepository.js");
  const {
    DOMAIN_SCHEMA_V1,
    adaptLegacyClassification,
    buildPricingSnapshot,
    deriveBillingEntries,
    deriveOutputDocuments,
    linkShipmentDerivedReferences,
    matchRatePlan,
    matchesRatePlanApplicability,
    validateBillingEntry,
    validateFieldEvidence,
    validateOutputDocument,
    validateShipment,
  } = await vite.ssrLoadModule("/src/domain/shipmentDomain.js");
  const { getPricingConditionOptions } = await vite.ssrLoadModule("/src/data/pricingModel.js");

  assert.deepEqual(
    getPricingConditionOptions([], { transportMode: "AIR", ruleType: "flat_rate", rateCategory: "additional" }).map(({ label }) => label),
    ["All shipments"],
    "Air flat-rate conditions omit transport mode and unit-based duplicates",
  );
  assert.deepEqual(
    getPricingConditionOptions([], { transportMode: "OCEAN", ruleType: "per_unit", rateCategory: "additional" }).map(({ label }) => label),
    ["All shipments", "FCL shipments", "LCL shipments"],
    "Ocean conditions stay limited to its load types",
  );
  assert.deepEqual(
    getPricingConditionOptions([], { transportMode: "TRUCKING", ruleType: "flat_rate", rateCategory: "base" }).map(({ label }) => label),
    ["All shipments", "LTL shipments", "FTL shipments"],
    "Base pricing uses the same simple applicability choices as Additional Pricing",
  );
  assert.deepEqual(
    getPricingConditionOptions([], { transportMode: "TRUCKING", ruleType: "per_unit", rateCategory: "additional" }).map(({ label }) => label),
    ["All shipments", "LTL shipments", "FTL shipments"],
    "Trucking additional conditions stay limited to basic shipment scope",
  );
  assert.equal(
    getPricingConditionOptions([{ field: "detentionMinutes", operator: "greaterThan", value: 30 }], { transportMode: "TRUCKING", ruleType: "threshold_time", rateCategory: "additional" })
      .some(({ label }) => label === "After 30 free min"),
    true,
    "Existing advanced conditions remain selectable while editing legacy rules",
  );

  assert.deepEqual(
    adaptLegacyClassification({ transportMode: "LAND", serviceType: "LTL", operationDirection: "DOMESTIC" }),
    { transportMode: "TRUCKING", operationDirection: "DOMESTIC", loadType: "LTL", migrationWarnings: ["LEGACY_LAND_MAPPED_TO_TRUCKING"] },
    "Legacy LAND maps only toward canonical TRUCKING",
  );
  assert.deepEqual(
    adaptLegacyClassification({ serviceType: "Air Freight", operationDirection: "IMPORT" }),
    { transportMode: "AIR", operationDirection: "IMPORT", loadType: null, migrationWarnings: [] },
    "Legacy Air Freight maps to AIR with a null loadType",
  );
  assert.equal(
    adaptLegacyClassification({ transportMode: "OCEAN", serviceScope: "FCL · Asia to US West Coast" }).loadType,
    "FCL",
    "Legacy serviceScope maps its leading classification into loadType",
  );
  assert.equal(
    adaptLegacyClassification({ transportMode: "OCEAN", serviceType: "FCL" }).operationDirection,
    null,
    "The generic adapter never guesses operationDirection from transportMode",
  );
  assert.equal(matchesRatePlanApplicability(
    { transportMode: "TRUCKING", operationDirection: "DOMESTIC", loadType: "FTL", commercialTerms: {} },
    { transportMode: "TRUCKING", operationDirection: null, loadType: null, serviceTerm: null, serviceLevel: null },
  ), true, "Null Rate Plan applicability dimensions behave as wildcards");
  assert.equal(matchesRatePlanApplicability(
    { transportMode: "TRUCKING", operationDirection: "DOMESTIC", loadType: "FTL", commercialTerms: {} },
    { transportMode: "TRUCKING", operationDirection: null, loadType: "LTL", serviceTerm: null, serviceLevel: null },
  ), false, "A non-null Rate Plan loadType is matched strictly");

  const domain = prototypeRepository.getCanonicalDomain();
  const validation = prototypeRepository.assertCanonicalDomain();
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
  assert.ok(domain.shipments.length >= 3);
  assert.ok(domain.ratePlans.some((plan) => plan.side === "SELL"));
  assert.ok(domain.ratePlans.some((plan) => plan.side === "BUY"));

  const shipmentById = Object.fromEntries(domain.shipments.map((shipment) => [shipment.shipmentId, shipment]));
  const snapshotById = Object.fromEntries(domain.pricingSnapshots.map((snapshot) => [snapshot.pricingSnapshotId, snapshot]));
  const sourceById = Object.fromEntries(domain.sourceDocuments.map((source) => [source.sourceDocumentId, source]));
  const trucking = shipmentById["TRK-DEMO-001"];
  assert.deepEqual([trucking.transportMode, trucking.operationDirection, trucking.loadType], ["TRUCKING", "DOMESTIC", "FTL"]);
  assert.ok(DOMAIN_SCHEMA_V1.required.shipment.includes("operationDirection"), "Operation direction remains required in the Shipment schema even when Trucking derives it from module context");
  assert.equal(
    domain.shipments.filter((shipment) => shipment.transportMode === "TRUCKING").every((shipment) => shipment.operationDirection === "DOMESTIC"),
    true,
    "Every current Trucking demo Shipment carries the canonical DOMESTIC direction",
  );
  assert.equal(trucking.modeDetails.type, "TRUCKING");
  assert.equal(trucking.modeDetails.trucking.routeStops.every((stop) => !stop.contact || typeof stop.contact === "object"), true, "Trucking contacts use structured snapshots");
  assert.equal(trucking.modeDetails.trucking.routeStops.every((stop) => !stop.timeWindow || (stop.timeWindow.startAt && stop.timeWindow.endAt && stop.timeWindow.timeZone)), true, "Trucking time windows preserve start, end, and time zone");
  assert.equal(trucking.cargoLines.every((line) => line.routeStopRefs.length === 1), true);

  const matchedCustomerPlan = matchRatePlan(trucking, domain.ratePlans, { side: "SELL", asOf: "2026-09-07" });
  assert.ok(matchedCustomerPlan, "A matching accepted customer Rate Plan is selected by the domain matcher.");
  assert.equal(matchedCustomerPlan.applicability.transportMode, "TRUCKING");
  const rebuiltCustomerSnapshot = buildPricingSnapshot({
    shipment: trucking,
    pricingResult: prototypeRepository.getPricingResults()[trucking.shipmentId],
    side: "SELL",
  });
  assert.equal(rebuiltCustomerSnapshot.totalAmount, snapshotById[`${trucking.shipmentId}-SELL-SNAPSHOT`].totalAmount);
  const rebuiltOutputs = deriveOutputDocuments([trucking]);
  assert.deepEqual([rebuiltOutputs[0].documentType, rebuiltOutputs[0].pageCount], ["BOL", 2]);
  const rebuiltBilling = deriveBillingEntries({
    records: [{ ...prototypeRepository.getBillingRecords().find((record) => record.billingType === "customer_ar"), shipmentId: trucking.shipmentId, amount: 1234 }],
    shipmentsById: { [trucking.shipmentId]: trucking },
    pricingSnapshots: [],
  });
  assert.equal(rebuiltBilling.billingEntries[0].amount, 1234);
  assert.equal(rebuiltBilling.pricingSnapshots[0].totalAmount, 1234);
  const relinkedShipment = linkShipmentDerivedReferences([trucking], {
    pricingSnapshots: rebuiltBilling.pricingSnapshots,
    billingEntries: rebuiltBilling.billingEntries,
    outputDocuments: rebuiltOutputs,
  })[0];
  assert.equal(relinkedShipment.billingEntryIds.length, 1);
  assert.equal(relinkedShipment.outputDocumentIds.length, 1);

  const air = domain.shipments.find((shipment) => shipment.transportMode === "AIR");
  assert.equal(air.loadType, null);
  assert.ok(["IMPORT", "EXPORT"].includes(air.operationDirection), "Air carries an explicit canonical operation direction");
  assert.equal(
    domain.shipments.filter((shipment) => shipment.transportMode === "OCEAN" || shipment.transportMode === "AIR").every((shipment) => ["IMPORT", "EXPORT"].includes(shipment.operationDirection)),
    true,
    "Every Ocean and Air demo Shipment carries an explicit canonical direction",
  );
  assert.ok(air.cargoLines.length > 0);
  assert.equal(Object.prototype.hasOwnProperty.call(air.modeDetails.air.houseAwbs[0], "dimensions"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(air.modeDetails.air.houseAwbs[0], "commodity"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(air.modeDetails.air.houseAwbs[0], "incoterms"), false, "Incoterms belongs to the customer quotation, not the Air house shipment.");
  const oceanCustomerQuote = domain.ratePlans.find((plan) => plan.ratePlanId === "RATE-DEMO-005" && plan.side === "SELL");
  assert.equal(oceanCustomerQuote.commercialTerms.incoterms, "FOB", "Customer quotation owns Incoterms.");

  const truckingOutput = domain.outputDocuments.find((output) => output.shipmentId === "TRK-DEMO-001");
  assert.deepEqual([truckingOutput.documentType, truckingOutput.pageCount], ["BOL", 2]);
  assert.equal(truckingOutput.previewSourceRef, truckingOutput.exportSourceRef);

  domain.billingEntries.forEach((entry) => {
    const snapshot = snapshotById[entry.pricingSnapshotId];
    assert.ok(snapshot, `${entry.billingEntryId} references an existing Snapshot`);
    assert.equal(snapshot.side, entry.billingType === "CUSTOMER_AR" ? "SELL" : "BUY");
    assert.equal(entry.amount, snapshot.totalAmount);
  });
  domain.fieldEvidence.forEach((evidence) => {
    assert.equal(validateFieldEvidence(evidence, { shipmentById, sourceById }).valid, true);
  });

  const invalidAir = structuredClone(air);
  invalidAir.loadType = "FCL";
  assert.ok(validateShipment(invalidAir).errors.some((error) => error.code === "INVALID_LOAD_TYPE"));

  const invalidContact = structuredClone(trucking);
  invalidContact.modeDetails.trucking.routeStops[0].contact = "Name and phone in one string";
  assert.ok(validateShipment(invalidContact).errors.some((error) => error.code === "INVALID_CONTACT_SNAPSHOT"));

  const invalidTimeWindow = structuredClone(trucking);
  invalidTimeWindow.modeDetails.trucking.routeStops[0].timeWindow.endAt = invalidTimeWindow.modeDetails.trucking.routeStops[0].timeWindow.startAt;
  assert.ok(validateShipment(invalidTimeWindow).errors.some((error) => error.code === "INVALID_TIME_WINDOW_ORDER"));

  const invalidOutput = { ...truckingOutput, pageCount: 1 };
  assert.ok(validateOutputDocument(invalidOutput, shipmentById).errors.some((error) => error.code === "BOL_PAGE_COUNT_MISMATCH"));

  const customerAr = domain.billingEntries.find((entry) => entry.billingType === "CUSTOMER_AR");
  const buySnapshot = domain.pricingSnapshots.find((snapshot) => snapshot.shipmentId === customerAr.shipmentId && snapshot.side === "BUY");
  assert.ok(buySnapshot);
  const invalidBilling = { ...customerAr, pricingSnapshotId: buySnapshot.pricingSnapshotId, amount: buySnapshot.totalAmount };
  assert.ok(validateBillingEntry(invalidBilling, snapshotById).errors.some((error) => error.code === "BILLING_SIDE_MISMATCH"));

  const invalidEvidence = { ...domain.fieldEvidence[0], fieldPath: "unknown.demo.field" };
  assert.ok(validateFieldEvidence(invalidEvidence, { shipmentById, sourceById }).errors.some((error) => error.code === "UNKNOWN_FIELD_PATH"));

  console.log("Domain Contract v1 QA passed: adapters, schema rules, references, pricing sides, billing totals, outputs, and field evidence are consistent.");
} finally {
  await vite.close();
}
