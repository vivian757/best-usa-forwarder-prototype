import fixture from "../fixture.json";

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

function createOceanPreviewShipment({ shipmentId, customer, serviceType, route, departureDate, updatedDate, status, carrier }) {
  const [pol, pod] = route.split(" → ");
  const suffix = shipmentId.split("-").at(-1);
  return {
    shipmentId,
    customer,
    referenceNumber: `REF-DEMO-${departureDate.slice(5).replace("-", "")}-OCEAN`,
    transportMode: "OCEAN",
    serviceType,
    route,
    pickupDate: departureDate,
    status,
    reviewIssueCount: 0,
    lastUpdated: `${updatedDate}T11:20:00+08:00`,
    detailAvailable: true,
    modeDetails: {
      postDate: updatedDate,
      operator: "Demo Ocean Ops",
      customerReference: `${customer.split(" ").map((word) => word[0]).join("")}-PO-${suffix}`,
      billTo: customer,
      master: {
        mblNo: `MBL-DEMO-${suffix}`,
        overseasAgent: "Demo Asia Forwarding Partner",
        carrier,
        blAccount: "BEST USA",
        pol,
        pod,
        vessel: "Demo Pacific Voyager",
        voyage: `${suffix}E`,
        etd: departureDate,
        eta: "",
        cyCfsLocation: "",
      },
      house: {
        hblNo: `HBL-DEMO-${suffix}`,
        amsNo: `AMS-DEMO-${suffix}`,
        shipper: "Demo Asia Exporter Ltd.",
        consignee: customer,
        notifyParty: customer,
        placeOfDelivery: pod,
        placeOfDeliveryEta: "",
        deliveryLocation: `${customer} Receiving`,
        cyCfsLocation: "",
        mark: `${suffix} / BEST USA`,
        description: "General merchandise, non-hazardous",
      },
      containers: [
        { containerNo: `DEMO${suffix}001`, typeSize: serviceType === "FCL" ? "40HC" : "20GP", sealNo: `SL${suffix}`, packages: serviceType === "FCL" ? "680 CTNS" : "96 PKGS", weight: serviceType === "FCL" ? "16,800 KG" : "4,250 KG", measurement: serviceType === "FCL" ? "58.4 CBM" : "18.6 CBM" },
      ],
    },
  };
}

