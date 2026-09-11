import fixture from "../fixture.json";
import {
  adaptLegacyFieldEvidence,
  adaptLegacyRatePlan,
  adaptLegacyShipment,
  adaptLegacySourceDocument,
  assertDomainConsistency,
  buildPricingSnapshot,
  deriveBillingEntries,
  deriveOutputDocuments,
  linkShipmentDerivedReferences,
  validateDomainConsistency,
} from "../domain/shipmentDomain";
import { getBasePricingFeeItemName, normalizePricingRule } from "../domain/pricingLogic";
import { formatPricingConditions, getDefaultServiceConditions } from "./pricingModel";

const clone = (value) => JSON.parse(JSON.stringify(value));
const getCanonicalLoadType = (record = {}) => record.transportMode === "AIR"
  ? null
  : record.loadType || record.serviceType || String(record.serviceScope || "").split("·")[0].trim() || record.mode || null;
const getCanonicalOperationDirection = (record = {}) => record.operationDirection || (record.transportMode === "TRUCKING" ? "DOMESTIC" : "IMPORT");
const withCanonicalShipmentScope = (record = {}) => ({
  ...record,
  operationDirection: getCanonicalOperationDirection(record),
  loadType: getCanonicalLoadType(record),
});

const {
  extensionData,
  ruleTypes: ruleTypeCatalog,
  carrierRatePlans: costRatePlans,
  vendorPricingResults: vendorCostResults,
  quoteVersionHistory,
  interactiveQuotationVariants,
} = fixture.managementDemo;
const {
  shipmentTargetCount,
  billingTargetCount,
  sampleCustomers,
  sampleRoutes,
  transportStagePreviewRows,
  sampleCarriers,
  billingCustomerPool,
  billingCarrierPool,
  partnerContactNames,
  carrierContactNames,
  generatedQuoteDefaults,
  generatedBillingDefaults,
} = extensionData;
const partnerEmail = (name) => name.toLowerCase().replaceAll(" ", ".").replace(/[^a-z0-9.]+/g, "") + "@demo.example";

function buildPartnerSamples(shipments) {
  const customers = [...new Set(shipments.map((shipment) => shipment.customer))];
  return [
    ...customers.map((name, index) => ({
      partnerId: "CUS-DEMO-" + String(index + 1).padStart(3, "0"),
      name,
      type: "customer",
      contactName: partnerContactNames[index % partnerContactNames.length],
      email: partnerEmail(name),
      mobile: "(510) 555-" + String(3100 + index).padStart(4, "0"),
      phone: "(510) 555-" + String(1100 + index).padStart(4, "0"),
    })),
    ...sampleCarriers.map((name, index) => ({
      partnerId: "CAR-DEMO-" + String(index + 1).padStart(3, "0"),
      name,
      type: "carrier",
      contactName: carrierContactNames[index % carrierContactNames.length],
      email: partnerEmail(name),
      mobile: "(310) 555-" + String(4100 + index).padStart(4, "0"),
      phone: "(310) 555-" + String(2100 + index).padStart(4, "0"),
    })),
  ];
}

function buildShipmentSamples(source, target = shipmentTargetCount) {
  const rows = clone(source).map((shipment) => withCanonicalShipmentScope({
    ...shipment,
    transportMode: shipment.transportMode || "TRUCKING",
    serviceType: shipment.serviceType || shipment.mode || "LTL",
  }));
  while (rows.length < target) {
    const index = rows.length;
    const number = index + 1;
    const day = String((index % 28) + 1).padStart(2, "0");
    const confirmed = index % 3 === 0;
    const billingStarted = number === 7 || number === 10;
    rows.push(withCanonicalShipmentScope({
      shipmentId: "TRK-DEMO-" + String(number).padStart(3, "0"),
      transportMode: "TRUCKING",
      customer: sampleCustomers[index % sampleCustomers.length],
      referenceNumber: "REF-DEMO-09" + day,
      serviceType: index % 4 === 0 ? "FTL" : "LTL",
      route: sampleRoutes[index % sampleRoutes.length],
      createdDate: "2026-09-" + day,
      pickupDate: "2026-09-" + day,
      status: confirmed ? "confirmed" : "in_review",
      reviewIssueCount: confirmed || index % 4 === 0 ? 0 : (index % 3) + 1,
      quotationStatus: null,
      billingStatus: billingStarted ? "draft" : "not_ready",
      bolNumber: billingStarted ? "BOL-DEMO-" + String(number).padStart(3, "0") : null,
      lastUpdated: "2026-09-07T12:00:00+08:00",
    }));
  }
  const normalizedRows = rows.map((shipment) => ({
    ...shipment,
    createdDate: shipment.createdDate || shipment.lastUpdated?.slice(0, 10) || shipment.pickupDate,
    detailAvailable: shipment.detailAvailable !== false,
  }));
  const previewRows = transportStagePreviewRows.map((shipment) => withCanonicalShipmentScope({
    ...shipment,
    createdDate: shipment.createdDate || shipment.lastUpdated?.slice(0, 10) || shipment.pickupDate,
  }));
  return [...normalizedRows, ...previewRows];
}

