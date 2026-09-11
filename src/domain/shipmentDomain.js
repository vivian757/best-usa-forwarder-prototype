const TRANSPORT_MODES = ["TRUCKING", "OCEAN", "AIR"];
const OPERATION_DIRECTIONS = ["DOMESTIC", "IMPORT", "EXPORT"];
const LOAD_TYPES = ["LTL", "FTL", "FCL", "LCL"];
const SHIPMENT_STATUSES = ["DRAFT", "CONFIRMED"];
const RATE_PLAN_STATUSES = ["DRAFT", "ACCEPTED", "EXPIRED"];
const PRICING_SIDES = ["SELL", "BUY"];
const PRICING_LINE_SOURCES = ["RATE_PLAN", "MANUAL_ADJUSTMENT"];
const BILLING_TYPES = ["CUSTOMER_AR", "VENDOR_AP"];
const OUTPUT_DOCUMENT_TYPES = ["BOL", "HBL", "HAWB"];

export const DOMAIN_SCHEMA_V1 = Object.freeze({
  version: "v1",
  enums: {
    transportMode: TRANSPORT_MODES,
    operationDirection: OPERATION_DIRECTIONS,
    loadType: LOAD_TYPES,
    shipmentStatus: SHIPMENT_STATUSES,
    ratePlanStatus: RATE_PLAN_STATUSES,
    pricingSide: PRICING_SIDES,
    pricingLineSource: PRICING_LINE_SOURCES,
    billingType: BILLING_TYPES,
    outputDocumentType: OUTPUT_DOCUMENT_TYPES,
  },
  modeRules: {
    TRUCKING: { operationDirections: OPERATION_DIRECTIONS, loadTypes: ["LTL", "FTL"], detailKey: "trucking", outputDocumentType: "BOL" },
    OCEAN: { operationDirections: ["IMPORT", "EXPORT"], loadTypes: ["FCL", "LCL"], detailKey: "ocean", outputDocumentType: "HBL" },
    AIR: { operationDirections: ["IMPORT", "EXPORT"], loadTypes: [null], detailKey: "air", outputDocumentType: "HAWB" },
  },
  valueObjects: {
    contactSnapshot: { fields: ["name", "phone", "email"], nullable: true },
    timeWindow: { fields: ["startAt", "endAt", "timeZone"], nullable: true },
  },
  required: {
    shipment: ["shipmentId", "customerDisplayName", "transportMode", "operationDirection", "status", "createdAt", "updatedAt", "routeSummary", "modeDetails"],
    ratePlan: ["ratePlanId", "side", "counterpartyId", "applicability", "status", "version", "currency", "pricingRules"],
    pricingSnapshot: ["pricingSnapshotId", "shipmentId", "ratePlanId", "side", "matchedApplicability", "currency", "chargeLines", "totalAmount", "calculatedAt"],
    billingEntry: ["billingEntryId", "shipmentId", "pricingSnapshotId", "billingType", "counterpartyId", "currency", "status", "missingData"],
    outputDocument: ["outputDocumentId", "shipmentId", "documentType", "status", "pageCount", "sourceEntityRefs"],
    fieldEvidence: ["fieldEvidenceId", "shipmentId", "fieldPath", "resolutionStatus"],
  },
});

export const CANONICAL_FIELD_REGISTRY_V1 = Object.freeze([
  "shipmentId",
  "customerId",
  "customerDisplayName",
  "transportMode",
  "operationDirection",
  "loadType",
  "status",
  "referenceNumbers[]",
  "operationalMetadata.fileNumber",
  "commercialTerms.freightTerms",
  "commercialTerms.serviceTerm",
  "commercialTerms.serviceLevel",
  "commercialTerms.billToPartyId",
  "parties[]",
  "equipmentRequirements[].equipmentType",
  "cargoLines[].commodityDescription",
  "cargoLines[].dimensions[]",
  "modeDetails.trucking.routeStops[].contact.name",
  "modeDetails.trucking.routeStops[].contact.phone",
  "modeDetails.trucking.routeStops[].contact.email",
  "modeDetails.trucking.routeStops[].timeWindow.startAt",
  "modeDetails.trucking.routeStops[].timeWindow.endAt",
  "modeDetails.trucking.routeStops[].timeWindow.timeZone",
  "modeDetails.trucking.instructions",
  "modeDetails.ocean.masterBill",
  "modeDetails.ocean.houseBills[]",
  "modeDetails.ocean.containers[]",
  "modeDetails.air.masterAwb",
  "modeDetails.air.houseAwbs[]",
  "modeDetails.air.flightSegments[]",
]);

const LEGACY_FIELD_PATH_MAP = Object.freeze({
  "equipmentRequirements[0].type": "equipmentRequirements[0].equipmentType",
  "shipper.timeWindow": "modeDetails.trucking.routeStops[0].timeWindow.startAt",
  instructions: "modeDetails.trucking.instructions",
});