function createAirPreviewShipment({ shipmentId, customer, route, departureDate, updatedDate, status, carrier }) {
  const [departureAirport, destinationAirport] = route.split(" → ");
  const suffix = shipmentId.split("-").at(-1);
  return {
    shipmentId,
    customer,
    referenceNumber: `REF-DEMO-${departureDate.slice(5).replace("-", "")}-AIR`,
    transportMode: "AIR",
    serviceType: "Air Freight",
    route,
    pickupDate: departureDate,
    status,
    reviewIssueCount: 0,
    lastUpdated: `${updatedDate}T15:10:00+08:00`,
    detailAvailable: true,
    modeDetails: {
      postDate: updatedDate,
      operator: "Demo Air Ops",
      customerReference: `${customer.split(" ").map((word) => word[0]).join("")}-AIR-${suffix}`,
      billTo: customer,
      master: {
        mawbNo: `180-2609${suffix}`,
        awbType: "Consolidation",
        carrier,
        coLoader: "Demo Asia Air Logistics",
        departureAirport,
        destinationAirport,
        etd: `${departureDate}T10:30`,
        eta: "",
        flightNo: `DE ${suffix}`,
        connectingFlight: "Direct",
      },
      house: {
        hawbNo: `HAWB-DEMO-${suffix}`,
        shipper: "Demo Asia Exporter Ltd.",
        consignee: customer,
        notifyParty: customer,
        incoterms: "FOB",
        serviceTerm: "Airport to airport",
        shipType: "General cargo",
        arrivalDateTime: "",
        destinationHandlingLocation: "",
        commodity: "General merchandise, non-hazardous",
        mark: `${suffix} / BEST USA`,
        packages: "12 PKGS",
        grossWeight: "286 KG",
        chargeableWeight: "342 KG",
        volumeWeight: "342 KG",
      },
      dimensions: [
        { length: "100", width: "80", height: "70", pieces: "12", unit: "CM" },
      ],
    },
  };
}

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
    detailAvailable: true,
    modeDetails: {
      postDate: "2026-09-04",
      operator: "Avery Chen",
      customerReference: "PO-78432",
      billTo: "Demo Retail Distribution LLC",
      master: {
        mblNo: "MAEU260814739",
        overseasAgent: "Demo Shanghai Forwarding Ltd.",
        carrier: "Demo Ocean Line",
        blAccount: "BEST USA",
        pol: "Shanghai, CN",
        pod: "Oakland, CA",
        vessel: "Demo Horizon",
        voyage: "026E",
        etd: "2026-08-28",
        eta: "2026-09-14",
        cyCfsLocation: "Oakland International Container Terminal",
      },
      house: {
        hblNo: "HBL-DEMO-260901",
        amsNo: "AMSD260901",
        shipper: "Demo Shanghai Manufacturing Co.",
        consignee: "Demo Retail Distribution LLC",
        notifyParty: "Demo Retail Distribution LLC",
        placeOfDelivery: "Oakland, CA",
        placeOfDeliveryEta: "2026-09-15",
        deliveryLocation: "Demo Oakland Distribution Center",
        cyCfsLocation: "Oakland International Container Terminal",
        mark: "DRD / OAK / 260901",
        description: "Home furnishing components",
      },
      containers: [
        { containerNo: "MSCU1234567", typeSize: "40HC", sealNo: "SL908214", packages: "820 CTNS", weight: "18,460 KG", measurement: "61.2 CBM" },
      ],
    },
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
    detailAvailable: true,
    modeDetails: {
      postDate: "2026-09-08",
      operator: "Morgan Lee",
      customerReference: "HE-PO-91802",
      billTo: "Harbor Electronics",
      master: {
        mblNo: "ONEYKHHB260918",
        overseasAgent: "Demo Kaohsiung Logistics",
        carrier: "Demo Ocean Network",
        blAccount: "BEST USA",
        pol: "Kaohsiung, TW",
        pod: "Long Beach, CA",
        vessel: "Demo Pacific Star",
        voyage: "118W",
        etd: "2026-09-18",
        eta: "",
        cyCfsLocation: "",
      },
      house: {
        hblNo: "HBL-DEMO-260918",
        amsNo: "AMSK260918",
        shipper: "Demo Taiwan Components Ltd.",
        consignee: "Harbor Electronics",
        notifyParty: "Harbor Electronics",
        placeOfDelivery: "Long Beach, CA",
        placeOfDeliveryEta: "",
        deliveryLocation: "Harbor Electronics Receiving",
        cyCfsLocation: "",
        mark: "HE / LGB / 918",
        description: "Electronic components, non-hazardous",
      },
      containers: [
        { containerNo: "OOLU7654321", typeSize: "20GP", sealNo: "KS260918", packages: "146 PKGS", weight: "6,240 KG", measurement: "24.8 CBM" },
      ],
    },
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
    detailAvailable: true,
    modeDetails: {
      postDate: "2026-09-08",
      operator: "Jordan Kim",
      customerReference: "DHS-AIR-0910",
      billTo: "Demo Home Supply Inc.",
      master: {
        mawbNo: "695-26091234",
        awbType: "Consolidation",
        carrier: "Demo Pacific Air Cargo",
        coLoader: "Demo Taipei Air Logistics",
        departureAirport: "TPE · Taipei",
        destinationAirport: "SFO · San Francisco",
        etd: "2026-09-06T22:20",
        eta: "2026-09-07T18:10",
        flightNo: "BR 018",
        connectingFlight: "Direct",
      },
      house: {
        hawbNo: "HAWB-DEMO-260906",
        shipper: "Demo Taiwan Home Products",
        consignee: "Demo Home Supply Inc.",
        notifyParty: "Demo Home Supply Inc.",
        incoterms: "FOB",
        serviceTerm: "Airport to airport",
        shipType: "General cargo",
        arrivalDateTime: "2026-09-07T18:10",
        destinationHandlingLocation: "SFO Cargo Building 5",
        commodity: "Home organization accessories",
        mark: "DHS / SFO / 260906",
        packages: "24 CTNS",
        grossWeight: "486 KG",
        chargeableWeight: "962 KG",
        volumeWeight: "962 KG",
      },
      dimensions: [
        { length: "120", width: "80", height: "80", pieces: "4", unit: "CM" },
        { length: "60", width: "50", height: "45", pieces: "20", unit: "CM" },
      ],
    },
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
    detailAvailable: true,
    modeDetails: {
      postDate: "2026-09-08",
      operator: "Taylor Wang",
      customerReference: "SMS-URG-0920",
      billTo: "Sierra Medical Supply",
      master: {
        mawbNo: "180-26092018",
        awbType: "Direct master",
        carrier: "Demo Korea Air Cargo",
        coLoader: "",
        departureAirport: "ICN · Seoul",
        destinationAirport: "LAX · Los Angeles",
        etd: "2026-09-20T10:30",
        eta: "",
        flightNo: "KE 213",
        connectingFlight: "Direct",
      },
      house: {
        hawbNo: "HAWB-DEMO-260920",
        shipper: "Demo Seoul Medical Devices",
        consignee: "Sierra Medical Supply",
        notifyParty: "Sierra Medical Supply",
        incoterms: "CIP",
        serviceTerm: "Airport to door",
        shipType: "Medical devices",
        arrivalDateTime: "",
        destinationHandlingLocation: "",
        commodity: "Non-sterile medical equipment",
        mark: "SMS / LAX / URGENT",
        packages: "8 PKGS",
        grossWeight: "218 KG",
        chargeableWeight: "246 KG",
        volumeWeight: "246 KG",
      },
      dimensions: [
        { length: "100", width: "80", height: "70", pieces: "8", unit: "CM" },
      ],
    },
  },
  ...[
    { shipmentId: "OCN-DEMO-012", customer: "Pacific Coast Imports", serviceType: "FCL", route: "Ningbo, CN → Long Beach, CA", departureDate: "2026-09-12", updatedDate: "2026-09-10", status: "completed", carrier: "Demo Ocean Line" },
    { shipmentId: "OCN-DEMO-013", customer: "Golden State Furniture", serviceType: "LCL", route: "Busan, KR → Seattle, WA", departureDate: "2026-09-14", updatedDate: "2026-09-11", status: "in_review", carrier: "Demo Ocean Network" },
    { shipmentId: "OCN-DEMO-014", customer: "Valley Distribution", serviceType: "FCL", route: "Yantian, CN → Tacoma, WA", departureDate: "2026-09-16", updatedDate: "2026-09-12", status: "in_review", carrier: "Demo Ocean Line" },
    { shipmentId: "OCN-DEMO-015", customer: "Desert Home Goods", serviceType: "LCL", route: "Ho Chi Minh City, VN → Oakland, CA", departureDate: "2026-09-18", updatedDate: "2026-09-13", status: "completed", carrier: "Demo Ocean Network" },
    { shipmentId: "OCN-DEMO-016", customer: "Summit Industrial", serviceType: "FCL", route: "Shanghai, CN → Los Angeles, CA", departureDate: "2026-09-20", updatedDate: "2026-09-14", status: "in_review", carrier: "Demo Ocean Line" },
    { shipmentId: "OCN-DEMO-017", customer: "North Bay Retail", serviceType: "LCL", route: "Keelung, TW → San Francisco, CA", departureDate: "2026-09-22", updatedDate: "2026-09-15", status: "completed", carrier: "Demo Ocean Network" },
    { shipmentId: "OCN-DEMO-018", customer: "Westline Components", serviceType: "FCL", route: "Qingdao, CN → Long Beach, CA", departureDate: "2026-09-24", updatedDate: "2026-09-16", status: "completed", carrier: "Demo Ocean Line" },
    { shipmentId: "OCN-DEMO-019", customer: "Sunrise Foods", serviceType: "LCL", route: "Yokohama, JP → Oakland, CA", departureDate: "2026-09-26", updatedDate: "2026-09-17", status: "in_review", carrier: "Demo Ocean Network" },
  ].map(createOceanPreviewShipment),
  ...[
    { shipmentId: "AIR-DEMO-013", customer: "Harbor Electronics", route: "NRT · Tokyo → SFO · San Francisco", departureDate: "2026-09-11", updatedDate: "2026-09-10", status: "completed", carrier: "Demo Pacific Air Cargo" },
    { shipmentId: "AIR-DEMO-014", customer: "Pacific Coast Imports", route: "ICN · Seoul → DFW · Dallas", departureDate: "2026-09-13", updatedDate: "2026-09-11", status: "in_review", carrier: "Demo Korea Air Cargo" },
    { shipmentId: "AIR-DEMO-015", customer: "Valley Distribution", route: "TPE · Taipei → LAX · Los Angeles", departureDate: "2026-09-15", updatedDate: "2026-09-12", status: "completed", carrier: "Demo Pacific Air Cargo" },
    { shipmentId: "AIR-DEMO-016", customer: "Sierra Medical Supply", route: "ICN · Seoul → ORD · Chicago", departureDate: "2026-09-17", updatedDate: "2026-09-13", status: "in_review", carrier: "Demo Korea Air Cargo" },
    { shipmentId: "AIR-DEMO-017", customer: "Westline Components", route: "HKG · Hong Kong → LAX · Los Angeles", departureDate: "2026-09-19", updatedDate: "2026-09-14", status: "in_review", carrier: "Demo Pacific Air Cargo" },
    { shipmentId: "AIR-DEMO-018", customer: "Summit Industrial", route: "ICN · Seoul → SEA · Seattle", departureDate: "2026-09-21", updatedDate: "2026-09-15", status: "completed", carrier: "Demo Korea Air Cargo" },
    { shipmentId: "AIR-DEMO-019", customer: "Demo Foods West LLC", route: "TPE · Taipei → SFO · San Francisco", departureDate: "2026-09-23", updatedDate: "2026-09-16", status: "completed", carrier: "Demo Pacific Air Cargo" },
    { shipmentId: "AIR-DEMO-020", customer: "Desert Home Goods", route: "ICN · Seoul → LAX · Los Angeles", departureDate: "2026-09-25", updatedDate: "2026-09-17", status: "in_review", carrier: "Demo Korea Air Cargo" },
  ].map(createAirPreviewShipment),
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
  { templateKey: "percentage_surcharge", label: "Percentage surcharge", description: "Apply a percentage to eligible charge lines.", rateLabel: "Percentage rate", defaultUnit: "percent" },
  { templateKey: "threshold_time", label: "Threshold + time", description: "Start charging after a free threshold, then price each time block.", rateLabel: "Block rate", defaultUnit: "per 30 min" },
];