function buildQuotationSamples(source, shipments) {
  const quotes = clone(source);
  const getQuoteContextKey = ({ customer, transportMode = "TRUCKING", serviceType, serviceScope = "" }) => {
    const scopedServiceType = serviceType || serviceScope.split(" · ")[0] || "LTL";
    return `${customer}|${transportMode}|${scopedServiceType}`;
  };
  const quotedContexts = new Set(quotes.map((quote) => getQuoteContextKey(quote)));
  const shipmentContexts = [...new Map(shipments.map((shipment) => [getQuoteContextKey(shipment), {
    customer: shipment.customer,
    transportMode: shipment.transportMode || "TRUCKING",
    operationDirection: shipment.operationDirection || null,
    serviceType: shipment.serviceType || "LTL",
    route: shipment.route,
  }])).values()];
  const missingContexts = shipmentContexts.filter((context) => !quotedContexts.has(getQuoteContextKey(context)));
  const interactiveQuoteVariants = clone(interactiveQuotationVariants);

  return [
    ...quotes,
    ...interactiveQuoteVariants,
    ...missingContexts.map((context, index) => {
      const { customer, transportMode, operationDirection, serviceType, route } = context;
      const quoteNumber = quotes.length + index + 1;
      const isOcean = transportMode === "OCEAN";
      const isAir = transportMode === "AIR";
      const basis = isOcean && serviceType === "FCL" ? "Per container"
        : isOcean || isAir || serviceType === "FTL" ? (serviceType === "FTL" ? "Per truck" : "Per shipment")
          : "Billable weight";
      const tier = basis === "Billable weight" ? "0–2,500 lb" : basis;
      const rate = isOcean ? (serviceType === "FCL" ? generatedQuoteDefaults.oceanFclRate : generatedQuoteDefaults.oceanLclRate)
        : isAir ? generatedQuoteDefaults.airRate
          : serviceType === "FTL" ? generatedQuoteDefaults.truckingFtlRate : generatedQuoteDefaults.truckingLtlRate;
      return {
        quoteId: `RATE-DEMO-${String(quoteNumber).padStart(3, "0")}`,
        name: `${customer} ${serviceType} 2026`,
        customer,
        transportMode,
        operationDirection,
        loadType: isAir ? null : serviceType,
        serviceType,
        status: "accepted",
        serviceScope: `${serviceType} · ${isOcean || isAir ? generatedQuoteDefaults.internationalScope : generatedQuoteDefaults.truckingScope}`,
        serviceScopes: [`${serviceType} · ${isOcean || isAir ? generatedQuoteDefaults.internationalScope : generatedQuoteDefaults.truckingScope}`],
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        createdAt: "2026-01-01",
        lastUpdated: "2026-09-07",
        version: 1,
        currency: "USD",
        rateMatrix: [{
          name: getBasePricingFeeItemName({ serviceType, transportMode }),
          rateCategory: "base",
          lane: route || "Standard West Coast",
          equipmentType: isOcean ? "40' High Cube" : isAir ? "Pallet" : "Van / Dry Van (V)",
          tier,
          basis,
          conditions: getDefaultServiceConditions(serviceType),
          rate,
        }],
        surchargeRules: [],
        serviceItems: [],
      };
    }),
  ];
}