const normalizeEnum = (value) => String(value || "").trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
const normalizeStatus = (value, confirmedValues = []) => confirmedValues.includes(String(value || "").toLowerCase()) ? "CONFIRMED" : "DRAFT";
const asArray = (value) => Array.isArray(value) ? value : [];
const sumChargeLines = (lines) => asArray(lines).reduce((sum, line) => sum + Number(line.amount ?? line.unitPrice ?? line.rate ?? 0), 0);
const displayId = (value, prefix) => `${prefix}-${String(value || "UNKNOWN").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase()}`;
const normalizeIndexedPath = (path) => String(path || "").replace(/\[\d+\]/g, "[]");
const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
const parseMeasurement = (value, fallbackUnit = null) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const parsedValue = parseNumber(value.value);
    return parsedValue === null ? null : { value: parsedValue, unit: String(value.unit || fallbackUnit || "").toUpperCase() };
  }
  const parsedValue = parseNumber(value);
  if (parsedValue === null) return null;
  const unitMatch = String(value).match(/\b(KG|LB|LBS|CBM|CFT)\b/i);
  return { value: parsedValue, unit: String(unitMatch?.[1] || fallbackUnit || "").toUpperCase().replace("LBS", "LB") };
};
const normalizeDimensionUnit = (unit) => ({ INCH: "IN", INCHES: "IN", FEET: "FT" }[normalizeEnum(unit)] || normalizeEnum(unit) || "CM");
const normalizeContactSnapshot = (contact) => {
  if (!contact) return null;
  if (typeof contact === "object") return {
    name: contact.name || null,
    phone: contact.phone || null,
    email: contact.email || null,
  };
  const [name = null, phone = null, email = null] = String(contact).split(" · ").map((value) => value.trim() || null);
  return { name, phone, email };
};
const normalizeTimeWindow = (timeWindow) => {
  if (!timeWindow || typeof timeWindow !== "object") return null;
  const startAt = timeWindow.startAt || timeWindow.start || null;
  const endAt = timeWindow.endAt || timeWindow.end || null;
  const timeZone = timeWindow.timeZone || null;
  return startAt || endAt || timeZone ? { startAt, endAt, timeZone } : null;
};
const adaptLegacyRouteStop = (stop = {}, index = 0) => ({
  routeStopId: stop.routeStopId || stop.stopId || `STOP-${index + 1}`,
  sequence: Number(stop.sequence) || index + 1,
  activity: normalizeEnum(stop.activity),
  partyId: stop.partyId || null,
  companySnapshot: stop.companySnapshot || stop.company || "",
  address: stop.address || "",
  contact: normalizeContactSnapshot(stop.contact),
  timeWindow: normalizeTimeWindow(stop.timeWindow || {
    startAt: stop.timeWindowStart,
    endAt: stop.timeWindowEnd,
    timeZone: stop.timeZone,
  }),
  appointmentRequired: stop.appointmentRequired ?? null,
  instructions: stop.instructions || null,
});
const adaptDimension = (dimension = {}) => ({
  length: parseNumber(dimension.length),
  width: parseNumber(dimension.width),
  height: parseNumber(dimension.height),
  pieces: parseNumber(dimension.pieces) ?? 1,
  unit: normalizeDimensionUnit(dimension.unit),
});

export function adaptLegacyClassification(record = {}, { operationDirection = null } = {}) {
  const legacyServiceType = normalizeEnum(record.serviceType || String(record.serviceScope || "").split("·")[0]);
  let transportMode = normalizeEnum(record.transportMode || record.mode);
  const migrationWarnings = [];
  if (transportMode === "LAND") {
    transportMode = "TRUCKING";
    migrationWarnings.push("LEGACY_LAND_MAPPED_TO_TRUCKING");
  }
  if (!TRANSPORT_MODES.includes(transportMode)) {
    if (["LTL", "FTL"].includes(legacyServiceType)) transportMode = "TRUCKING";
    else if (["FCL", "LCL"].includes(legacyServiceType)) transportMode = "OCEAN";
    else if (["AIR_FREIGHT", "AIRFREIGHT"].includes(legacyServiceType)) transportMode = "AIR";
  }

  let loadType = Object.prototype.hasOwnProperty.call(record, "loadType") ? record.loadType : legacyServiceType;
  loadType = loadType === null || loadType === "" ? null : normalizeEnum(loadType);
  if (transportMode === "AIR") {
    if (loadType && !["AIR_FREIGHT", "AIRFREIGHT"].includes(loadType)) migrationWarnings.push("AIR_LOAD_TYPE_REMOVED");
    loadType = null;
  } else if (["AIR_FREIGHT", "AIRFREIGHT"].includes(loadType)) {
    transportMode = "AIR";
    loadType = null;
    migrationWarnings.push("LEGACY_AIR_FREIGHT_MAPPED_TO_MODE");
  }

  const normalizedDirection = normalizeEnum(record.operationDirection || operationDirection) || null;
  return { transportMode, operationDirection: normalizedDirection, loadType, migrationWarnings };
}

function adaptLegacyCargoLine(line = {}, index = 0) {
  const legacyDimensions = Array.isArray(line.dimensions) ? line.dimensions : line.dimensions ? [line.dimensions] : [];
  return {
    cargoLineId: line.cargoLineId || line.lineId || `CARGO-${index + 1}`,
    cargoName: line.cargoName || line.commodity || null,
    commodityDescription: line.commodityDescription || line.commodity || "",
    shippingMarks: line.shippingMarks || line.mark || null,
    handlingUnitType: line.handlingUnitType || null,
    handlingUnitCount: parseNumber(line.handlingUnitCount),
    packageType: line.packageType || null,
    packagePieceCount: parseNumber(line.packagePieceCount || line.packages),
    grossWeight: parseMeasurement(line.grossWeight || line.weight),
    chargeableWeight: parseMeasurement(line.chargeableWeight),
    volumeWeight: parseMeasurement(line.volumeWeight),
    volumeMeasurement: parseMeasurement(line.volumeMeasurement || line.measurement, "CBM"),
    dimensions: legacyDimensions.map(adaptDimension),
    freightClass: line.freightClass || null,
    nmfc: line.nmfc || null,
    hazmat: line.hazmat ?? null,
    stackable: line.stackable ?? null,
    turnable: line.turnable ?? null,
    routeStopRefs: asArray(line.routeStopRefs).length ? [...line.routeStopRefs] : line.deliveryStopId ? [line.deliveryStopId] : [],
    containerRefs: [...asArray(line.containerRefs)],
    houseDocumentRefs: [...asArray(line.houseDocumentRefs)],
  };
}