const costRatePlans = {
  "TRK-DEMO-001": { ratePlanId: "COST-DEMO-001", name: "Pacific LTL Cost 2026", counterparty: "Pacific Linehaul LLC", serviceType: "LTL", serviceScope: "LTL · California", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-08-28", version: 1, currency: "USD" },
  "TRK-DEMO-002": { ratePlanId: "COST-DEMO-002", name: "Golden Gate LTL Cost 2026", counterparty: "Golden Gate Freight", serviceType: "LTL", serviceScope: "LTL · West Coast", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-02", version: 2, currency: "USD" },
  "TRK-DEMO-003": { ratePlanId: "COST-DEMO-003", name: "West Coast FTL Cost 2026", counterparty: "West Coast Carrier Inc.", serviceType: "FTL", serviceScope: "FTL · Southwest", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-04-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-05", version: 1, currency: "USD" },
  "TRK-DEMO-004": { ratePlanId: "COST-DEMO-004", name: "Summit Refrigerated Cost 2026", counterparty: "Summit Transport LLC", serviceType: "LTL", serviceScope: "LTL · Refrigerated", transportMode: "TRUCKING", status: "accepted", effectiveFrom: "2026-02-01", effectiveTo: "2027-01-31", lastUpdated: "2026-09-07", version: 3, currency: "USD" },
  "OCN-DEMO-001": { ratePlanId: "COST-DEMO-005", name: "Demo Ocean Line FCL Cost 2026", counterparty: "Demo Ocean Line", serviceType: "FCL", serviceScope: "FCL · Asia to US West Coast", transportMode: "OCEAN", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-04", version: 1, currency: "USD" },
  "OCN-DEMO-011": { ratePlanId: "COST-DEMO-006", name: "Demo Ocean Network LCL Cost 2026", counterparty: "Demo Ocean Network", serviceType: "LCL", serviceScope: "LCL · Asia to US West Coast", transportMode: "OCEAN", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-08", version: 1, currency: "USD" },
  "AIR-DEMO-002": { ratePlanId: "COST-DEMO-007", name: "Demo Pacific Air Cargo Cost 2026", counterparty: "Demo Pacific Air Cargo", serviceType: "Air Freight", serviceScope: "Air Freight · Asia to US West Coast", transportMode: "AIR", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-08", version: 1, currency: "USD" },
  "AIR-DEMO-012": { ratePlanId: "COST-DEMO-008", name: "Demo Korea Air Cargo Cost 2026", counterparty: "Demo Korea Air Cargo", serviceType: "Air Freight", serviceScope: "Air Freight · Asia to US West Coast", transportMode: "AIR", status: "accepted", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", lastUpdated: "2026-09-08", version: 1, currency: "USD" },
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
  "RATE-DEMO-005": [
    { historyId: "RATE-DEMO-005-V2", version: 2, event: "Edited", role: "Pricing Manager", changedAt: "2026-09-04T09:20:00+08:00", summary: "Updated the 40HC ocean freight and fuel surcharge." },
    { historyId: "RATE-DEMO-005-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2025-12-18T09:30:00-08:00", summary: "Created the 2026 transpacific FCL customer quote." },
  ],
  "RATE-DEMO-006": [
    { historyId: "RATE-DEMO-006-V1", version: 1, event: "Created", role: "Sales Operations", changedAt: "2026-01-08T11:00:00+08:00", summary: "Created the 2026 Asia to US West Coast air freight customer quote." },
  ],
};

const vendorCostResults = {
  "TRK-DEMO-001": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Tiered rate", templateKey: "tiered_rate", amount: 420 },
      { code: "LIFTGATE", description: "Liftgate reimbursement", source: "Flat rate", templateKey: "flat_rate", amount: 50 },
    ],
    initialAdjustments: [],
  },
  "TRK-DEMO-002": {
    calculationStatus: "final",
    chargeLines: [
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Tiered rate", templateKey: "tiered_rate", amount: 880 },
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
      { code: "BASE_LTL", description: "Carrier linehaul", source: "Tiered rate", templateKey: "tiered_rate", amount: 610 },
      { code: "COLD_CHAIN", description: "Refrigerated equipment", source: "Flat rate", templateKey: "flat_rate", amount: 70 },
    ],
    initialAdjustments: [],
  },
  "OCN-DEMO-001": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_FCL", description: "Ocean freight", source: "Per container", templateKey: "flat_rate", unit: "CONTAINER", amount: 2700 },
    ],
    initialAdjustments: [],
  },
  "OCN-DEMO-011": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_LCL", description: "Ocean freight", source: "Per shipment", templateKey: "flat_rate", unit: "SHIPMENT", amount: 1120 },
    ],
    initialAdjustments: [],
  },
  "AIR-DEMO-002": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_AIR", description: "Air freight", source: "Per shipment", templateKey: "flat_rate", unit: "SHIPMENT", amount: 1780 },
    ],
    initialAdjustments: [],
  },
  "AIR-DEMO-012": {
    calculationStatus: "estimated",
    chargeLines: [
      { code: "BASE_AIR", description: "Air freight", source: "Per shipment", templateKey: "flat_rate", unit: "SHIPMENT", amount: 1850 },
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
  const getQuoteContextKey = ({ customer, transportMode = "TRUCKING", serviceType, serviceScope = "" }) => {
    const scopedServiceType = serviceType || serviceScope.split(" · ")[0] || "LTL";
    return `${customer}|${transportMode}|${scopedServiceType}`;
  };
  const quotedContexts = new Set(quotes.map((quote) => getQuoteContextKey(quote)));
  const shipmentContexts = [...new Map(shipments.map((shipment) => [getQuoteContextKey(shipment), {
    customer: shipment.customer,
    transportMode: shipment.transportMode || "TRUCKING",
    serviceType: shipment.serviceType || "LTL",
    route: shipment.route,
  }])).values()];
  const missingContexts = shipmentContexts.filter((context) => !quotedContexts.has(getQuoteContextKey(context)));
  const interactiveQuoteVariants = quotes
    .filter((quote) => quote.quoteId === "RATE-DEMO-004")
    .map((quote) => ({
      ...quote,
      quoteId: "RATE-DEMO-099",
      name: "Cold Chain West Alternate 2026",
      version: 1,
      status: "accepted",
      createdAt: "2026-08-18T10:00:00-07:00",
      lastUpdated: "2026-09-08T14:20:00-07:00",
      shipmentIds: [],
      rateMatrix: [
        { lane: "Central CA → Nevada", equipmentType: "Reefer (R)", tier: "0–4 pallets", basis: "Per shipment", rate: 760 },
        { lane: "Central CA → Nevada", equipmentType: "Reefer (R)", tier: "5–10 pallets", basis: "Per shipment", rate: 920 },
      ],
      surchargeRules: [
        { code: "COLD_CHAIN", name: "Refrigerated service", trigger: "Per shipment", rate: 125, unit: "flat" },
        { code: "APPOINTMENT", name: "Delivery appointment", trigger: "Per appointment", rate: 85, unit: "flat" },
      ],
    }));

  return [
    ...quotes,
    ...interactiveQuoteVariants,
    ...missingContexts.map((context, index) => {
      const { customer, transportMode, serviceType, route } = context;
      const quoteNumber = quotes.length + index + 1;
      const isOcean = transportMode === "OCEAN";
      const isAir = transportMode === "AIR";
      const basis = isOcean && serviceType === "FCL" ? "Per container"
        : isOcean || isAir || serviceType === "FTL" ? (serviceType === "FTL" ? "Per truck" : "Per shipment")
          : "Billable weight";
      const tier = basis === "Billable weight" ? "0–2,500 lb" : basis;
      const rate = isOcean ? (serviceType === "FCL" ? 3200 : 1450)
        : isAir ? 2100
          : serviceType === "FTL" ? 1800 : 500;
      return {
        quoteId: `RATE-DEMO-${String(quoteNumber).padStart(3, "0")}`,
        name: `${customer} ${serviceType} 2026`,
        customer,
        transportMode,
        status: "accepted",
        serviceScope: `${serviceType} · ${isOcean || isAir ? "Asia to US West Coast" : "West Coast"}`,
        serviceScopes: [`${serviceType} · ${isOcean || isAir ? "Asia to US West Coast" : "West Coast"}`],
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        createdAt: "2026-01-01",
        lastUpdated: "2026-09-07",
        version: 1,
        currency: "USD",
        rateMatrix: [{
          lane: route || "Standard West Coast",
          equipmentType: isOcean ? "40' High Cube" : isAir ? "Pallet" : "Van / Dry Van (V)",
          tier,
          basis,
          rate,
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
        equipmentType: rule.equipmentType || (quote.transportMode === "OCEAN" ? "40' High Cube" : quote.transportMode === "AIR" ? "Pallet" : "Van / Dry Van (V)"),
        templateKey: rule.basis?.startsWith("Per ") ? "flat_rate" : "tiered_rate",
        templateLabel: rule.basis?.startsWith("Per ") ? "Flat rate" : "Tiered rate",
      })),
      surchargeRules: (quote.surchargeRules || []).map((rule) => ({
        ...rule,
        templateKey: "per_unit",
        templateLabel: "Per unit",
        unit: "per unit",
        billingUnit: rule.billingUnit || "SHIPMENT",
      })),
      serviceItems: clone(quote.serviceItems || []),
    }));
  },
  getPricingResults() {
    return Object.fromEntries(Object.entries(clone(fixture.managementDemo.pricingResults)).map(([shipmentId, result]) => {
      const appliedQuote = fixture.managementDemo.quotations.find((quote) => quote.quoteId === result.ratePlanId);
      const transportServiceGroup = appliedQuote?.transportMode === "OCEAN" ? "Ocean"
        : appliedQuote?.transportMode === "AIR" ? "Air"
          : "Trucking";
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
            serviceGroup: line.serviceGroup || transportServiceGroup,
            templateKey: line.code.startsWith("BASE_") ? "tiered_rate" : line.code === "COLD_CHAIN" ? "percentage_surcharge" : "flat_rate",
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