function buildBillingSamples(source, shipments, target = billingTargetCount) {
  const rows = clone(source).map((record, index) => ({
    ...record,
    transportMode: shipments.find((shipment) => shipment.shipmentId === record.shipmentId)?.transportMode || "TRUCKING",
    billingDate: record.billingDate
      || shipments.find((shipment) => shipment.shipmentId === record.shipmentId)?.lastUpdated?.slice(0, 10)
      || shipments.find((shipment) => shipment.shipmentId === record.shipmentId)?.pickupDate,
    status: record.status === "missing_cost" ? "draft" : record.status,
    accountId: record.billingType === "customer_ar" ? `BILL-ACCT-${String(index + 1).padStart(3, "0")}` : `PAY-ACCT-${String(index + 1).padStart(3, "0")}`,
    sourceRatePlanId: record.billingType === "customer_ar"
      ? record.acceptedQuoteId
      : costRatePlans[record.shipmentId]?.ratePlanId,
  }));
  while (rows.length < target) {
    const index = rows.length;
    const number = index + 1;
    const generatedIndex = index - source.length;
    const customerAr = index % 2 === 0;
    const preferredCustomer = billingCustomerPool[Math.floor(generatedIndex / 2) % billingCustomerPool.length];
    const matchingCustomerShipments = shipments.filter((shipment) => shipment.customer === preferredCustomer);
    const customerShipmentCycle = Math.floor(generatedIndex / (billingCustomerPool.length * 2)) + 1;
    const shipment = customerAr && matchingCustomerShipments.length
      ? matchingCustomerShipments[customerShipmentCycle % matchingCustomerShipments.length]
      : shipments[(index + 2) % shipments.length];
    rows.push({
      billingId: "BILL-DEMO-" + String(number).padStart(3, "0"),
      shipmentId: shipment.shipmentId,
      transportMode: shipment.transportMode || "TRUCKING",
      acceptedQuoteId: "Q-DEMO-" + shipment.shipmentId.slice(-3),
      accountId: (customerAr ? "BILL-ACCT-" : "PAY-ACCT-") + String(number).padStart(3, "0"),
      sourceRatePlanId: customerAr ? null : costRatePlans[shipment.shipmentId]?.ratePlanId || null,
      counterparty: customerAr ? shipment.customer : billingCarrierPool[Math.floor(generatedIndex / 2) % billingCarrierPool.length],
      billingType: customerAr ? "customer_ar" : "vendor_ap",
      amount: customerAr
        ? generatedBillingDefaults.customerBaseAmount + index * generatedBillingDefaults.customerIncrement
        : generatedBillingDefaults.vendorBaseAmount + index * generatedBillingDefaults.vendorIncrement,
      currency: "USD",
      status: index % 3 === 0 ? "ready" : "draft",
      billingDate: "2026-09-" + String((index % 28) + 1).padStart(2, "0"),
      dueDate: "2026-10-" + String((index % 20) + 5).padStart(2, "0"),
      missingData: [],
    });
  }
  return rows;
}