function adaptLegacyModeDetails(record, jobDraft, cargoLines) {
  const source = record.modeDetails || {};
  if (record.transportMode === "TRUCKING") {
    const job = jobDraft || {};
    return {
      type: "TRUCKING",
      trucking: {
        routeStops: asArray(job.routeStops).map(adaptLegacyRouteStop),
        serviceRequirements: asArray(job.serviceRequirements).map((item) => ({ ...item })),
        instructions: job.instructions || null,
        carrierAssignment: job.carrierAssignment ? { ...job.carrierAssignment } : null,
      },
    };
  }
  if (record.transportMode === "OCEAN") {
    const master = source.master || {};
    const house = source.house || {};
    const houseBillId = `${record.shipmentId}-HOUSE-1`;
    const containerIds = asArray(source.containers).map((_, index) => `${record.shipmentId}-CONTAINER-${index + 1}`);
    return {
      type: "OCEAN",
      ocean: {
        masterBill: {
          masterBillId: `${record.shipmentId}-MASTER`, mblNumber: master.mblNo || null, blType: null, directMaster: false,
          overseasAgentId: master.overseasAgent || null, carrierId: master.carrier || null, blAccountCarrierId: master.blAccount || null,
          agentReference: null, shipperPartyId: null, vessel: master.vessel || null, voyage: master.voyage || null,
          portOfLoading: master.pol || null, etd: master.etd || null, portOfDischarge: master.pod || null, eta: master.eta || null,
          placeOfDelivery: house.placeOfDelivery || null, placeOfDeliveryEta: house.placeOfDeliveryEta || null,
          finalDestination: house.deliveryLocation || null, finalEta: null, cyLocation: master.cyCfsLocation || null, cfsLocation: master.cyCfsLocation || null,
          freightTermOverride: null, serviceTermOverride: house.serviceTerm || null,
        },
        houseBills: [{
          houseBillId, hblNumber: house.hblNo || null, amsNumber: house.amsNo || null, isfNumber: null,
          customerReference: source.customerReference || null, shipperPartyId: house.shipper || null, consigneePartyId: house.consignee || null,
          notifyPartyId: house.notifyParty || null, customerPartyId: record.customerId || null, billToPartyId: source.billTo || null,
          placeOfDelivery: house.placeOfDelivery || null, placeOfDeliveryEta: house.placeOfDeliveryEta || null,
          deliveryLocation: house.deliveryLocation || null, finalDestination: null, finalEta: null, cyCfsLocation: house.cyCfsLocation || null,
          freightTermOverride: null, serviceTermOverride: house.serviceTerm || null, expressBl: null,
          containerRefs: containerIds, cargoLineRefs: cargoLines.map((line) => line.cargoLineId),
        }],
        containers: asArray(source.containers).map((container, index) => ({
          containerId: containerIds[index], containerNumber: container.containerNo || "", typeSize: container.typeSize || null,
          sealNumber: container.sealNo || null, dangerousGoods: null, packages: parseMeasurement(container.packages),
          grossWeight: parseMeasurement(container.weight), volumeMeasurement: parseMeasurement(container.measurement, "CBM"), remark: null,
          cargoLineRefs: cargoLines.map((line) => line.cargoLineId), houseBillRefs: [houseBillId],
        })),
      },
    };
  }

  const master = source.master || {};
  const house = source.house || {};
  const houseAwbId = `${record.shipmentId}-HOUSE-1`;
  return {
    type: "AIR",
    air: {
      masterAwb: {
        masterAwbId: `${record.shipmentId}-MASTER`, mawbNumber: master.mawbNo || null,
        awbType: normalizeEnum(master.awbType) || null, directMaster: normalizeEnum(master.awbType) === "DIRECT_MASTER",
        overseasAgentId: master.overseasAgent || null, carrierId: master.carrier || null, coLoaderId: master.coLoader || null,
        departureAirport: master.departureAirport || null, destinationAirport: master.destinationAirport || null,
        departureAt: master.etd || null, arrivalAt: master.eta || null, serviceTermOverride: house.serviceTerm || null,
        cargoLineRefs: cargoLines.map((line) => line.cargoLineId),
      },
      houseAwbs: [{
        houseAwbId, hawbNumber: house.hawbNo || null, customerReference: source.customerReference || null,
        shipperPartyId: house.shipper || null, consigneePartyId: house.consignee || null, notifyPartyId: house.notifyParty || null,
        customerPartyId: record.customerId || null, billToPartyId: source.billTo || null,
        serviceTermOverride: house.serviceTerm || null, shipType: house.shipType || null,
        destinationHandlingLocation: house.destinationHandlingLocation || null, cargoLineRefs: cargoLines.map((line) => line.cargoLineId),
      }],
      flightSegments: [{
        flightSegmentId: `${record.shipmentId}-FLIGHT-1`, sequence: 1, carrierId: master.carrier || null,
        flightNumber: master.flightNo || master.connectingFlight || null, departureAirport: master.departureAirport || "",
        destinationAirport: master.destinationAirport || "", departureAt: master.etd || null, arrivalAt: master.eta || null,
      }],
    },
  };
}

export function adaptLegacyShipment(record = {}, context = {}) {
  const classification = adaptLegacyClassification(record, { operationDirection: context.operationDirection });
  const normalizedRecord = { ...record, ...classification };
  const jobDraft = context.jobDraft;
  const sourceCargo = jobDraft?.cargoLines || (classification.transportMode === "AIR"
    ? [{
      commodity: record.modeDetails?.house?.commodity,
      mark: record.modeDetails?.house?.mark,
      packages: record.modeDetails?.house?.packages,
      grossWeight: record.modeDetails?.house?.grossWeight,
      chargeableWeight: record.modeDetails?.house?.chargeableWeight,
      volumeWeight: record.modeDetails?.house?.volumeWeight,
      dimensions: record.modeDetails?.dimensions || [],
    }]
    : []);
  const cargoLines = asArray(sourceCargo).map(adaptLegacyCargoLine);
  const customerName = record.customerDisplayName || record.customer || "";
  return {
    shipmentId: record.shipmentId,
    referenceNumbers: [record.referenceNumber ? { type: "OTHER", value: record.referenceNumber, sourceDocumentId: null } : null].filter(Boolean),
    customerId: record.customerId || displayId(customerName, "CUSTOMER"),
    customerDisplayName: customerName,
    transportMode: classification.transportMode,
    operationDirection: classification.operationDirection,
    loadType: classification.loadType,
    status: normalizeStatus(record.status, ["confirmed", "completed"]),
    createdAt: record.createdAt || record.createdDate || record.lastUpdated || record.pickupDate || "",
    updatedAt: record.updatedAt || record.lastUpdated || record.createdDate || record.pickupDate || "",
    plannedStartAt: record.plannedStartAt || record.pickupDate || record.departureDate || null,
    routeSummary: record.routeSummary || record.route || "",
    operationalMetadata: {
      fileNumber: record.shipmentNumber || record.shipmentId,
      postDate: record.modeDetails?.postDate || null,
      officeId: null,
      operatorId: record.modeDetails?.operator || null,
      salespersonId: null,
    },
    commercialTerms: {
      freightTerms: jobDraft?.commercial?.freightTerms ? normalizeEnum(jobDraft.commercial.freightTerms) : null,
      serviceTerm: record.modeDetails?.house?.serviceTerm || null,
      serviceLevel: null,
      billToPartyId: record.modeDetails?.billTo || jobDraft?.commercial?.billTo || null,
    },
    parties: customerName ? [{ shipmentPartyId: `${record.shipmentId}-CUSTOMER`, role: "CUSTOMER", partnerId: record.customerId || null, displayName: customerName, addressSnapshot: null, contactSnapshot: null }] : [],
    equipmentRequirements: asArray(jobDraft?.equipmentRequirements || record.equipmentRequirements).map((item, index) => ({
      equipmentRequirementId: item.equipmentRequirementId || `${record.shipmentId}-EQUIPMENT-${index + 1}`,
      category: item.category || (classification.transportMode === "TRUCKING" ? "VEHICLE" : classification.transportMode === "OCEAN" ? "CONTAINER" : "ULD"),
      equipmentType: item.equipmentType || item.type || "",
      quantity: parseNumber(item.quantity),
      source: item.source || "OPS",
    })),
    cargoLines,
    modeDetails: adaptLegacyModeDetails(normalizedRecord, jobDraft, cargoLines),
    sourceDocumentIds: [...asArray(context.sourceDocumentIds)],
    fieldEvidenceIds: [...asArray(context.fieldEvidenceIds)],
    appliedPricingSnapshotIds: [...asArray(context.appliedPricingSnapshotIds)],
    billingEntryIds: [...asArray(context.billingEntryIds)],
    outputDocumentIds: [...asArray(context.outputDocumentIds)],
    migrationWarnings: classification.migrationWarnings,
  };
}

