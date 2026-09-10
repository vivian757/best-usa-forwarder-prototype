import fixture from "../../../BEST_USA_Demo_Mock_Source_Set_TRK-DEMO-001.json";

const clone = (value) => JSON.parse(JSON.stringify(value));

const sampleCustomers = [
  "Demo Home Supply Inc.", "Demo Foods West LLC", "Pacific Coast Imports", "Golden State Furniture", "Sierra Medical Supply",
  "Westline Components", "Sunrise Foods", "North Bay Retail", "Desert Home Goods", "Summit Industrial",
  "Harbor Electronics", "Valley Distribution",
];

const sampleRoutes = [
  "San Jose, CA → Sacramento, CA", "Los Angeles, CA → San Francisco, CA", "Stockton, CA → Reno, NV",
  "Ontario, CA → Phoenix, AZ", "San Diego, CA → Las Vegas, NV", "Oakland, CA → Portland, OR",
  "Fresno, CA → Bakersfield, CA", "Long Beach, CA → Tucson, AZ", "Anaheim, CA → Salt Lake City, UT",
  "Hayward, CA → Seattle, WA",
];

const transportStagePreviewRows = [
  {
    shipmentId: "OCN-DEMO-001",
    customer: "Demo Retail Distribution LLC",
    referenceNumber: "REF-DEMO-0914-OCEAN",
    transportMode: "OCEAN",
    serviceType: "FCL",
    route: "Shanghai, CN → Oakland, CA",
    pickupDate: "2026-08-28",
    status: "completed",
    reviewIssueCount: 0,
    lastUpdated: "2026-09-04T09:20:00+08:00",
    detailAvailable: false,
  },
  {
    shipmentId: "OCN-DEMO-011",
    customer: "Harbor Electronics",
    referenceNumber: "REF-DEMO-0918-OCEAN",
    transportMode: "OCEAN",
    serviceType: "LCL",
    route: "Kaohsiung, TW → Long Beach, CA",
    pickupDate: "2026-09-18",
    status: "in_review",
    reviewIssueCount: 0,
    lastUpdated: "2026-09-08T14:10:00+08:00",
    detailAvailable: false,
  },
  {
    shipmentId: "AIR-DEMO-002",
    customer: "Demo Home Supply Inc.",
    referenceNumber: "REF-DEMO-0910-AIR",
    transportMode: "AIR",
    serviceType: "Air Freight",
    route: "Taipei, TW → San Francisco, CA",
    pickupDate: "2026-09-06",
    status: "completed",
    reviewIssueCount: 0,
    lastUpdated: "2026-09-08T10:40:00+08:00",
    detailAvailable: false,
  },
  {
    shipmentId: "AIR-DEMO-012",
    customer: "Sierra Medical Supply",
    referenceNumber: "REF-DEMO-0920-AIR",
    transportMode: "AIR",
    serviceType: "Air Freight",
    route: "Seoul, KR → Los Angeles, CA",
    pickupDate: "2026-09-20",
    status: "in_review",
    reviewIssueCount: 0,
    lastUpdated: "2026-09-08T15:25:00+08:00",
    detailAvailable: false,
  },
];

const sampleCarriers = [
  "Pacific Linehaul LLC",
  "Golden Gate Freight",
  "West Coast Carrier Inc.",
  "Summit Transport LLC",
];

const billingCustomerPool = [
  "Demo Home Supply Inc.",
  "Demo Foods West LLC",
  "Desert Home Goods",
  "Harbor Electronics",
  "Pacific Coast Imports",
];

const billingCarrierPool = [
  "Demo Carrier West LLC",
  ...sampleCarriers,
];