export const prototypeRepository = {
  getFixture() {
    return clone(fixture);
  },
  getShipments() {
    return buildShipmentSamples(fixture.managementDemo.shipments);
  },
  getQuotations() {
    const shipments = buildShipmentSamples(fixture.managementDemo.shipments);
    return buildQuotationSamples(fixture.managementDemo.quotations, shipments).map((quote, index) => {
      const rateMatrix = (quote.rateMatrix || []).map((rule) => ({
        ...normalizePricingRule(rule, {
          ruleType: rule.basis?.startsWith("Per ") ? "flat_rate" : "tiered_rate",
          billingUnit: quote.transportMode === "OCEAN" && quote.serviceType === "FCL" ? "CONTAINER" : quote.serviceType === "FTL" ? "TRUCK" : "SHIPMENT",
          conditionLabel: rule.tier && rule.tier !== "Base charge" ? `${rule.tier} ${String(rule.basis || "").toLowerCase()}`.trim() : quote.serviceType ? `${quote.serviceType} shipments` : "All shipments",
          rateCategory: "base",
        }),
        name: rule.name || getBasePricingFeeItemName(quote),
        equipmentType: rule.equipmentType || (quote.transportMode === "OCEAN" ? "40' High Cube" : quote.transportMode === "AIR" ? "Pallet" : "Van / Dry Van (V)"),
      }));
      const surchargeRules = (quote.surchargeRules || []).map((rule) => normalizePricingRule(rule, { ruleType: "per_unit", billingUnit: "SHIPMENT", conditionLabel: "All shipments", rateCategory: "additional", equipmentType: null }));
      return {
        ...quote,
        transportMode: quote.transportMode || "TRUCKING",
        operationDirection: getCanonicalOperationDirection(quote),
        loadType: getCanonicalLoadType(quote),
        contractId: `CTR-DEMO-${String(index + 1).padStart(3, "0")}`,
        billingAccountId: `BILL-ACCT-${String(index + 1).padStart(3, "0")}`,
        pricingSide: "sell",
        versionHistory: clone(quoteVersionHistory[quote.quoteId] || []),
        pricingRules: [...rateMatrix, ...surchargeRules],
        rateMatrix,
        surchargeRules,
        serviceItems: clone(quote.serviceItems || []),
      };
    });
  },
  getPricingResults() {
    return Object.fromEntries(Object.entries(clone(fixture.managementDemo.pricingResults)).map(([shipmentId, result]) => {
      const appliedQuote = fixture.managementDemo.quotations.find((quote) => quote.quoteId === result.ratePlanId);
      const transportServiceGroup = appliedQuote?.transportMode === "OCEAN" ? "Ocean"
        : appliedQuote?.transportMode === "AIR" ? "Air"
          : "Trucking";
      const warehouseChargeLines = (appliedQuote?.serviceItems || []).map((item) => ({
        sourceType: "RATE_PLAN",
        code: item.lineId,
        description: item.name,
        source: `${Number(item.quantity).toLocaleString("en-US")} ${item.unit} × ${item.rate}`,
        ruleType: "per_unit",
        rateCategory: "additional",
        equipmentType: null,
        conditions: [],
        serviceGroup: "Warehouse",
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.quantity) * Number(item.rate),
      }));
      return [shipmentId, {
        ...result,
        chargeLines: [
          ...result.chargeLines.map((line) => {
            const sourceRule = line.code?.startsWith("BASE_")
              ? appliedQuote?.rateMatrix?.find((rule) => Number(rule.rate) === Number(line.amount)) || appliedQuote?.rateMatrix?.[0]
              : appliedQuote?.surchargeRules?.find((rule) => rule.code === line.code);
            const normalizedRule = normalizePricingRule(sourceRule || line, {
              ruleType: line.code === "BASE_LTL" ? "tiered_rate" : line.code === "COLD_CHAIN" ? "percentage_surcharge" : "flat_rate",
              billingUnit: line.unit || "SHIPMENT",
              conditionLabel: "All shipments",
            });
            return {
              ...line,
              sourceType: line.sourceType || "RATE_PLAN",
              description: sourceRule?.name || line.description,
              serviceGroup: line.serviceGroup || transportServiceGroup,
              ruleType: normalizedRule.ruleType,
              ruleTypeLabel: normalizedRule.ruleTypeLabel,
              billingUnit: normalizedRule.billingUnit,
              equipmentType: normalizedRule.equipmentType,
              conditions: normalizedRule.conditions,
              rateCategory: normalizedRule.rateCategory,
              pricingDetail: sourceRule?.tier || formatPricingConditions(normalizedRule.conditions),
              unitPrice: Number(line.unitPrice ?? line.amount) || 0,
            };
          }),
          ...warehouseChargeLines,
        ],
        vendorCost: {
          ...clone(costRatePlans[shipmentId]),
          ...clone(vendorCostResults[shipmentId]),
          chargeLines: (vendorCostResults[shipmentId]?.chargeLines || []).map((line) => {
            const normalizedLine = normalizePricingRule(line, {
              billingUnit: costRatePlans[shipmentId]?.serviceType === "FTL" ? "TRUCK" : "SHIPMENT",
              conditionLabel: costRatePlans[shipmentId]?.serviceType ? `${costRatePlans[shipmentId].serviceType} shipments` : "All shipments",
            });
            return {
              ...normalizedLine,
              sourceType: line.sourceType || "RATE_PLAN",
              description: normalizedLine.name,
              pricingDetail: formatPricingConditions(normalizedLine.conditions),
              unitPrice: Number(line.unitPrice ?? line.amount) || 0,
            };
          }),
          currency: result.currency,
        },
      }];
    }));
  },
  getRuleTypes() {
    return clone(ruleTypeCatalog);
  },
  getCostRatePlans() {
    return Object.fromEntries(Object.entries(clone(costRatePlans)).map(([shipmentId, plan]) => [shipmentId, withCanonicalShipmentScope(plan)]));
  },
  getCostRatePlanOptions() {
    return Object.entries(costRatePlans).map(([shipmentId, plan]) => {
      const result = clone(vendorCostResults[shipmentId]);
      const pricingRules = (result.chargeLines || []).map((line) => normalizePricingRule(line, {
        billingUnit: plan.serviceType === "FTL" ? "TRUCK" : "SHIPMENT",
        conditionLabel: plan.serviceType ? `${plan.serviceType} shipments` : "All shipments",
        equipmentType: line.code?.startsWith("BASE_") ? (plan.transportMode === "OCEAN" ? "40' High Cube" : plan.transportMode === "AIR" ? "Pallet" : "Van / Dry Van (V)") : null,
      }));
      return {
        ...withCanonicalShipmentScope(clone(plan)),
        ...result,
        pricingRules,
        chargeLines: pricingRules.map((rule) => ({ ...rule, description: rule.name, unitPrice: rule.rate, amount: rule.rate })),
      };
    });
  },
  getBillingRecords() {
    const shipments = buildShipmentSamples(fixture.managementDemo.shipments).filter((shipment) => shipment.transportMode === "TRUCKING");
    return buildBillingSamples(fixture.managementDemo.billing, shipments);
  },
  getPartners() {
    const shipments = buildShipmentSamples(fixture.managementDemo.shipments);
    return buildPartnerSamples(shipments);
  },
  getCanonicalDomain() {
    const runtimeShipments = this.getShipments();
    const sourceDocumentIds = fixture.sourceSet.map((source) => source.sourceId);
    const fieldEvidenceIds = fixture.reviewIssues.map((issue) => issue.issueId);
    let shipments = runtimeShipments.map((shipment) => adaptLegacyShipment(shipment, {
      jobDraft: shipment.shipmentId === fixture.fixtureId ? fixture.jobDraft : null,
      sourceDocumentIds: shipment.shipmentId === fixture.fixtureId ? sourceDocumentIds : [],
      fieldEvidenceIds: shipment.shipmentId === fixture.fixtureId ? fieldEvidenceIds : [],
    }));
    const shipmentById = Object.fromEntries(shipments.map((shipment) => [shipment.shipmentId, shipment]));

    const ratePlans = [
      ...this.getQuotations().map((quote) => adaptLegacyRatePlan(quote, "SELL")),
      ...this.getCostRatePlanOptions().map((plan) => adaptLegacyRatePlan(plan, "BUY")),
    ];
    const initialPricingSnapshots = [];
    Object.entries(this.getPricingResults()).forEach(([shipmentId, result]) => {
      const shipment = shipmentById[shipmentId];
      if (!shipment) return;
      initialPricingSnapshots.push(buildPricingSnapshot({ shipment, pricingResult: result, side: "SELL" }));
      if (result.vendorCost) initialPricingSnapshots.push(buildPricingSnapshot({ shipment, pricingResult: result.vendorCost, side: "BUY" }));
    });
    const { billingEntries, pricingSnapshots } = deriveBillingEntries({
      records: this.getBillingRecords(),
      shipmentsById: shipmentById,
      pricingSnapshots: initialPricingSnapshots,
    });

    const sourceDocuments = fixture.sourceSet.map((source) => adaptLegacySourceDocument(source, fixture.fixtureId));
    const fieldEvidence = fixture.reviewIssues.map((issue) => adaptLegacyFieldEvidence(issue, fixture.fixtureId));
    const outputDocuments = deriveOutputDocuments(shipments);
    shipments = linkShipmentDerivedReferences(shipments, { pricingSnapshots, billingEntries, outputDocuments });
    return { schemaVersion: "v1", shipments, ratePlans, pricingSnapshots, billingEntries, outputDocuments, sourceDocuments, fieldEvidence };
  },
  validateCanonicalDomain() {
    return validateDomainConsistency(this.getCanonicalDomain());
  },
  assertCanonicalDomain() {
    return assertDomainConsistency(this.getCanonicalDomain());
  },
};