const adaptLegacyCondition = (condition = {}) => {
  if (condition.field !== "serviceType") return { ...condition };
  if (["Air Freight", "AIR_FREIGHT"].includes(condition.value)) return { ...condition, field: "transportMode", value: "AIR" };
  return { ...condition, field: "loadType" };
};

export function adaptLegacyRatePlan(record = {}, side = "SELL") {
  const classification = adaptLegacyClassification(record, { operationDirection: record.operationDirection });
  return {
    ratePlanId: record.ratePlanId || record.quoteId,
    side,
    counterpartyId: record.counterpartyId || record.counterparty || record.customer || "",
    applicability: {
      transportMode: classification.transportMode,
      operationDirection: classification.operationDirection,
      loadType: classification.loadType,
      serviceTerm: record.serviceTerm || null,
      serviceLevel: record.serviceLevel || null,
      equipmentTypes: [...new Set(asArray(record.pricingRules || record.rateMatrix || record.chargeLines).map((rule) => rule.equipmentType).filter(Boolean))],
      originZone: record.originZone || null,
      destinationZone: record.destinationZone || null,
    },
    status: normalizeEnum(record.status || "DRAFT"),
    version: Number(record.version || 1),
    effectiveFrom: record.effectiveFrom || "",
    effectiveTo: record.effectiveTo || "",
    currency: record.currency || "USD",
    commercialTerms: side === "SELL" ? { incoterms: record.incoterms || null } : null,
    pricingRules: asArray(record.pricingRules || record.rateMatrix || record.chargeLines).map((rule) => ({
      ...rule,
      conditions: asArray(rule.conditions).map(adaptLegacyCondition),
    })),
    migrationWarnings: classification.migrationWarnings,
  };
}

export function matchesRatePlanApplicability(shipment = {}, applicability = {}) {
  if (applicability.transportMode !== shipment.transportMode) return false;
  if (applicability.operationDirection !== null && applicability.operationDirection !== undefined && applicability.operationDirection !== shipment.operationDirection) return false;
  if (applicability.loadType !== null && applicability.loadType !== undefined && applicability.loadType !== shipment.loadType) return false;
  if (applicability.serviceTerm !== null && applicability.serviceTerm !== undefined && applicability.serviceTerm !== shipment.commercialTerms?.serviceTerm) return false;
  if (applicability.serviceLevel !== null && applicability.serviceLevel !== undefined && applicability.serviceLevel !== shipment.commercialTerms?.serviceLevel) return false;
  return true;
}

export function adaptLegacyPricingSnapshot({ shipment, pricingResult, side, ratePlanId = null, snapshotId = null }) {
  const source = pricingResult || {};
  const lines = asArray(source.chargeLines).map((line) => ({ ...line, sourceType: normalizeEnum(line.sourceType || "RATE_PLAN"), conditions: asArray(line.conditions).map(adaptLegacyCondition), amount: Number(line.amount ?? line.unitPrice ?? line.rate ?? 0) }));
  return {
    pricingSnapshotId: snapshotId || `${shipment.shipmentId}-${side}-SNAPSHOT`,
    shipmentId: shipment.shipmentId,
    ratePlanId: ratePlanId || source.ratePlanId || "LEGACY-UNSPECIFIED",
    ratePlanVersion: Number(source.ratePlanVersion || source.version || 1),
    side,
    matchedApplicability: {
      transportMode: shipment.transportMode,
      operationDirection: shipment.operationDirection,
      loadType: shipment.loadType,
      serviceTerm: shipment.commercialTerms?.serviceTerm || null,
      serviceLevel: shipment.commercialTerms?.serviceLevel || null,
      equipmentTypes: shipment.equipmentRequirements.map((item) => item.equipmentType).filter(Boolean),
      originZone: null,
      destinationZone: null,
    },
    currency: source.currency || "USD",
    chargeLines: lines,
    totalAmount: sumChargeLines(lines),
    calculatedAt: source.ratedAt || source.calculatedAt || shipment.updatedAt,
  };
}

export function adaptLegacyBillingEntry(record = {}, pricingSnapshot) {
  const billingType = normalizeEnum(record.billingType);
  return {
    billingEntryId: record.billingEntryId || record.billingId,
    shipmentId: record.shipmentId,
    pricingSnapshotId: pricingSnapshot.pricingSnapshotId,
    billingType,
    counterpartyId: record.counterpartyId || record.counterparty || "",
    currency: record.currency || pricingSnapshot.currency,
    status: normalizeEnum(record.status) === "READY" ? "READY" : "DRAFT",
    dueDate: record.dueDate || null,
    missingData: [...asArray(record.missingData)],
    amount: Number(record.amount ?? pricingSnapshot.totalAmount),
  };
}

export function adaptLegacySourceDocument(source = {}, shipmentId) {
  return {
    sourceDocumentId: source.sourceDocumentId || source.sourceId,
    shipmentId,
    fileName: source.fileName || "",
    documentType: source.documentType || "unknown",
    version: Number(source.version || 1),
    sourceUrl: source.sourceUrl || null,
    previewUrl: source.previewUrl || null,
    status: normalizeEnum(source.status || "PROVIDED"),
  };
}