const ruleTemplateCatalog = [
  { templateKey: "flat_rate", label: "Flat rate", description: "One fixed amount when conditions match.", rateLabel: "Fixed amount", defaultUnit: "flat" },
  { templateKey: "per_unit", label: "Per unit", description: "Quantity multiplied by a configured unit amount.", rateLabel: "Unit rate", defaultUnit: "per unit" },
  { templateKey: "tiered_rate", label: "Tiered rate", description: "Select a price from weight, volume or quantity tiers.", rateLabel: "Tier rate", defaultUnit: "tier" },
  { templateKey: "zone_tier_matrix", label: "Zone × tier matrix", description: "Match origin and destination zones, then select a tier.", rateLabel: "Matrix rate", defaultUnit: "matrix" },
  { templateKey: "percentage_surcharge", label: "Percentage surcharge", description: "Apply a percentage to eligible charge lines.", rateLabel: "Percentage rate", defaultUnit: "percent" },
  { templateKey: "threshold_time", label: "Threshold + time", description: "Start charging after a free threshold, then price each time block.", rateLabel: "Block rate", defaultUnit: "per 30 min" },
];

const costRatePlans = {
  "TRK-DEMO-001": { ratePlanId: "COST-DEMO-001", name: "Pacific LTL Cost 2026", counterparty: "Pacific Linehaul LLC", serviceType: "LTL", serviceScope: "LTL · California", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-08-28", version: 1, currency: "USD" },
  "TRK-DEMO-002": { ratePlanId: "COST-DEMO-002", name: "Golden Gate LTL Cost 2026", counterparty: "Golden Gate Freight", serviceType: "LTL", serviceScope: "LTL · West Coast", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-02", version: 2, currency: "USD" },
  "TRK-DEMO-003": { ratePlanId: "COST-DEMO-003", name: "West Coast FTL Cost 2026", counterparty: "West Coast Carrier Inc.", serviceType: "FTL", serviceScope: "FTL · Southwest", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-04-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-05", version: 1, currency: "USD" },
  "TRK-DEMO-004": { ratePlanId: "COST-DEMO-004", name: "Summit Refrigerated Cost 2026", counterparty: "Summit Transport LLC", serviceType: "LTL", serviceScope: "LTL · Refrigerated", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-02-01", effectiveTo: "2027-01-31", lastUpdated: "2026-09-07", version: 3, currency: "USD" },
};

const quoteVersionHistory = {
  "RATE-DEMO-001": [
    { historyId: "RATE-DEMO-001-V3", version: 3, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-09T10:00:00+08:00", summary: "Added warehouse processing and storage service items to the customer quotation." },
    { historyId: "RATE-DEMO-001-V2", version: 2, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-07T16:30:00+08:00", summary: "Updated weight tiers and detention pricing." },
    { historyId: "RATE-DEMO-001-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2025-11-15T10:00:00-08:00", summary: "Created the quote plan for the 2026 contract period." },
  ],
  "RATE-DEMO-002": [
    { historyId: "RATE-DEMO-002-V2", version: 2, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-06T11:20:00+08:00", summary: "Updated residential and appointment charges." },
    { historyId: "RATE-DEMO-002-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2025-12-02T14:30:00-08:00", summary: "Created the project quote plan." },
  ],
  "RATE-DEMO-003": [
    { historyId: "RATE-DEMO-003-V2", version: 2, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-06T09:45:00+08:00", summary: "Added high-value handling requirements." },
    { historyId: "RATE-DEMO-003-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2026-09-01T09:15:00-07:00", summary: "Created the draft FTL quote plan." },
  ],
  "RATE-DEMO-004": [
    { historyId: "RATE-DEMO-004-V3", version: 3, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-05T17:10:00+08:00", summary: "Updated refrigerated service and detention pricing." },
    { historyId: "RATE-DEMO-004-V2", version: 2, event: "Edited", role: "Account Manager", changedAt: "2026-08-15T13:40:00-07:00", summary: "Expanded the eligible pallet range." },
    { historyId: "RATE-DEMO-004-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2026-06-12T11:20:00-07:00", summary: "Created the cold-chain quote plan." },
  ],
};

const vendorCostResults = {
  "TRK-DEMO-001": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Zone × tier matrix", templateKey: "zone_tier_matrix", amount: 420 },
      { code: "LIFTGATE", description: "Liftgate reimbursement", source: "Flat rate", templateKey: "flat_rate", amount: 50 },
    ],
    initialAdjustments: [],
  },
  "TRK-DEMO-002": {
    calculationStatus: "final",
    chargeLines: [
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Zone × tier matrix", templateKey: "zone_tier_matrix", amount: 880 },
      { code: "APPOINTMENT", description: "Appointment reimbursement", source: "Flat rate", templateKey: "flat_rate", amount: 80 },
    ],
    initialAdjustments: [],
  },
  "TRK-DEMO-003": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_FTL", description: "Carrier truck rate", source: "Flat rate", templateKey: "flat_rate", amount: 1900 },
      { code: "HIGH_VALUE", description: "High-value handling", source: "Flat rate", templateKey: "flat_rate", amount: 150 },
    ],
    initialAdjustments: [],
  },
  "TRK-DEMO-004": {
    calculationStatus: "final",
    chargeLines: [
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Zone × tier matrix", templateKey: "zone_tier_matrix", amount: 610 },
      { code: "COLD_CHAIN", description: "Refrigerated equipment", source: "Flat rate", templateKey: "flat_rate", amount: 70 },
    ],
    initialAdjustments: [],
  },
};

const partnerEmail = (name) => name.toLowerCase().replaceAll(" ", ".").replace(/[^a-z0-9.]+/g, "") + "@demo.example";

function buildPartnerSamples(shipments) {
  const customers = [...new Set(shipments.map((shipment) => shipment.customer))];
  return [
    ...customers.map((name, index) => ({
      partnerId: "CUS-DEMO-" + String(index + 1).padStart(3, "0"),
      name,
      type: "customer",
      contactName: ["Alex Chen", "Jordan Lee", "Morgan Davis", "Taylor Kim"][index % 4],
      email: partnerEmail(name),
      mobile: "(510) 555-" + String(3100 + index).padStart(4, "0"),
      phone: "(510) 555-" + String(1100 + index).padStart(4, "0"),
    })),
    ...sampleCarriers.map((name, index) => ({
      partnerId: "CAR-DEMO-" + String(index + 1).padStart(3, "0"),
      name,
      type: "carrier",
      contactName: ["Dispatch Desk", "Carrier Operations", "Linehaul Team", "Capacity Desk"][index],
      email: partnerEmail(name),
      mobile: "(310) 555-" + String(4100 + index).padStart(4, "0"),
      phone: "(310) 555-" + String(2100 + index).padStart(4, "0"),
    })),
  ];
}

function buildShipmentSamples(source, target = 30) {
  const rows = clone(source).map((shipment) => ({
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
    rows.push({
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
      lastUpdated: "2026-09-07T12:00:00+08:00",
    });
  }
  const normalizedRows = rows.map((shipment) => ({
    ...shipment,
    createdDate: shipment.createdDate || shipment.lastUpdated?.slice(0, 10) || shipment.pickupDate,
    detailAvailable: shipment.detailAvailable !== false,
  }));
  const previewRows = transportStagePreviewRows.map((shipment) => ({
    ...shipment,
    createdDate: shipment.createdDate || shipment.lastUpdated?.slice(0, 10) || shipment.pickupDate,
  }));
  return [...normalizedRows, ...previewRows];
}

function buildQuotationSamples(source, shipments) {
  const quotes = clone(source);
  const quotedCustomers = new Set(quotes.map((quote) => quote.customer));
  const missingCustomers = [...new Set(shipments.map((shipment) => shipment.customer))]
    .filter((customer) => !quotedCustomers.has(customer));

  return [
    ...quotes,
    ...missingCustomers.map((customer, index) => {
      const customerShipment = shipments.find((shipment) => shipment.customer === customer);
      const serviceType = customerShipment?.serviceType || "LTL";
      const quoteNumber = quotes.length + index + 1;
      return {
        quoteId: `RATE-DEMO-${String(quoteNumber).padStart(3, "0")}`,
        name: `${customer} ${serviceType} 2026`,
        customer,
        transportMode: customerShipment?.transportMode || "TRUCKING",
        status: "accepted",
        serviceScope: `${serviceType} · West Coast`,
        serviceScopes: [`${serviceType} · West Coast`],
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        createdAt: "2026-01-01",
        lastUpdated: "2026-09-07",
        version: 1,
        currency: "USD",
        rateMatrix: [{
          lane: "Standard West Coast",
          tier: serviceType === "FTL" ? "Per truck" : "0–2,500 lb",
          basis: serviceType === "FTL" ? "Per truck" : "Billable weight",
          rate: serviceType === "FTL" ? 1800 : 500,
        }],
        surchargeRules: [],
        serviceItems: [],
      };
    }),
  ];
}

function buildBillingSamples(source, shipments, target = 30) {
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
      amount: customerAr ? 850 + index * 75 : 540 + index * 45,
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
    return buildQuotationSamples(fixture.managementDemo.quotations, shipments).map((quote, index) => ({
      ...quote,
      transportMode: quote.transportMode || "TRUCKING",
      contractId: `CTR-DEMO-${String(index + 1).padStart(3, "0")}`,
      billingAccountId: `BILL-ACCT-${String(index + 1).padStart(3, "0")}`,
      pricingSide: "sell",
      versionHistory: clone(quoteVersionHistory[quote.quoteId] || []),
      rateMatrix: (quote.rateMatrix || []).map((rule) => ({
        ...rule,
        templateKey: rule.basis === "Per truck" ? "flat_rate" : "zone_tier_matrix",
        templateLabel: rule.basis === "Per truck" ? "Flat rate" : "Zone × tier matrix",
      })),
      surchargeRules: (quote.surchargeRules || []).map((rule) => ({
        ...rule,
        templateKey: rule.unit === "percent" ? "percentage_surcharge" : rule.unit === "per 30 min" ? "threshold_time" : "flat_rate",
        templateLabel: rule.unit === "percent" ? "Percentage surcharge" : rule.unit === "per 30 min" ? "Threshold + time" : "Flat rate",
      })),
      serviceItems: clone(quote.serviceItems || []),
    }));
  },
  getPricingResults() {
    return Object.fromEntries(Object.entries(clone(fixture.managementDemo.pricingResults)).map(([shipmentId, result]) => {
      const appliedQuote = fixture.managementDemo.quotations.find((quote) => quote.quoteId === result.ratePlanId);
      const warehouseChargeLines = (appliedQuote?.serviceItems || []).map((item) => ({
        code: item.lineId,
        description: item.name,
        source: `${Number(item.quantity).toLocaleString("en-US")} ${item.unit} × ${item.rate}`,
        templateKey: "per_unit",
        serviceGroup: "Warehouse",
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.quantity) * Number(item.rate),
      }));
      return [shipmentId, {
        ...result,
        chargeLines: [
          ...result.chargeLines.map((line) => ({
            ...line,
            serviceGroup: "Trucking",
            templateKey: line.code.startsWith("BASE_") ? "zone_tier_matrix" : line.code === "COLD_CHAIN" ? "percentage_surcharge" : "flat_rate",
          })),
          ...warehouseChargeLines,
        ],
        vendorCost: {
          ...clone(costRatePlans[shipmentId]),
          ...clone(vendorCostResults[shipmentId]),
          currency: result.currency,
        },
      }];
    }));
  },
  getRuleTemplates() {
    return clone(ruleTemplateCatalog);
  },
  getCostRatePlans() {
    return clone(costRatePlans);
  },
  getCostRatePlanOptions() {
    return Object.entries(costRatePlans).map(([shipmentId, plan]) => ({
      ...clone(plan),
      ...clone(vendorCostResults[shipmentId]),
    }));
  },
  getBillingRecords() {
    const shipments = buildShipmentSamples(fixture.managementDemo.shipments).filter((shipment) => shipment.transportMode === "TRUCKING");
    return buildBillingSamples(fixture.managementDemo.billing, shipments);
  },
  getPartners() {
    const shipments = buildShipmentSamples(fixture.managementDemo.shipments);
    return buildPartnerSamples(shipments);
  },
};