export function adaptLegacyFieldEvidence(issue = {}, shipmentId) {
  return {
    fieldEvidenceId: issue.fieldEvidenceId || issue.issueId,
    shipmentId,
    fieldPath: LEGACY_FIELD_PATH_MAP[issue.fieldPath] || issue.fieldPath,
    sourceDocumentId: issue.sourceDocumentId || issue.sourceIds?.[0] || null,
    sourceLocation: issue.sourceLocation || issue.sourceLocations?.[0] || null,
    originalValue: issue.originalValue ?? null,
    proposedValue: issue.proposedValue ?? null,
    correctedValue: issue.correctedValue ?? null,
    confidence: issue.confidence ?? null,
    issueType: issue.issueType ? normalizeEnum(issue.issueType) : null,
    severity: ({ CANDIDATE_BLOCKER: "BLOCKER", WARNING: "WARNING", INFO: "INFO" })[normalizeEnum(issue.severity)] || null,
    resolutionStatus: ({ UNRESOLVED: "OPEN" })[normalizeEnum(issue.resolutionStatus)] || normalizeEnum(issue.resolutionStatus || "OPEN"),
    reviewAction: issue.reviewAction ? normalizeEnum(issue.reviewAction) : null,
    reviewer: issue.reviewer || null,
    reviewedAt: issue.reviewedAt || null,
  };
}

export function deriveOutputDocument(shipment) {
  const rule = DOMAIN_SCHEMA_V1.modeRules[shipment.transportMode];
  const outputDocumentId = `${shipment.shipmentId}-${rule.outputDocumentType}`;
  let documentNumber = null;
  let pageCount = 0;
  let sourceEntityRefs = [];
  if (shipment.transportMode === "TRUCKING") {
    const deliveryStops = shipment.modeDetails.trucking.routeStops.filter((stop) => normalizeEnum(stop.activity) === "DELIVERY");
    pageCount = deliveryStops.length;
    sourceEntityRefs = deliveryStops.map((stop) => stop.routeStopId);
  } else if (shipment.transportMode === "OCEAN") {
    const houseBill = shipment.modeDetails.ocean.houseBills[0];
    documentNumber = houseBill?.hblNumber || null;
    pageCount = houseBill ? 1 : 0;
    sourceEntityRefs = houseBill ? [houseBill.houseBillId] : [];
  } else {
    const houseAwb = shipment.modeDetails.air.houseAwbs[0];
    documentNumber = houseAwb?.hawbNumber || null;
    pageCount = houseAwb ? 1 : 0;
    sourceEntityRefs = houseAwb ? [houseAwb.houseAwbId] : [];
  }
  return {
    outputDocumentId,
    shipmentId: shipment.shipmentId,
    documentType: rule.outputDocumentType,
    documentNumber,
    status: documentNumber ? "GENERATED" : "DRAFT",
    pageCount,
    sourceEntityRefs,
    generatedAt: documentNumber ? shipment.updatedAt : null,
    previewSourceRef: outputDocumentId,
    exportSourceRef: outputDocumentId,
  };
}

const ratePlanSpecificity = (applicability = {}) => [
  applicability.operationDirection,
  applicability.loadType,
  applicability.serviceTerm,
  applicability.serviceLevel,
  ...(applicability.equipmentTypes || []),
  applicability.originZone,
  applicability.destinationZone,
].filter((value) => value !== null && value !== undefined && value !== "").length;

export function matchRatePlan(shipment, ratePlans = [], { side = null, asOf = null } = {}) {
  const ratedOn = asOf || shipment?.createdAt?.slice(0, 10) || null;
  return asArray(ratePlans)
    .filter((plan) => !side || plan.side === side)
    .filter((plan) => normalizeEnum(plan.status) === "ACCEPTED")
    .filter((plan) => !ratedOn || (!plan.effectiveFrom || plan.effectiveFrom <= ratedOn) && (!plan.effectiveTo || plan.effectiveTo >= ratedOn))
    .filter((plan) => matchesRatePlanApplicability(shipment, plan.applicability))
    .sort((first, second) => (
      ratePlanSpecificity(second.applicability) - ratePlanSpecificity(first.applicability)
      || Number(second.version || 0) - Number(first.version || 0)
      || String(second.effectiveFrom || "").localeCompare(String(first.effectiveFrom || ""))
    ))[0] || null;
}

export function buildPricingSnapshot({ shipment, pricingResult, side, ratePlanId = null, snapshotId = null }) {
  if (!shipment) throw new Error("A Shipment is required to build a Pricing Snapshot.");
  if (!side) throw new Error("Pricing Snapshot side is required.");
  return adaptLegacyPricingSnapshot({ shipment, pricingResult, side, ratePlanId, snapshotId });
}

export function deriveBillingEntries({ records = [], shipmentsById = {}, pricingSnapshots = [] } = {}) {
  const nextPricingSnapshots = [...pricingSnapshots];
  const snapshotByKey = new Map(nextPricingSnapshots.map((snapshot) => [`${snapshot.shipmentId}:${snapshot.side}`, snapshot]));
  const billingEntries = asArray(records).map((record) => {
    const side = normalizeEnum(record.billingType) === "CUSTOMER_AR" ? "SELL" : "BUY";
    const key = `${record.shipmentId}:${side}`;
    const shipment = shipmentsById[record.shipmentId];
    if (!shipment) throw new Error(`Billing record ${record.billingId || record.billingEntryId || "unknown"} references an unknown Shipment.`);
    let snapshot = snapshotByKey.get(key);
    if (!snapshot || Math.abs(Number(snapshot.totalAmount) - Number(record.amount)) > 0.001) {
      snapshot = buildPricingSnapshot({
        shipment,
        pricingResult: {
          ratePlanId: record.sourceRatePlanId || record.acceptedQuoteId || "LEGACY-UNSPECIFIED",
          currency: record.currency,
          ratedAt: record.billingDate || shipment.updatedAt,
          chargeLines: [{ code: "LEGACY_BILLING_TOTAL", description: "Legacy billing total", amount: Number(record.amount || 0) }],
        },
        side,
        snapshotId: `${record.billingId || record.billingEntryId}-${side}-SNAPSHOT`,
      });
      nextPricingSnapshots.push(snapshot);
      snapshotByKey.set(key, snapshot);
    }
    return adaptLegacyBillingEntry(record, snapshot);
  });
  return { billingEntries, pricingSnapshots: nextPricingSnapshots };
}

export function deriveOutputDocuments(shipments = []) {
  return asArray(shipments).map(deriveOutputDocument);
}

export function linkShipmentDerivedReferences(shipments = [], { pricingSnapshots = [], billingEntries = [], outputDocuments = [] } = {}) {
  return asArray(shipments).map((shipment) => ({
    ...shipment,
    appliedPricingSnapshotIds: pricingSnapshots.filter((snapshot) => snapshot.shipmentId === shipment.shipmentId).map((snapshot) => snapshot.pricingSnapshotId),
    billingEntryIds: billingEntries.filter((entry) => entry.shipmentId === shipment.shipmentId).map((entry) => entry.billingEntryId),
    outputDocumentIds: outputDocuments.filter((output) => output.shipmentId === shipment.shipmentId).map((output) => output.outputDocumentId),
  }));
}

const createResult = () => ({ valid: true, errors: [], warnings: [] });
const pushIssue = (result, severity, code, path, message) => {
  result[severity].push({ code, path, message });
  if (severity === "errors") result.valid = false;
};
const requireFields = (record, fields, result, root) => fields.forEach((field) => {
  const value = record?.[field];
  if (value === undefined || value === null || value === "") pushIssue(result, "errors", "REQUIRED_FIELD", `${root}.${field}`, `${field} is required.`);
});
const isRegisteredFieldPath = (path) => {
  const normalized = normalizeIndexedPath(path);
  return CANONICAL_FIELD_REGISTRY_V1.includes(normalized)
    || CANONICAL_FIELD_REGISTRY_V1.some((registered) => normalized.startsWith(`${registered}.`));
};
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const isIsoDateTime = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/.test(String(value || ""));

export function validateShipment(shipment) {
  const result = createResult();
  requireFields(shipment, DOMAIN_SCHEMA_V1.required.shipment, result, `shipments.${shipment?.shipmentId || "unknown"}`);
  const rule = DOMAIN_SCHEMA_V1.modeRules[shipment?.transportMode];
  if (!rule) {
    pushIssue(result, "errors", "INVALID_TRANSPORT_MODE", "shipment.transportMode", "Transport mode must be TRUCKING, OCEAN, or AIR.");
    return result;
  }
  if (!rule.operationDirections.includes(shipment.operationDirection)) pushIssue(result, "errors", "INVALID_OPERATION_DIRECTION", "shipment.operationDirection", `${shipment.operationDirection || "null"} is invalid for ${shipment.transportMode}.`);
  if (!rule.loadTypes.includes(shipment.loadType)) pushIssue(result, "errors", "INVALID_LOAD_TYPE", "shipment.loadType", `${shipment.loadType || "null"} is invalid for ${shipment.transportMode}.`);
  const detailKeys = Object.keys(shipment.modeDetails || {}).filter((key) => key !== "type");
  if (shipment.modeDetails?.type !== shipment.transportMode || detailKeys.length !== 1 || detailKeys[0] !== rule.detailKey) {
    pushIssue(result, "errors", "MODE_DISCRIMINATOR_MISMATCH", "shipment.modeDetails", `Mode details must contain only ${rule.detailKey} for ${shipment.transportMode}.`);
  }
  const cargoIds = new Set(asArray(shipment.cargoLines).map((line) => line.cargoLineId));
  if (shipment.transportMode === "TRUCKING") {
    const routeStops = asArray(shipment.modeDetails?.trucking?.routeStops);
    const stopIds = new Set(routeStops.map((stop) => stop.routeStopId));
    routeStops.forEach((stop, index) => {
      if (stop.contact !== null && (typeof stop.contact !== "object" || Array.isArray(stop.contact))) {
        pushIssue(result, "errors", "INVALID_CONTACT_SNAPSHOT", `shipment.modeDetails.trucking.routeStops[${index}].contact`, "Contact must use separate name, phone, and email fields.");
      }
      const timeWindow = stop.timeWindow;
      if (timeWindow) {
        if (!isIsoDateTime(timeWindow.startAt) || !isIsoDateTime(timeWindow.endAt)) pushIssue(result, "errors", "INVALID_TIME_WINDOW", `shipment.modeDetails.trucking.routeStops[${index}].timeWindow`, "Time window startAt and endAt must be ISO date-time values.");
        else if (new Date(timeWindow.startAt) >= new Date(timeWindow.endAt)) pushIssue(result, "errors", "INVALID_TIME_WINDOW_ORDER", `shipment.modeDetails.trucking.routeStops[${index}].timeWindow`, "Time window endAt must be later than startAt.");
      }
    });
    asArray(shipment.cargoLines).forEach((line, index) => line.routeStopRefs.forEach((ref) => {
      if (!stopIds.has(ref)) pushIssue(result, "errors", "INVALID_ROUTE_STOP_REF", `shipment.cargoLines[${index}].routeStopRefs`, `${ref} does not exist.`);
    }));
  }
  if (shipment.transportMode === "OCEAN") {
    const ocean = shipment.modeDetails?.ocean;
    [["etd", ocean?.masterBill?.etd], ["eta", ocean?.masterBill?.eta], ["placeOfDeliveryEta", ocean?.masterBill?.placeOfDeliveryEta]].forEach(([field, value]) => {
      if (value && !isIsoDate(value)) pushIssue(result, "errors", "INVALID_DATE", `shipment.modeDetails.ocean.masterBill.${field}`, `${field} must be an ISO date.`);
    });
    const houseIds = new Set(asArray(ocean?.houseBills).map((item) => item.houseBillId));
    const containerIds = new Set(asArray(ocean?.containers).map((item) => item.containerId));
    asArray(ocean?.houseBills).forEach((house, index) => {
      house.containerRefs.forEach((ref) => { if (!containerIds.has(ref)) pushIssue(result, "errors", "INVALID_CONTAINER_REF", `shipment.modeDetails.ocean.houseBills[${index}].containerRefs`, `${ref} does not exist.`); });
      house.cargoLineRefs.forEach((ref) => { if (!cargoIds.has(ref)) pushIssue(result, "errors", "INVALID_CARGO_REF", `shipment.modeDetails.ocean.houseBills[${index}].cargoLineRefs`, `${ref} does not exist.`); });
    });
    asArray(ocean?.containers).forEach((container, index) => container.houseBillRefs.forEach((ref) => {
      if (!houseIds.has(ref)) pushIssue(result, "errors", "INVALID_HOUSE_BILL_REF", `shipment.modeDetails.ocean.containers[${index}].houseBillRefs`, `${ref} does not exist.`);
    }));
  }
  if (shipment.transportMode === "AIR") {
    const air = shipment.modeDetails?.air;
    [["departureAt", air?.masterAwb?.departureAt], ["arrivalAt", air?.masterAwb?.arrivalAt]].forEach(([field, value]) => {
      if (value && !isIsoDateTime(value)) pushIssue(result, "errors", "INVALID_DATE_TIME", `shipment.modeDetails.air.masterAwb.${field}`, `${field} must be an ISO date-time.`);
    });
    const forbiddenCargoFields = ["commodity", "packages", "grossWeight", "chargeableWeight", "volumeWeight", "dimensions"];
    asArray(air?.houseAwbs).forEach((house, index) => {
      forbiddenCargoFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(house, field)) pushIssue(result, "errors", "AIR_CARGO_DUPLICATED_IN_HOUSE", `shipment.modeDetails.air.houseAwbs[${index}].${field}`, `${field} belongs in cargoLines.`);
      });
      house.cargoLineRefs.forEach((ref) => { if (!cargoIds.has(ref)) pushIssue(result, "errors", "INVALID_CARGO_REF", `shipment.modeDetails.air.houseAwbs[${index}].cargoLineRefs`, `${ref} does not exist.`); });
    });
    asArray(air?.masterAwb?.cargoLineRefs).forEach((ref) => { if (!cargoIds.has(ref)) pushIssue(result, "errors", "INVALID_CARGO_REF", "shipment.modeDetails.air.masterAwb.cargoLineRefs", `${ref} does not exist.`); });
  }
  return result;
}

export function validateRatePlan(ratePlan) {
  const result = createResult();
  requireFields(ratePlan, DOMAIN_SCHEMA_V1.required.ratePlan, result, `ratePlans.${ratePlan?.ratePlanId || "unknown"}`);
  if (!PRICING_SIDES.includes(ratePlan?.side)) pushIssue(result, "errors", "INVALID_PRICING_SIDE", "ratePlan.side", "Rate Plan side must be SELL or BUY.");
  if (!RATE_PLAN_STATUSES.includes(ratePlan?.status)) pushIssue(result, "errors", "INVALID_RATE_PLAN_STATUS", "ratePlan.status", "Rate Plan status is invalid.");
  const applicability = ratePlan?.applicability || {};
  const rule = DOMAIN_SCHEMA_V1.modeRules[applicability.transportMode];
  if (!rule) pushIssue(result, "errors", "INVALID_TRANSPORT_MODE", "ratePlan.applicability.transportMode", "Rate Plan transport mode is invalid.");
  else {
    if (applicability.operationDirection !== null && !rule.operationDirections.includes(applicability.operationDirection)) pushIssue(result, "errors", "INVALID_OPERATION_DIRECTION", "ratePlan.applicability.operationDirection", "Rate Plan operation direction is invalid for its mode.");
    if (applicability.loadType !== null && !rule.loadTypes.includes(applicability.loadType)) pushIssue(result, "errors", "INVALID_LOAD_TYPE", "ratePlan.applicability.loadType", "Rate Plan load type is invalid for its mode.");
  }
  return result;
}

export function validatePricingSnapshot(snapshot, shipmentById = {}) {
  const result = createResult();
  requireFields(snapshot, DOMAIN_SCHEMA_V1.required.pricingSnapshot, result, `pricingSnapshots.${snapshot?.pricingSnapshotId || "unknown"}`);
  if (!PRICING_SIDES.includes(snapshot?.side)) pushIssue(result, "errors", "INVALID_PRICING_SIDE", "pricingSnapshot.side", "Snapshot side must be SELL or BUY.");
  asArray(snapshot?.chargeLines).forEach((line, index) => {
    if (!PRICING_LINE_SOURCES.includes(line.sourceType)) pushIssue(result, "errors", "INVALID_PRICING_LINE_SOURCE", `pricingSnapshots.${snapshot?.pricingSnapshotId || "unknown"}.chargeLines.${index}.sourceType`, "Charge line source must be RATE_PLAN or MANUAL_ADJUSTMENT.");
  });
  const calculatedTotal = sumChargeLines(snapshot?.chargeLines);
  if (Math.abs(calculatedTotal - Number(snapshot?.totalAmount || 0)) > 0.001) pushIssue(result, "errors", "PRICING_TOTAL_MISMATCH", "pricingSnapshot.totalAmount", `Expected ${calculatedTotal}, received ${snapshot.totalAmount}.`);
  const shipment = shipmentById[snapshot?.shipmentId];
  if (!shipment) pushIssue(result, "errors", "MISSING_SHIPMENT_REF", "pricingSnapshot.shipmentId", `${snapshot?.shipmentId} does not exist.`);
  else {
    const applicability = snapshot.matchedApplicability || {};
    ["transportMode", "operationDirection", "loadType"].forEach((field) => {
      if (applicability[field] !== null && applicability[field] !== shipment[field]) pushIssue(result, "errors", "PRICING_APPLICABILITY_MISMATCH", `pricingSnapshot.matchedApplicability.${field}`, `${field} does not match the Shipment.`);
    });
  }
  return result;
}

export function validateBillingEntry(entry, snapshotById = {}) {
  const result = createResult();
  requireFields(entry, DOMAIN_SCHEMA_V1.required.billingEntry, result, `billingEntries.${entry?.billingEntryId || "unknown"}`);
  if (!BILLING_TYPES.includes(entry?.billingType)) pushIssue(result, "errors", "INVALID_BILLING_TYPE", "billingEntry.billingType", "Billing type must be CUSTOMER_AR or VENDOR_AP.");
  const snapshot = snapshotById[entry?.pricingSnapshotId];
  if (!snapshot) pushIssue(result, "errors", "MISSING_PRICING_SNAPSHOT_REF", "billingEntry.pricingSnapshotId", `${entry?.pricingSnapshotId} does not exist.`);
  else {
    const expectedSide = entry.billingType === "CUSTOMER_AR" ? "SELL" : "BUY";
    if (snapshot.side !== expectedSide) pushIssue(result, "errors", "BILLING_SIDE_MISMATCH", "billingEntry.pricingSnapshotId", `${entry.billingType} must reference a ${expectedSide} snapshot.`);
    if (entry.currency !== snapshot.currency) pushIssue(result, "errors", "BILLING_CURRENCY_MISMATCH", "billingEntry.currency", "Billing and Snapshot currencies differ.");
    if (Math.abs(Number(entry.amount) - Number(snapshot.totalAmount)) > 0.001) pushIssue(result, "errors", "BILLING_TOTAL_MISMATCH", "billingEntry.amount", `Expected ${snapshot.totalAmount}, received ${entry.amount}.`);
  }
  return result;
}

export function validateOutputDocument(output, shipmentById = {}) {
  const result = createResult();
  requireFields(output, DOMAIN_SCHEMA_V1.required.outputDocument, result, `outputDocuments.${output?.outputDocumentId || "unknown"}`);
  const shipment = shipmentById[output?.shipmentId];
  if (!shipment) {
    pushIssue(result, "errors", "MISSING_SHIPMENT_REF", "outputDocument.shipmentId", `${output?.shipmentId} does not exist.`);
    return result;
  }
  const expectedType = DOMAIN_SCHEMA_V1.modeRules[shipment.transportMode].outputDocumentType;
  if (output.documentType !== expectedType) pushIssue(result, "errors", "OUTPUT_TYPE_MISMATCH", "outputDocument.documentType", `${shipment.transportMode} must use ${expectedType}.`);
  if (shipment.transportMode === "TRUCKING") {
    const expectedPages = shipment.modeDetails.trucking.routeStops.filter((stop) => normalizeEnum(stop.activity) === "DELIVERY").length;
    if (output.pageCount !== expectedPages) pushIssue(result, "errors", "BOL_PAGE_COUNT_MISMATCH", "outputDocument.pageCount", `Expected ${expectedPages} pages, received ${output.pageCount}.`);
  }
  if (output.previewSourceRef !== output.exportSourceRef || output.previewSourceRef !== output.outputDocumentId) pushIssue(result, "errors", "OUTPUT_SOURCE_MISMATCH", "outputDocument.previewSourceRef", "Preview and Export must use the same Output Document view model.");
  return result;
}

export function validateFieldEvidence(evidence, { shipmentById = {}, sourceById = {} } = {}) {
  const result = createResult();
  requireFields(evidence, DOMAIN_SCHEMA_V1.required.fieldEvidence, result, `fieldEvidence.${evidence?.fieldEvidenceId || "unknown"}`);
  if (!shipmentById[evidence?.shipmentId]) pushIssue(result, "errors", "MISSING_SHIPMENT_REF", "fieldEvidence.shipmentId", `${evidence?.shipmentId} does not exist.`);
  if (!isRegisteredFieldPath(evidence?.fieldPath)) pushIssue(result, "errors", "UNKNOWN_FIELD_PATH", "fieldEvidence.fieldPath", `${evidence?.fieldPath} is not in Field Registry v1.`);
  if (evidence?.sourceDocumentId && !sourceById[evidence.sourceDocumentId]) pushIssue(result, "errors", "MISSING_SOURCE_DOCUMENT_REF", "fieldEvidence.sourceDocumentId", `${evidence.sourceDocumentId} does not exist.`);
  return result;
}

const mergeResult = (target, source) => {
  target.errors.push(...source.errors);
  target.warnings.push(...source.warnings);
  target.valid = target.errors.length === 0;
};
const validateUniqueIds = (records, key, collection, result) => {
  const seen = new Set();
  records.forEach((record) => {
    const id = record[key];
    if (seen.has(id)) pushIssue(result, "errors", "DUPLICATE_ID", `${collection}.${id}`, `${id} is duplicated.`);
    seen.add(id);
  });
};

export function validateDomainConsistency(domain = {}) {
  const result = createResult();
  const shipments = asArray(domain.shipments);
  const ratePlans = asArray(domain.ratePlans);
  const pricingSnapshots = asArray(domain.pricingSnapshots);
  const billingEntries = asArray(domain.billingEntries);
  const outputDocuments = asArray(domain.outputDocuments);
  const sourceDocuments = asArray(domain.sourceDocuments);
  const fieldEvidence = asArray(domain.fieldEvidence);
  const shipmentById = Object.fromEntries(shipments.map((item) => [item.shipmentId, item]));
  const snapshotById = Object.fromEntries(pricingSnapshots.map((item) => [item.pricingSnapshotId, item]));
  const sourceById = Object.fromEntries(sourceDocuments.map((item) => [item.sourceDocumentId, item]));

  validateUniqueIds(shipments, "shipmentId", "shipments", result);
  validateUniqueIds(ratePlans, "ratePlanId", "ratePlans", result);
  validateUniqueIds(pricingSnapshots, "pricingSnapshotId", "pricingSnapshots", result);
  validateUniqueIds(billingEntries, "billingEntryId", "billingEntries", result);
  validateUniqueIds(outputDocuments, "outputDocumentId", "outputDocuments", result);
  validateUniqueIds(fieldEvidence, "fieldEvidenceId", "fieldEvidence", result);
  shipments.forEach((record) => mergeResult(result, validateShipment(record)));
  ratePlans.forEach((record) => mergeResult(result, validateRatePlan(record)));
  pricingSnapshots.forEach((record) => mergeResult(result, validatePricingSnapshot(record, shipmentById)));
  billingEntries.forEach((record) => mergeResult(result, validateBillingEntry(record, snapshotById)));
  outputDocuments.forEach((record) => mergeResult(result, validateOutputDocument(record, shipmentById)));
  fieldEvidence.forEach((record) => mergeResult(result, validateFieldEvidence(record, { shipmentById, sourceById })));
  result.valid = result.errors.length === 0;
  return result;
}

export function assertDomainConsistency(domain) {
  const result = validateDomainConsistency(domain);
  if (!result.valid) {
    const details = result.errors.map((error) => `${error.code} at ${error.path}: ${error.message}`).join("\n");
    throw new Error(`Domain Contract v1 validation failed:\n${details}`);
  }
  return result;
}
