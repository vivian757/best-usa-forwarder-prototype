import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, LinearProgress, Menu, MenuItem, Popover, Select, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Download,
  File,
  FileSearch,
  FileOutput,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  History,
  Info,
  LayoutList,
  Link2,
  Mail,
  MapPin,
  MoreVertical,
  Package,
  PackageCheck,
  PenLine,
  Plane,
  Plus,
  ReceiptText,
  Ship,
  Truck,
  Trash2,
  UploadCloud,
  UsersRound,
  Warehouse,
  Weight,
  X,
} from "lucide-react";
import {
  AutocompleteInput,
  AppliedFilterBar,
  AppShell,
  BulkActionBar,
  DeleteConfirmDialog,
  DetailPage,
  FeedbackSnackbar,
  FieldLabel,
  ManagementDataGrid,
  PageHeader,
  RadioInput,
  RowActionButton,
  RowActionMenu,
  SearchSheet,
  SelectInput,
  StatusChip,
  TableToolbar,
  TextInput,
  TimeRangeInput,
} from "./components";
import { prototypeRepository } from "./data/prototypeRepository";

const fixture = prototypeRepository.getFixture();
const baseShipments = prototypeRepository.getShipments();
const baseQuotations = prototypeRepository.getQuotations();
const pricingResults = prototypeRepository.getPricingResults();
const baseCostRatePlans = prototypeRepository.getCostRatePlanOptions().map((plan) => ({
  ...plan,
  versionHistory: [
    {
      historyId: `${plan.ratePlanId}-V${plan.version}`,
      version: plan.version,
      event: plan.version > 1 ? "Edited" : "Created",
      role: "Pricing Manager",
      changedAt: `${plan.lastUpdated}T09:00:00-07:00`,
      summary: plan.version > 1 ? `Updated carrier rate plan to version ${plan.version}.` : "Created the carrier rate plan.",
    },
    ...(plan.version > 1 ? [{
      historyId: `${plan.ratePlanId}-V1`,
      version: 1,
      event: "Created",
      role: "Pricing Manager",
      changedAt: `${plan.effectiveFrom}T09:00:00-08:00`,
      summary: "Created the carrier rate plan.",
    }] : []),
  ],
}));
const ruleTemplates = prototypeRepository.getRuleTemplates();
const baseRuleTemplates = ruleTemplates.filter((template) => ["flat_rate", "tiered_rate", "zone_tier_matrix"].includes(template.templateKey));
const additionalRuleTemplates = ruleTemplates.filter((template) => template.templateKey === "per_unit");
const quotationShipmentModeOptions = [
  { value: "OCEAN", label: "Ocean" },
  { value: "AIR", label: "Air" },
  { value: "TRUCKING", label: "Trucking" },
];
const carrierRuleAppliesWhenOptions = [
  { value: "All shipments", label: "All shipments" },
  { value: "LTL shipments", label: "LTL shipments" },
  { value: "FTL shipments", label: "FTL shipments" },
  { value: "Refrigerated shipments", label: "Refrigerated shipments" },
];
const EMPTY_SOURCE_FILES = [];
const baseRuleFieldOptions = {
  zone_tier_matrix: {
    appliesWhen: ["Zone A → Zone B", "Zone A → Zone C", "Zone B → Zone C"],
    tiers: ["0–2,500 lb", "2,501–5,000 lb", "5,001–10,000 lb"],
    bases: ["Billable weight", "Actual weight"],
  },
  tiered_rate: {
    appliesWhen: ["LTL shipments", "FTL shipments", "Refrigerated shipments"],
    tiers: ["0–2,500 lb", "2,501–5,000 lb", "5,001–10,000 lb"],
    bases: ["Billable weight", "Actual weight", "Pallet count"],
  },
  flat_rate: {
    appliesWhen: ["All shipments", "LTL shipments", "FTL shipments"],
    tiers: ["Base charge"],
    bases: ["Per shipment", "Per truck", "Per stop"],
  },
};
const billingRecords = prototypeRepository.getBillingRecords();
const basePartners = prototypeRepository.getPartners();
const demoIssueIds = new Set(
  fixture.scenarioPresets.find((preset) => preset.presetId === "combined_demo").issueIds,
);
const demoIssues = fixture.reviewIssues.filter((issue) => demoIssueIds.has(issue.issueId));
const issueFieldLabels = {
  "equipmentRequirements[0].type": "Equipment Type",
  "shipper.timeWindow": "Pickup Time Window",
  "cargoLines[0].handlingUnitCount": "Handling Unit Count",
  instructions: "Remark",
  "cargoLines[0].commodityDescription": "Commodity Description",
};
const jobFieldGroupIds = ["overview", "shipper", "consignees", "services", "assignment", "commercial"];
const selectOptions = (values) => values.map((value) => ({ value, label: value }));
const serviceTypeOptions = selectOptions(["LTL", "FTL"]);
const freightTermOptions = selectOptions(["Prepaid", "Collect", "Third Party"]);
const yesNoOptions = selectOptions(["Yes", "No"]);
const equipmentTypeOptions = [
  "Van / Dry Van (V)",
  "Reefer (R)",
  "Flatbed (F)",
  "Straight Box Truck (SB)",
  "Sprinter / Cargo Van",
  "Container (C)",
  "Step Deck (SD)",
  "Power Only (PO)",
];
const serviceRequirementOptions = [
  "Appointment · pickup",
  "Appointment · delivery",
  "Liftgate · pickup",
  "Liftgate · delivery",
  "Residential · pickup",
  "Residential · delivery",
  "Notify · consignee",
  "Docs · delivery",
  "Load to Ride · shipment",
];

const pricingRuleSourceLabels = {
  LIFTGATE: "Liftgate delivery",
  RESIDENTIAL: "Residential delivery",
  APPOINTMENT: "Delivery appointment",
  HIGH_VALUE: "High-value handling",
  COLD_CHAIN: "Refrigerated service",
  DETENTION: "Detention",
};

const formatPricingSource = (source) => {
  const ruleCodeMatch = source?.match(/^([A-Z][A-Z_]*) rule$/);
  if (!ruleCodeMatch) return source;
  return `${pricingRuleSourceLabels[ruleCodeMatch[1]] || "Configured service"} rule`;
};

const emptyPartnerDraft = { partnerId: null, name: "", type: "customer", contactName: "", email: "", mobile: "", phone: "" };
const createEmptyShipmentFieldValues = () => ({
  __startMode: "scratch",
  "overview.customer": "",
  "overview.transportMode": "Trucking",
  "overview.serviceType": "",
  "equipmentRequirements[0].type": "",
  "identifiers.customerPONumber": "",
  "serviceRequirements[]": [],
  instructions: "",
  "carrierAssignment.carrier": "",
  "carrierAssignment.quoteReference": "",
  "carrierAssignment.proNumber": "",
  "carrierAssignment.pickupLotNumber": "",
  "carrierAssignment.carrierPickupNumber": "",
  "carrierAssignment.originTerminal": "",
  "carrierAssignment.originTerminalPhone": "",
  "carrierAssignment.destinationTerminal": "",
  "carrierAssignment.destinationTerminalPhone": "",
  "commercial.freightTerms": "",
  "commercial.billTo": "",
  routeStops: [
    { stopId: "MANUAL-PICKUP", activity: "Pickup", company: "", address: "", contact: "", timeWindow: "" },
    { stopId: "MANUAL-DELIVERY", activity: "Delivery", company: "", address: "", contact: "", timeWindow: "" },
  ],
  cargoLines: [{
    lineId: "MANUAL-CARGO-1",
    handlingUnitType: "",
    handlingUnitCount: "",
    packageType: "",
    packagePieceCount: "",
    commodityDescription: "",
    weight: { value: "", unit: "lb" },
    dimensions: { displayValue: "", unit: "in" },
    freightClass: "",
    nmfc: "",
    hazmat: null,
    stackable: null,
    turnable: null,
    deliveryStopId: "MANUAL-DELIVERY",
  }],
});

const demoFeatureFlags = Object.freeze({
  // Awaiting customer reporting samples, dimensions, and formulas.
  // See the Discovery Log before re-enabling this module in the demo.
  reports: false,
});

const moduleConfig = {
  shipments: {
    label: "Shipments",
    icon: ClipboardList,
    defaultChild: "shipments-trucking",
    children: [
      { key: "shipments-ocean", label: "Ocean", title: "Ocean", icon: Ship },
      { key: "shipments-air", label: "Air", title: "Air", icon: Plane },
      { key: "shipments-trucking", label: "Trucking", title: "Trucking", icon: Truck },
    ],
  },
  quotations: {
    label: "Quotations",
    title: "Quotations",
    icon: FilePenLine,
  },
  billing: {
    label: "Billing & Accounting",
    title: "Billing & Accounting",
    icon: CircleDollarSign,
  },
  reports: {
    label: "Reports",
    title: "Reports",
    icon: LayoutList,
  },
  customers: {
    label: "Customers",
    title: "Customers",
    icon: UsersRound,
  },
  carriers: {
    label: "Carriers",
    title: "Carriers",
    icon: Warehouse,
  },
};

const visibleModuleConfig = Object.fromEntries(
  Object.entries(moduleConfig).filter(
    ([moduleKey]) => moduleKey !== "reports" || demoFeatureFlags.reports,
  ),
);

const shipmentPageConfig = Object.fromEntries(moduleConfig.shipments.children.map((item) => [item.key, item]));
const shipmentModeByModule = {
  "shipments-trucking": "TRUCKING",
  "shipments-ocean": "OCEAN",
  "shipments-air": "AIR",
};
const isShipmentModuleKey = (key) => Object.hasOwn(shipmentModeByModule, key);
const statusLabels = {
  in_review: "In review",
  confirmed: "Confirmed",
  awaiting_assignment: "Awaiting assignment",
  completed: "Completed",
  draft: "Draft",
  accepted: "Accepted",
  active: "Active",
  expired: "Expired",
  estimated: "Estimated",
  final: "Final",
  sent: "Sent",
  not_ready: "Not ready",
  ready: "Ready",
  needs_review: "Needs review",
  customer_ar: "Customer AR",
  vendor_ap: "Vendor AP",
  candidate_blocker: "Candidate blocker",
  warning: "Warning",
  unresolved: "Unresolved",
  resolved: "Resolved",
  missing: "Missing",
  low_confidence: "Low confidence",
  conflict: "Source conflict",
  unmapped: "Unmapped information",
  manual_correction: "Manual correction",
  definition_required: "Definition required",
};

const billingTypeLabels = {
  customer_ar: "Bill-to (AR)",
  vendor_ap: "Pay-to (AP)",
};

const billingTypeAbbreviations = {
  customer_ar: "AR",
  vendor_ap: "AP",
};

const statusTone = {
  in_review: "amber",
  draft: "neutral",
  sent: "blue",
  accepted: "green",
  active: "green",
  expired: "neutral",
  estimated: "blue",
  final: "green",
  confirmed: "green",
  completed: "green",
  awaiting_assignment: "blue",
  not_ready: "neutral",
  ready: "green",
  candidate_blocker: "red",
  warning: "amber",
  unresolved: "amber",
  resolved: "green",
  missing: "red",
  low_confidence: "amber",
  conflict: "red",
  unmapped: "blue",
  definition_required: "neutral",
};

function formatStatus(status) {
  return statusLabels[status] || status?.replaceAll("_", " ") || "—";
}

function isConfirmedShipmentStatus(status) {
  return status === "confirmed";
}

function formatTransportMode(mode) {
  return { TRUCKING: "Trucking", OCEAN: "Ocean", AIR: "Air" }[mode] || mode || "—";
}

function nextDemoIdentifier(records, field, prefix) {
  const nextNumber = Math.max(0, ...records.map((record) => {
    const match = String(record[field] || "").match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  })) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function shipmentListStatus(status) {
  return status === "confirmed" || status === "completed" ? "confirmed" : "draft";
}

function formatDate(value) {
  if (!value) return "—";
  const source = String(value);
  const isoDate = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoDate) return `${isoDate[1]}/${isoDate[2]}/${isoDate[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return source;
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((candidate) => candidate.type === type)?.value;
  return `${part("year")}/${part("month")}/${part("day")}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const source = String(value);
  const isoDateTime = source.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoDateTime) return `${isoDateTime[1]}/${isoDateTime[2]}/${isoDateTime[3]} ${isoDateTime[4]}:${isoDateTime[5]}`;
  return formatDate(value);
}

function formatFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
}

function calculateCargoTotals(cargoLines = [], handlingUnitValueForLine = (line) => line.handlingUnitCount) {
  return cargoLines.reduce((totals, line) => ({
    totalWeight: totals.totalWeight + Number(line.weight?.value || 0),
    totalHandlingUnits: totals.totalHandlingUnits + Number(handlingUnitValueForLine(line) || 0),
    totalPackagesPieces: totals.totalPackagesPieces + Number(line.packagePieceCount || 0),
  }), { totalWeight: 0, totalHandlingUnits: 0, totalPackagesPieces: 0 });
}

function buildShipmentBolDocuments(shipment, fieldValues = {}) {
  if (!shipment) return [];
  const routeLocations = (shipment.route || "").split(" → ").filter(Boolean);
  const origin = routeLocations[0] || "Origin facility";
  const deliveryLocations = routeLocations.slice(1);
  const defaultStops = shipment.shipmentId === fixture.fixtureId && Array.isArray(fixture.jobDraft.routeStops)
    ? fixture.jobDraft.routeStops
    : [
        { stopId: `${shipment.shipmentId}-PICKUP`, activity: "Pickup", company: origin, address: origin },
        ...(deliveryLocations.length ? deliveryLocations : [shipment.customer]).map((location, index) => ({
          stopId: `${shipment.shipmentId}-DELIVERY-${index + 1}`,
          activity: "Delivery",
          company: index === deliveryLocations.length - 1 ? shipment.customer : location,
          address: location,
        })),
      ];
  const routeStops = Array.isArray(fieldValues.routeStops) && fieldValues.routeStops.length ? fieldValues.routeStops : defaultStops;
  const cargoLines = Array.isArray(fieldValues.cargoLines) && fieldValues.cargoLines.length ? fieldValues.cargoLines : fixture.jobDraft.cargoLines;
  const bolStops = routeStops.filter((stop) => stop.activity === "Delivery");

  return bolStops.map((stop, index) => {
    const assignedCargoLines = cargoLines.filter((line) => line.deliveryStopId === stop.stopId);
    return {
      ...stop,
      stopIndex: routeStops.findIndex((candidate) => candidate.stopId === stop.stopId),
      bolNumber: shipment.bolNumber ? `${shipment.bolNumber}-${String(index + 1).padStart(2, "0")}` : null,
      cargoLines: assignedCargoLines.length || bolStops.length > 1 ? assignedCargoLines : cargoLines.slice(0, 1),
    };
  });
}

function formatBolCount(count) {
  return `${count} ${count === 1 ? "BOL" : "BOLs"}`;
}

function formatMoney(value, currency = "USD") {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoneyWithCents(value, currency = "USD") {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getChargeLineQuantity(line) {
  const quantity = Number(line?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getChargeLineUnit(line) {
  if (line?.unit) return String(line.unit);
  if (line?.templateKey === "per_unit") return "UNIT";
  if (line?.code?.includes("FTL") || /truck/i.test(line?.description || "")) return "TRUCK";
  return "SHIPMENT";
}

function formatPricingUnit(unit) {
  const value = String(unit || "").trim();
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}` : "";
}

function getChargeLineUnitPrice(line) {
  if (line?.unitPrice !== null && line?.unitPrice !== undefined) return Number(line.unitPrice) || 0;
  if (line?.rate !== null && line?.rate !== undefined) return Number(line.rate) || 0;
  return (Number(line?.amount) || 0) / getChargeLineQuantity(line);
}

function getChargeLineAmount(line) {
  return getChargeLineQuantity(line) * getChargeLineUnitPrice(line);
}

function sumChargeLines(result, adjustments = []) {
  return (result?.chargeLines || []).reduce((sum, line) => sum + getChargeLineAmount(line), 0)
    + adjustments.reduce((sum, adjustment) => sum + getChargeLineAmount(adjustment), 0);
}

function applyQuotationPlan(pricingResult, ratePlan) {
  if (!pricingResult || !ratePlan) return pricingResult;
  const rateLane = pricingResult.inputs?.find((input) => input.label === "Rate lane")?.value;
  const billableWeightText = pricingResult.inputs?.find((input) => input.label === "Billable weight")?.value || "";
  const billableWeight = Number(billableWeightText.replace(/[^\d.]/g, ""));
  const matchingMatrixRule = ratePlan.rateMatrix?.find((rule) => {
    if (rateLane && rule.lane !== rateLane) return false;
    const bounds = rule.tier?.match(/[\d,]+/g)?.map((value) => Number(value.replaceAll(",", ""))) || [];
    return !billableWeight || bounds.length < 2 || (billableWeight >= bounds[0] && billableWeight <= bounds[1]);
  }) || ratePlan.rateMatrix?.[0];
  const baseAmount = matchingMatrixRule?.rate;

  return {
    ...pricingResult,
    ratePlanId: ratePlan.quoteId,
    currency: ratePlan.currency || pricingResult.currency,
    chargeLines: pricingResult.chargeLines.map((line) => {
      if (line.code.startsWith("BASE_") && baseAmount !== undefined) {
        return { ...line, amount: baseAmount, source: matchingMatrixRule.tier || matchingMatrixRule.basis || line.source };
      }
      const surcharge = ratePlan.surchargeRules?.find((rule) => rule.code === line.code);
      if (!surcharge) return line;
      return {
        ...line,
        quantity: 1,
        unit: surcharge.billingUnit || "SHIPMENT",
        unitPrice: surcharge.rate,
        amount: surcharge.rate,
        source: surcharge.templateLabel || "Per unit",
        templateKey: "per_unit",
      };
    }),
  };
}

function applyVendorRatePlan(pricingResult, vendorRatePlan) {
  if (!pricingResult || !vendorRatePlan) return pricingResult;
  return {
    ...pricingResult,
    vendorCost: {
      ...pricingResult.vendorCost,
      ...vendorRatePlan,
    },
  };
}

function createPricingResultFromRatePlan(shipment, ratePlan) {
  if (!shipment || !ratePlan) return null;
  const baseRule = ratePlan.rateMatrix?.[0];
  const baseAmount = Number(baseRule?.rate) || 0;
  const fixedSurcharges = (ratePlan.surchargeRules || []).filter((rule) => rule.unit !== "percent");
  return {
    ratePlanId: ratePlan.quoteId,
    currency: ratePlan.currency || "USD",
    calculationStatus: "estimated",
    inputs: [
      { label: "Actual weight", value: "Pending actuals" },
      { label: "Billable weight", value: baseRule?.tier || "Pending actuals" },
      { label: "Rate lane", value: baseRule?.lane || ratePlan.serviceScope },
    ],
    chargeLines: [
      ...(baseRule ? [{
        code: `BASE_${shipment.serviceType || "FREIGHT"}`,
        description: `Base ${shipment.serviceType || "freight"} charge`,
        source: baseRule.tier || baseRule.basis || "Configured rate",
        templateKey: baseRule.basis === "Per truck" ? "flat_rate" : "zone_tier_matrix",
        serviceGroup: "Trucking",
        amount: baseAmount,
      }] : []),
      ...fixedSurcharges.map((rule) => ({
        code: rule.code,
        description: rule.name,
        source: rule.templateLabel || "Per unit",
        templateKey: "per_unit",
        serviceGroup: "Trucking",
        quantity: 1,
        unit: rule.billingUnit || "SHIPMENT",
        unitPrice: Number(rule.rate) || 0,
        amount: Number(rule.rate) || 0,
      })),
    ],
    vendorCost: {
      currency: ratePlan.currency || "USD",
      calculationStatus: "estimated",
      chargeLines: [],
      initialAdjustments: [],
    },
  };
}

function getBillingReportRecords(filters) {
  return billingRecords.filter((record) => {
    const reportDate = record.billingDate;
    const matchesDate = reportDate && (!filters.dateFrom || reportDate >= filters.dateFrom) && (!filters.dateTo || reportDate <= filters.dateTo);
    const matchesType = filters.billingType === "all" || record.billingType === filters.billingType;
    return matchesDate && matchesType;
  });
}

function StatusBadge({ status, children }) {
  const tone = { green: "success", amber: "warning", red: "error", blue: "primary", purple: "billing", neutral: "neutral" }[statusTone[status] || "neutral"];
  return <StatusChip label={children || formatStatus(status)} tone={tone} />;
}

function getShipmentHistoryItems(shipment) {
  const createdDate = formatDate(shipment.createdDate || shipment.lastUpdated?.slice(0, 10) || shipment.pickupDate);
  const items = [{
    id: "created",
    title: "Shipment created",
    description: "Shipment record was created.",
    actor: "Demo user",
    occurredAt: `${createdDate} 09:00`,
  }];
  const confirmed = isConfirmedShipmentStatus(shipment.listStatus);
  if (confirmed) {
    items.unshift({
      id: "confirmed",
      title: "Shipment confirmed",
      description: "Shipment details were confirmed for downstream processing.",
      actor: "Demo user",
      occurredAt: formatDateTime(shipment.lastUpdated),
    });
  } else {
    items.unshift({
      id: "updated",
      title: "Draft updated",
      description: "Shipment details were updated.",
      actor: "Demo user",
      occurredAt: formatDateTime(shipment.lastUpdated),
    });
  }
  return items;
}

function ShipmentHistoryControl({ shipment }) {
  const [anchorEl, setAnchorEl] = useState(null);
  useEffect(() => { setAnchorEl(null); }, [shipment.shipmentId]);
  const historyItems = getShipmentHistoryItems(shipment);
  return (
    <>
      <span className="case-stage-control">
        <Tooltip title="Shipment history" placement="top">
          <IconButton
            className="case-stage-trigger"
            aria-label={`Open shipment history. Current status: ${formatStatus(shipment.listStatus)}`}
            aria-haspopup="dialog"
            aria-expanded={Boolean(anchorEl)}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <History size={20} strokeWidth={2.25} aria-hidden="true" />
          </IconButton>
        </Tooltip>
      </span>
      <Popover
        className="shipment-history-popover"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { "aria-label": "Shipment history", role: "dialog" } }}
      >
        <div className="shipment-history-panel">
          <header className="shipment-history-heading">
            <div>
              <h2>Shipment history</h2>
              <span>{shipment.shipmentId}</span>
            </div>
            <Tooltip title="Close" placement="left">
              <IconButton className="shipment-history-close" aria-label="Close shipment history" onClick={() => setAnchorEl(null)}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </Tooltip>
          </header>
          <ol className="shipment-history-list" aria-label="Shipment history events">
            {historyItems.map((item, index) => (
              <li className={`shipment-history-item ${index === 0 ? "is-latest" : ""}`} key={item.id}>
                <span className="shipment-history-marker" aria-hidden="true" />
                <div className="shipment-history-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <span>{item.actor} · {item.occurredAt}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Popover>
    </>
  );
}

function ShipmentProgressControl({ shipment, onChange }) {
  return <QuotationStatusSelect value={shipment.listStatus} onChange={onChange} ariaLabel="Shipment status" options={shipmentStatusOptions} />;
}

function BillingTypeChip({ value }) {
  return <StatusChip label={billingTypeAbbreviations[value] || formatStatus(value)} tone={value === "customer_ar" ? "primary" : "warning"} />;
}

const customerQuotationStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
];

const carrierRateStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
];

const shipmentStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
];

function QuotationStatusSelect({ value, onChange, ariaLabel = "Quote plan status", options = customerQuotationStatusOptions }) {
  return (
    <Select
      className="quotation-status-select"
      data-status={value}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputProps={{ "aria-label": ariaLabel }}
      renderValue={(status) => formatStatus(status)}
      MenuProps={{ MenuListProps: { "aria-label": `${ariaLabel} options` } }}
    >
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </Select>
  );
}

function DetailPageFrame({ title, meta, onClose, children, footer, size = "wide", ...detailProps }) {
  return (
    <DetailPage title={title} meta={meta} onBack={onClose} footer={footer} size={size} {...detailProps}>
      {children}
    </DetailPage>
  );
}

function OverviewTab({ shipment, representative, pricingResult, ratePlan, ratePlanOptions, selectedRatePlanId, onRatePlanChange, vendorRatePlanOptions, selectedVendorRatePlanId, onVendorRatePlanChange, adjustments, onAddAdjustment, onOpenRatePlan, onOpenVendorRatePlan }) {
  if (!representative) {
    return (
      <div className="panel-stack">
        <section className="ledger-section">
          <h3>Shipment Overview</h3>
          <dl className="definition-grid">
            <div><dt>Customer</dt><dd>{shipment.customer}</dd></div>
            <div><dt>Transport mode</dt><dd>{formatTransportMode(shipment.transportMode)}</dd></div>
            <div><dt>Service type</dt><dd>{shipment.serviceType}</dd></div>
            <div><dt>Pickup date</dt><dd>{formatDate(shipment.pickupDate, { withYear: true })}</dd></div>
            <div className="span-two"><dt>Route</dt><dd>{shipment.route}</dd></div>
          </dl>
        </section>
        <ShipmentPricingSection shipment={shipment} pricingResult={pricingResult} ratePlan={ratePlan} ratePlanOptions={ratePlanOptions} selectedRatePlanId={selectedRatePlanId} onRatePlanChange={onRatePlanChange} vendorRatePlanOptions={vendorRatePlanOptions} selectedVendorRatePlanId={selectedVendorRatePlanId} onVendorRatePlanChange={onVendorRatePlanChange} adjustments={adjustments} onAddAdjustment={onAddAdjustment} onOpenRatePlan={onOpenRatePlan} onOpenVendorRatePlan={onOpenVendorRatePlan} />
      </div>
    );
  }

  const job = fixture.jobDraft;
  return (
    <div className="panel-stack">
      <section className="ledger-section">
        <div className="section-heading">
          <h3>Job Overview</h3>
          <StatusBadge status={shipmentListStatus(job.overview.status)} />
        </div>
        <dl className="definition-grid">
          <div><dt>Customer PO</dt><dd>{job.identifiers.customerPONumber}</dd></div>
          <div><dt>Reference</dt><dd>{job.identifiers.referenceNumber}</dd></div>
          <div><dt>Transport mode</dt><dd>{formatTransportMode(job.overview.transportMode)}</dd></div>
          <div><dt>Service type</dt><dd>{job.overview.serviceType}</dd></div>
          <div><dt>Equipment type</dt><dd className="value-missing">Missing · review required</dd></div>
        </dl>
      </section>

      <section className="ledger-section">
        <h3>Route & Appointment</h3>
        <div className="route-ledger">
          <div className="route-stop">
            <span className="route-marker">P</span>
            <div>
              <strong>{job.shipper.company}</strong>
              <span>{job.shipper.address}</span>
              <small>{formatTimeWindow(job.shipper.timeWindow)}</small>
            </div>
          </div>
          <div className="route-line" />
          <div className="route-stop">
            <span className="route-marker">D</span>
            <div>
              <strong>{job.consignee.company}</strong>
              <span>{job.consignee.address}</span>
              <small>{formatTimeWindow(job.consignee.timeWindow)}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="ledger-section">
        <h3>Cargo & Services</h3>
        <div className="summary-strip">
          <div><PackageCheck size={17} /><span><strong>8</strong> pallets</span></div>
          <div><FileOutput size={17} /><span><strong>120</strong> cartons</span></div>
          <div><Weight size={17} /><span><strong>2,450</strong> lb</span></div>
        </div>
        <p className="ledger-note">Liftgate at delivery · Notify consignee · Freight terms: Third Party</p>
      </section>
    </div>
  );
}

function ShipmentPricingSection({ shipment, pricingResult, ratePlan, ratePlanOptions = [], selectedRatePlanId, onRatePlanChange, vendorRatePlanOptions = [], selectedVendorRatePlanId, onVendorRatePlanChange, adjustments = { customer: [], vendor: [] }, pricingLineOverrides = { customer: {}, vendor: {} }, onUpdatePricingLine, onAddAdjustment, onUpdateAdjustment, onRemoveAdjustment, onOpenRatePlan, onOpenVendorRatePlan, editing = false, actorLabel = "Demo user", showRatePlanControls = true }) {
  const [adjustmentSide, setAdjustmentSide] = useState("customer");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState({ description: "", unit: "SHIPMENT", unitPrice: "", note: "" });
  const currency = pricingResult?.currency || "USD";
  const customerAdjustments = adjustments.customer || [];
  const vendorAdjustments = adjustments.vendor || [];
  const displayedVendorRatePlanId = vendorRatePlanOptions.some((option) => option.ratePlanId === selectedVendorRatePlanId)
    ? selectedVendorRatePlanId
    : vendorRatePlanOptions[0]?.ratePlanId || "";
  const formatLedgerMoney = (value) => Number.isInteger(Number(value)) ? formatMoney(value, currency) : formatMoneyWithCents(value, currency);
  const buildLedgerLines = (side, result, planId) => (result?.chargeLines || []).map((line, index) => {
    const lineKey = `${planId || "manual"}:${line.code}:${index}`;
    const override = pricingLineOverrides[side]?.[lineKey] || {};
    if (override.deleted) return null;
    const quantity = getChargeLineQuantity(line);
    const unit = Object.prototype.hasOwnProperty.call(override, "unit") ? override.unit : getChargeLineUnit(line);
    const unitPrice = Object.prototype.hasOwnProperty.call(override, "unitPrice") ? override.unitPrice : getChargeLineUnitPrice(line);
    return { ...line, lineKey, quantity, unit, unitPrice, amount: quantity * (Number(unitPrice) || 0) };
  }).filter(Boolean);
  const customerLines = buildLedgerLines("customer", pricingResult, ratePlan?.quoteId);
  const vendorLines = buildLedgerLines("vendor", pricingResult?.vendorCost, pricingResult?.vendorCost?.ratePlanId);
  const customerTotal = sumChargeLines({ chargeLines: customerLines }, customerAdjustments);
  const vendorTotal = sumChargeLines({ chargeLines: vendorLines }, vendorAdjustments);
  const canSaveAdjustment = adjustmentDraft.description.trim() && adjustmentDraft.unit.trim() && Number(adjustmentDraft.unitPrice) !== 0;
  const openAdjustment = (side) => {
    setAdjustmentSide(side);
    setAdjustmentOpen(true);
  };
  const closeAdjustment = () => {
    setAdjustmentOpen(false);
    setAdjustmentDraft({ description: "", unit: "SHIPMENT", unitPrice: "", note: "" });
  };
  const saveAdjustment = () => {
    if (!canSaveAdjustment) return;
    onAddAdjustment?.(adjustmentSide, {
      adjustmentId: `ADJ-DEMO-${Date.now()}`,
      description: adjustmentDraft.description.trim(),
      quantity: 1,
      unit: adjustmentDraft.unit.trim().toUpperCase(),
      unitPrice: Number(adjustmentDraft.unitPrice),
      amount: Number(adjustmentDraft.unitPrice),
      note: adjustmentDraft.note.trim() || "No note provided.",
      addedBy: actorLabel,
      addedAt: new Date().toISOString(),
    });
    closeAdjustment();
  };

  if (!pricingResult || !ratePlan) {
    return (
      <section className="ledger-section pricing-section">
        <div className="section-heading"><h2>Charges</h2><StatusChip label="Rate plan required" tone="warning" /></div>
        <div className="rate-plan-required-state">
          <div className="notice notice-neutral"><Info size={17} /><div><strong>No matching Customer Quote</strong><span>Choose an available plan below. Plans can be selected before shipment submission.</span></div></div>
          <div className="rate-plan-required-controls">
            <div className="rate-plan-required-control">
              <span>Customer Quote</span>
              <FormControl size="small" fullWidth>
                <Select
                  displayEmpty
                  value={selectedRatePlanId || ""}
                  onChange={(event) => onRatePlanChange?.(event.target.value)}
                  inputProps={{ "aria-label": "Select customer quotation" }}
                  renderValue={(value) => value ? ratePlanOptions.find((option) => option.quoteId === value)?.name : "Select rate plan"}
                >
                  <MenuItem value="" disabled>Select rate plan</MenuItem>
                  {ratePlanOptions.map((option) => <MenuItem key={option.quoteId} value={option.quoteId}>{option.name} · v{option.version}</MenuItem>)}
                </Select>
              </FormControl>
              <small>{ratePlanOptions.length ? `${ratePlanOptions.length} accepted ${ratePlanOptions.length === 1 ? "quotation" : "quotations"} match ${shipment.customer}.` : `No accepted quotation matches ${shipment.customer}.`}</small>
            </div>
            <div className="rate-plan-required-control">
              <span>Carrier Rate</span>
              <FormControl size="small" fullWidth>
                <Select
                  value={displayedVendorRatePlanId}
                  onChange={(event) => onVendorRatePlanChange?.(event.target.value)}
                  inputProps={{ "aria-label": "Select carrier rate" }}
                  renderValue={(value) => vendorRatePlanOptions.find((option) => option.ratePlanId === value)?.name}
                >
                  {vendorRatePlanOptions.map((option) => <MenuItem key={option.ratePlanId} value={option.ratePlanId}>{option.name} · v{option.version} · {option.counterparty}</MenuItem>)}
                </Select>
              </FormControl>
              <small>{vendorRatePlanOptions.length ? "Matched to the shipment service and assigned carrier." : "Select a carrier in Assignment to match its accepted rate."}</small>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const ledgers = [
    { key: "customer", title: "Customer Charge", description: "Accounts receivable and customer revenue.", result: pricingResult, plan: ratePlan, lines: customerLines, adjustments: customerAdjustments, total: customerTotal },
    { key: "vendor", title: "Vendor Cost", description: "Accounts payable and carrier cost.", result: pricingResult.vendorCost, plan: pricingResult.vendorCost, lines: vendorLines, adjustments: vendorAdjustments, total: vendorTotal },
  ];

  return (
    <section className="ledger-section pricing-section" aria-label="Shipment charges">
      <div className="billing-ledger-stack">
        {ledgers.map((ledger) => (
          <section className="billing-ledger-block" key={ledger.key} aria-labelledby={`${ledger.key}-ledger-heading`}>
            <div className="billing-ledger-heading">
              <div className="billing-ledger-title">
                <h3 id={`${ledger.key}-ledger-heading`}>{ledger.title}</h3>
                <p>{ledger.description}</p>
              </div>
              {showRatePlanControls ? ledger.key === "customer" ? editing ? (
                <div className="ledger-rate-plan-control is-editing">
                  <span className="ledger-rate-plan-label">Customer Quote</span>
                  <FormControl size="small">
                    <Select
                      value={selectedRatePlanId || ratePlan.quoteId}
                      onChange={(event) => onRatePlanChange?.(event.target.value)}
                      inputProps={{ "aria-label": "Applied customer quotation" }}
                      MenuProps={{ MenuListProps: { "aria-label": "Applicable customer quotations" } }}
                    >
                      {ratePlanOptions.map((option) => <MenuItem key={option.quoteId} value={option.quoteId}>{option.name} · v{option.version}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Tooltip title="View quotation plan" placement="top">
                    <IconButton size="small" aria-label={`View quotation plan ${ratePlan.quoteId}`} onClick={() => onOpenRatePlan(ratePlan.quoteId)}>
                      <ArrowUpRight size={15} />
                    </IconButton>
                  </Tooltip>
                </div>
              ) : (
                <div className="ledger-rate-plan-control is-view">
                  <span className="ledger-rate-plan-label">Customer Quote</span>
                  <button type="button" className="ledger-rate-plan-link" onClick={() => onOpenRatePlan(ratePlan.quoteId)}>
                    <span>{ratePlan.name} · v{ratePlan.version}</span><ArrowUpRight size={15} />
                  </button>
                </div>
              ) : editing ? (
                <div className="ledger-rate-plan-control ledger-vendor-rate-plan-control is-editing">
                  <span className="ledger-rate-plan-label">Carrier Rate</span>
                  <FormControl size="small">
                    <Select
                      value={displayedVendorRatePlanId}
                      onChange={(event) => onVendorRatePlanChange?.(event.target.value)}
                      inputProps={{ "aria-label": "Applied carrier rate" }}
                      MenuProps={{ MenuListProps: { "aria-label": "Applicable carrier rates" } }}
                      renderValue={(value) => vendorRatePlanOptions.find((option) => option.ratePlanId === value)?.name}
                    >
                      {vendorRatePlanOptions.map((option) => <MenuItem key={option.ratePlanId} value={option.ratePlanId}>{option.name} · v{option.version} · {option.counterparty}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Tooltip title="View carrier rate" placement="top">
                    <IconButton disabled={!ledger.plan?.ratePlanId} size="small" aria-label="View selected carrier rate" onClick={() => onOpenVendorRatePlan?.(ledger.plan.ratePlanId)}>
                      <ArrowUpRight size={15} />
                    </IconButton>
                  </Tooltip>
                </div>
              ) : (
                <div className="ledger-rate-plan-control ledger-vendor-rate-plan-control is-view">
                  <span className="ledger-rate-plan-label">Carrier Rate</span>
                  <button type="button" className="ledger-rate-plan-link" disabled={!ledger.plan?.ratePlanId} onClick={() => onOpenVendorRatePlan?.(ledger.plan.ratePlanId)}>
                    <span>{ledger.plan?.name || "Carrier rate"}{ledger.plan?.version ? ` · v${ledger.plan.version}` : ""}</span><ArrowUpRight size={15} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className={editing ? "fee-breakdown is-editing" : "fee-breakdown"} role="table" aria-label={`${ledger.key} fee breakdown`}>
              <div className="fee-breakdown-head" role="row"><span role="columnheader">Fee item</span><span role="columnheader">Pricing details</span><span role="columnheader">Unit</span><span role="columnheader">Unit price</span></div>
              {ledger.lines.map((line) => {
                const template = ruleTemplates.find((item) => item.templateKey === line.templateKey);
                const templateLabel = template?.label || "Standard template";
                const pricingSource = (formatPricingSource(line.source) || "").trim();
                const hasDistinctPricingSource = pricingSource.trim().toLocaleLowerCase() !== templateLabel.trim().toLocaleLowerCase();
                return (
                  <div className={editing ? "fee-line-row is-editing" : "fee-line-row"} role="row" key={line.lineKey}>
                    <span role="cell"><strong>{line.description}</strong></span>
                    <span role="cell"><span className="fee-rule-template">{templateLabel}</span>{hasDistinctPricingSource ? <small>{pricingSource}</small> : null}</span>
                    <span className="fee-line-unit" role="cell">
                      {editing ? (
                        <TextInput
                          aria-label={`${ledger.title} ${line.description} unit`}
                          value={formatPricingUnit(line.unit)}
                          onChange={(event) => onUpdatePricingLine?.(ledger.key, line.lineKey, { unit: event.target.value.toUpperCase() })}
                        />
                      ) : <>{line.quantity !== 1 ? `${Number(line.quantity).toLocaleString("en-US")} × ` : ""}{formatPricingUnit(line.unit)}</>}
                    </span>
                    <span className={editing ? "fee-line-unit-price is-editing" : "fee-line-unit-price"} role="cell">
                      {editing ? (
                        <>
                          <TextInput
                            aria-label={`${ledger.title} ${line.description} unit price`}
                            type="number"
                            inputProps={{ step: 0.01 }}
                            value={line.unitPrice}
                            onChange={(event) => onUpdatePricingLine?.(ledger.key, line.lineKey, { unitPrice: event.target.value })}
                          />
                          <Tooltip title="Delete fee item" placement="top">
                            <IconButton size="small" color="error" aria-label={`Delete ${ledger.title} ${line.description}`} onClick={() => onUpdatePricingLine?.(ledger.key, line.lineKey, { deleted: true })}><Trash2 size={16} /></IconButton>
                          </Tooltip>
                        </>
                      ) : formatLedgerMoney(line.unitPrice)}
                    </span>
                  </div>
                );
              })}
              {ledger.adjustments.map((adjustment) => {
                const adjustmentUnit = getChargeLineUnit(adjustment);
                const adjustmentUnitPrice = getChargeLineUnitPrice(adjustment);
                return (
                <div className="fee-adjustment-row" role="row" key={adjustment.adjustmentId}>
                  <span role="cell"><strong>{adjustment.description}</strong><small>Manual adjustment</small></span>
                  <span role="cell">{adjustment.note}</span>
                  <span className="fee-line-unit" role="cell">
                    {editing ? (
                      <TextInput
                        aria-label={`${adjustment.description} unit`}
                        value={formatPricingUnit(adjustmentUnit)}
                        onChange={(event) => onUpdateAdjustment?.(ledger.key, adjustment.adjustmentId, { unit: event.target.value.toUpperCase() })}
                      />
                    ) : formatPricingUnit(adjustmentUnit)}
                  </span>
                  <span className="fee-adjustment-amount" role="cell">
                    {editing ? (
                      <TextInput
                        aria-label={`${adjustment.description} unit price`}
                        type="number"
                        inputProps={{ step: 0.01 }}
                        value={adjustmentUnitPrice}
                        onChange={(event) => onUpdateAdjustment?.(ledger.key, adjustment.adjustmentId, { unitPrice: event.target.value, amount: Number(event.target.value) })}
                      />
                    ) : <span>{formatLedgerMoney(adjustmentUnitPrice)}</span>}
                    {editing ? (
                      <Tooltip title="Remove adjustment" placement="top">
                        <IconButton size="small" color="error" aria-label={`Remove ${adjustment.description}`} onClick={() => onRemoveAdjustment?.(ledger.key, adjustment.adjustmentId)}><Trash2 size={16} /></IconButton>
                      </Tooltip>
                    ) : null}
                  </span>
                </div>
                );
              })}
            </div>
            {editing ? (
              <div className="fee-breakdown-toolbar">
                <Button size="small" variant="outlined" startIcon={<Plus size={16} />} onClick={() => openAdjustment(ledger.key)}>Add adjustment</Button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <Dialog open={adjustmentOpen} onClose={closeAdjustment} maxWidth="sm" fullWidth aria-labelledby="add-adjustment-title">
        <DialogTitle id="add-adjustment-title">Add {adjustmentSide === "customer" ? "Customer Charge" : "Vendor Cost"} Adjustment</DialogTitle>
        <DialogContent>
          <div className="adjustment-form">
            <TextInput aria-label="Fee item" label="Fee item" required value={adjustmentDraft.description} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Example: Detention" />
            <TextInput aria-label="Unit" label="Unit" required value={adjustmentDraft.unit} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, unit: event.target.value.toUpperCase() }))} placeholder="Example: SHIPMENT" />
            <TextInput aria-label={`Unit price (${currency})`} label={`Unit price (${currency})`} required type="number" inputProps={{ step: 0.01 }} value={adjustmentDraft.unitPrice} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="0" helperText="Use a negative unit price for a credit." />
            <TextInput aria-label="Reason and note" label="Reason and note" multiline minRows={3} value={adjustmentDraft.note} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Describe the operational exception and evidence." />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}><Button variant="outlined" color="secondary" onClick={closeAdjustment}>Cancel</Button><Button variant="contained" disabled={!canSaveAdjustment} onClick={saveAdjustment}>Add adjustment</Button></DialogActions>
      </Dialog>
    </section>
  );
}

function formatTimeWindow(timeWindow) {
  if (!timeWindow?.start || !timeWindow?.end) return null;
  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeWindow.timeZone,
  });
  const start = timeFormat.format(new Date(timeWindow.start));
  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeWindow.timeZone,
    timeZoneName: "short",
  }).format(new Date(timeWindow.end));
  return `${formatDate(timeWindow.start)} · ${start}–${end}`;
}

function splitRouteStopTimeWindow(timeWindow = "") {
  const [date = "", ...timeParts] = String(timeWindow).split(" · ");
  return { date: date.trim(), timeRange: timeParts.join(" · ").trim() };
}

function joinRouteStopTimeWindow(date, timeRange) {
  return [date, timeRange].filter((value) => String(value || "").trim()).join(" · ");
}

function toEnglishDateInputValue(value = "") {
  const match = String(value).trim().match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : String(value);
}

function fromEnglishDateInputValue(value = "") {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}/${match[1]}/${match[2]}` : String(value);
}

function toTimeInputValue(value = "", inheritedMeridiem = "") {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = (match[3] || inheritedMeridiem).toUpperCase();
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function splitTimeRangeValue(value = "") {
  const trimmedValue = String(value).trim();
  const timeZoneMatch = trimmedValue.match(/\s([A-Z]{2,5})$/);
  const timeZone = timeZoneMatch?.[1] || "";
  const timeRange = timeZone ? trimmedValue.slice(0, -timeZoneMatch[0].length).trim() : trimmedValue;
  const [startValue = "", endValue = ""] = timeRange.split(/\s*[–—-]\s*/, 2);
  const endMeridiem = endValue.match(/\b(AM|PM)\b/i)?.[1] || "";
  return {
    start: toTimeInputValue(startValue, endMeridiem),
    end: toTimeInputValue(endValue),
    timeZone,
  };
}

function joinTimeRangeValue(start, end, timeZone = "") {
  const timeRange = [start, end].filter(Boolean).join("–");
  return [timeRange, timeZone].filter(Boolean).join(" ");
}

function fieldBlockerMessage(issue, field) {
  if (!issue) return "Review this field.";
  if (field.path === "equipmentRequirements[0].type") return "Select an equipment type.";
  if (field.path === "cargoLines[0].handlingUnitCount") return "Resolve the conflicting pallet counts.";
  if (issue.issueType === "missing") return `${field.label} is required.`;
  if (issue.issueType === "conflict") return `Resolve the conflicting ${field.label.toLowerCase()} values.`;
  return `Review ${field.label.toLowerCase()}.`;
}

function FieldRecord({ field, value, onChange, editing, issueState, showReviewIssues = true }) {
  const hasValue = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "";
  const isMultiline = field.path === "instructions";
  const issue = showReviewIssues ? demoIssues.find((candidate) => candidate.fieldPath === field.path) : null;
  const hasActiveIssue = Boolean(issue && issueState?.[issue.issueId]?.status !== "resolved");
  const hasActiveBlocker = hasActiveIssue && issue.severity === "candidate_blocker";
  const blockerMessage = hasActiveBlocker ? fieldBlockerMessage(issue, field) : field.tableCell ? undefined : " ";
  const sourceEvidence = field.sourceEvidence;
  const sourceActive = field.sourceActive;
  const sourceTrigger = sourceEvidence ? (
    <Tooltip title="View source" placement="top" enterDelay={350}>
      <button
        type="button"
        className="field-source-trigger"
        aria-label={`View source for ${field.label}`}
        aria-expanded={sourceActive}
        aria-controls="field-source-inspector"
        onClick={() => field.onOpenSource?.(field.path)}
      >
        <FileSearch size={15} />
      </button>
    </Tooltip>
  ) : null;
  if (!editing || field.displayOnly) {
    const displayValue = Array.isArray(value) ? value.join(", ") : value;
    return (
      <div
        className={`field-control field-control-view ${hasValue ? "" : "field-control-empty"} ${hasActiveBlocker ? "field-control-has-blocker" : ""} ${field.fullWidth || field.control === "timeWindow" ? "field-control-full" : ""} ${field.tableCell ? "field-control-table-cell" : ""} ${sourceEvidence ? "has-source" : ""} ${sourceActive ? "source-active" : ""} ${editing && field.displayOnly ? "field-control-display-only-edit" : ""}`}
        role="group"
        aria-label={`${field.label} field`}
      >
        {sourceTrigger}
        {!field.tableCell ? <span className="field-view-label">{field.label}</span> : null}
        <strong className={`field-view-value ${hasValue ? "" : "is-empty"}`}>{hasValue ? displayValue : "—"}</strong>
        {hasActiveBlocker ? <small className="field-view-blocker"><CircleAlert size={13} />{blockerMessage}</small> : field.displayNote ? <small className="field-view-context">{field.displayNote}</small> : null}
      </div>
    );
  }
  return (
    <div className={`field-control ${hasValue ? "" : "field-control-empty"} ${hasActiveBlocker ? "field-control-has-blocker" : ""} ${field.fullWidth || field.control === "timeWindow" ? "field-control-full" : ""} ${field.readOnly ? "field-control-readonly" : ""} ${field.tableCell ? "field-control-table-cell" : ""} ${sourceEvidence ? "has-source" : ""} ${sourceActive ? "source-active" : ""}`}>
      {sourceTrigger}
      {field.control === "timeWindow" ? (
        <Box className="best-form-control time-window-control">
          <FieldLabel>{field.label}</FieldLabel>
          <div className="time-window-control-fields">
            <TextInput
              type="text"
              placeholder="MM/DD/YYYY"
              inputProps={{ "aria-label": "Date", inputMode: "numeric", maxLength: 10, pattern: "(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/\\d{4}", autoComplete: "off" }}
              value={toEnglishDateInputValue(splitRouteStopTimeWindow(value).date)}
              onChange={(event) => {
                const timeWindow = splitRouteStopTimeWindow(value);
                onChange(joinRouteStopTimeWindow(fromEnglishDateInputValue(event.target.value), timeWindow.timeRange));
              }}
            />
            <TimeRangeInput
              startValue={splitTimeRangeValue(splitRouteStopTimeWindow(value).timeRange).start}
              endValue={splitTimeRangeValue(splitRouteStopTimeWindow(value).timeRange).end}
              onStartChange={(event) => {
                const timeWindow = splitRouteStopTimeWindow(value);
                const timeRange = splitTimeRangeValue(timeWindow.timeRange);
                onChange(joinRouteStopTimeWindow(timeWindow.date, joinTimeRangeValue(event.target.value, timeRange.end, timeRange.timeZone)));
              }}
              onEndChange={(event) => {
                const timeWindow = splitRouteStopTimeWindow(value);
                const timeRange = splitTimeRangeValue(timeWindow.timeRange);
                onChange(joinRouteStopTimeWindow(timeWindow.date, joinTimeRangeValue(timeRange.start, event.target.value, timeRange.timeZone)));
              }}
            />
          </div>
          {splitTimeRangeValue(splitRouteStopTimeWindow(value).timeRange).timeZone ? (
            <small className="time-window-time-zone">Time zone: {splitTimeRangeValue(splitRouteStopTimeWindow(value).timeRange).timeZone}</small>
          ) : null}
        </Box>
      ) : field.control === "radio" ? (
        <RadioInput
          label={field.tableCell ? undefined : field.label}
          value={value || ""}
          options={field.options}
          onChange={(event) => onChange(event.target.value)}
          error={hasActiveBlocker}
          helperText={blockerMessage}
        />
      ) : field.control === "select" ? (
        <SelectInput
          label={field.tableCell ? undefined : field.label}
          value={value || ""}
          options={field.options}
          placeholder={field.tableCell ? "Select" : "Please select"}
          onChange={(event) => onChange(event.target.value)}
          error={hasActiveBlocker}
          helperText={blockerMessage}
          inputProps={field.tableCell ? { "aria-label": field.label } : undefined}
        />
      ) : field.control === "autocomplete" ? (
        <AutocompleteInput
          label={field.tableCell ? undefined : field.label}
          value={value}
          options={field.options}
          multiple={field.multiple}
          freeSolo={field.freeSolo}
          error={hasActiveBlocker}
          placeholder="Please select"
          onChange={onChange}
          helperText={blockerMessage}
        />
      ) : (
        <TextInput
          label={field.tableCell ? undefined : field.label}
          aria-label={field.tableCell ? field.label : undefined}
          value={hasValue ? value : ""}
          placeholder={isMultiline ? "Please enter details" : "Please enter"}
          multiline={isMultiline}
          rows={isMultiline ? 4 : undefined}
          error={hasActiveBlocker}
          helperText={blockerMessage}
          inputProps={{ readOnly: field.readOnly }}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function FieldSourceInspector({ evidence, field, value, onClose, sources = [], shipment, browseAll = false, panelKey }) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const panelRef = useRef(null);
  const panelDragRef = useRef(null);
  const sourceById = Object.fromEntries([...fixture.sourceSet, ...sources].map((source) => [source.sourceId, source]));
  const panelSources = browseAll
    ? sources
    : (evidence?.sourceIds || []).map((sourceId) => sourceById[sourceId]).filter(Boolean);
  const panelAvailable = Boolean(panelSources.length && (browseAll || (evidence && field)));
  useEffect(() => {
    setActiveSourceIndex(0);
    setPanelOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setHasDragged(false);
    panelDragRef.current = null;
  }, [panelKey]);
  useEffect(() => {
    if (panelAvailable) return;
    setPanelOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setHasDragged(false);
    panelDragRef.current = null;
  }, [panelAvailable]);
  useEffect(() => {
    if (activeSourceIndex < panelSources.length) return;
    setActiveSourceIndex(Math.max(0, panelSources.length - 1));
  }, [activeSourceIndex, panelSources.length]);
  useEffect(() => {
    const resetPanelPosition = () => setPanelOffset({ x: 0, y: 0 });
    window.addEventListener("resize", resetPanelPosition);
    return () => window.removeEventListener("resize", resetPanelPosition);
  }, []);
  if (!panelAvailable) return null;
  const sourceKindLabel = (source) => source?.documentType === "customer_email" ? "Email" : source?.documentType === "cargo_details" ? "Excel" : source?.documentType === "image" ? "Image" : "PDF";
  const activeSource = panelSources[activeSourceIndex];
  const activeSourceId = activeSource?.sourceId;
  const moveSourcePage = (direction) => {
    setActiveSourceIndex((current) => Math.max(0, Math.min(panelSources.length - 1, current + direction)));
  };
  const startPanelDrag = (event) => {
    if (event.button !== 0 || !window.matchMedia("(min-width: 600px) and (max-width: 1319px)").matches) return;
    if (event.target.closest("button, a, input, select, textarea, nav, [role='button']")) return;
    const panel = panelRef.current;
    if (!panel) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panelDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: panel.getBoundingClientRect(),
      originOffset: panelOffset,
    };
    setIsDragging(true);
    setHasDragged(true);
  };
  const movePanel = (event) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextLeft = Math.max(0, Math.min(window.innerWidth - drag.startRect.width, drag.startRect.left + event.clientX - drag.startX));
    const nextTop = Math.max(0, Math.min(window.innerHeight - drag.startRect.height, drag.startRect.top + event.clientY - drag.startY));
    setPanelOffset({
      x: drag.originOffset.x + nextLeft - drag.startRect.left,
      y: drag.originOffset.y + nextTop - drag.startRect.top,
    });
  };
  const stopPanelDrag = (event) => {
    if (panelDragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panelDragRef.current = null;
    setIsDragging(false);
  };

  return (
    <aside
      ref={panelRef}
      className={`field-source-inspector ${isDragging ? "is-dragging" : ""} ${hasDragged ? "has-dragged" : ""}`}
      id="field-source-inspector"
      aria-label={browseAll ? "Sources" : `Source for ${field.label}`}
      style={{ "--source-panel-x": `${panelOffset.x}px`, "--source-panel-y": `${panelOffset.y}px` }}
    >
      <header
        className="field-source-inspector-header"
        onPointerDown={startPanelDrag}
        onPointerMove={movePanel}
        onPointerUp={stopPanelDrag}
        onPointerCancel={stopPanelDrag}
      >
        <div className="field-source-inspector-heading">
          {!browseAll ? <span>Source</span> : null}
          <h2>{browseAll ? "Sources" : field.label}</h2>
        </div>
        <div className="field-source-inspector-actions">
          {panelSources.length > 1 ? (
            <nav className="source-page-navigation" aria-label="Source pages">
              <Tooltip title="Previous source" placement="bottom">
                <span><IconButton aria-label="Previous source" disabled={activeSourceIndex === 0} onClick={() => moveSourcePage(-1)}><ChevronLeft size={17} /></IconButton></span>
              </Tooltip>
              <span className="source-page-count"><strong>{activeSourceIndex + 1}</strong> / {panelSources.length}</span>
              <Tooltip title="Next source" placement="bottom">
                <span><IconButton aria-label="Next source" disabled={activeSourceIndex === panelSources.length - 1} onClick={() => moveSourcePage(1)}><ChevronRight size={17} /></IconButton></span>
              </Tooltip>
            </nav>
          ) : null}
          <Tooltip title="Close source panel" placement="left">
            <IconButton aria-label="Close source panel" onClick={onClose}><X size={18} /></IconButton>
          </Tooltip>
        </div>
      </header>

      <div className="field-source-inspector-body">
        <section className="source-document-group" aria-label={`${sourceKindLabel(activeSource)} source`}>
          <div className="source-document-viewer" aria-label={`${activeSource?.fileName || activeSourceId} preview`}>
            <header>
              <div><strong>{activeSource?.fileName || activeSourceId}</strong></div>
            </header>
            <div className={`source-document-viewport ${activeSource?.previewUrl ? "has-native-source" : ""}`}>
              <SourceDocumentEvidencePreview source={activeSource} />
            </div>
          </div>
        </section>

      </div>
    </aside>
  );
}

function JobFieldsTab({ shipment, issueState, fieldValues, onFieldChange, onResolve, partners, customer, editing, sources = [], sourcePanelRequest = 0, onOpenCharges }) {
  const [activeGroup, setActiveGroup] = useState("overview");
  const [activeConsigneeStopId, setActiveConsigneeStopId] = useState(null);
  const [selectedSourcePath, setSelectedSourcePath] = useState(null);
  useEffect(() => {
    if (sourcePanelRequest) setSelectedSourcePath("__all_sources__");
  }, [sourcePanelRequest]);
  useEffect(() => {
    let animationFrame;
    const updateActiveGroup = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const anchor = Math.min(window.innerHeight * 0.3, 260);
        const sections = jobFieldGroupIds
          .map((groupId) => ({ groupId, element: document.getElementById(`field-section-${groupId}`) }))
          .filter(({ element }) => element);
        const current = [...sections].reverse().find(({ element }) => element.getBoundingClientRect().top <= anchor) || sections[0];
        if (current) {
          setActiveGroup(current.groupId);
          if (current.groupId === "consignees") {
            const consigneeSections = [...document.querySelectorAll("[data-consignee-stop-id]")];
            const currentConsignee = [...consigneeSections].reverse().find((element) => element.getBoundingClientRect().top <= anchor) || consigneeSections[0];
            setActiveConsigneeStopId(currentConsignee?.dataset.consigneeStopId || null);
          } else {
            setActiveConsigneeStopId(null);
          }
        }
      });
    };
    updateActiveGroup();
    window.addEventListener("scroll", updateActiveGroup, { passive: true });
    window.addEventListener("resize", updateActiveGroup);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateActiveGroup);
      window.removeEventListener("resize", updateActiveGroup);
    };
  }, []);
  useEffect(() => {
    if (!selectedSourcePath) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedSourcePath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedSourcePath]);
  const representative = shipment.shipmentId === fixture.fixtureId && !["scratch", "existing"].includes(fieldValues.__startMode);
  const [origin = "Origin not available", destination = "Destination not available"] = (shipment.route || "").split(" → ");
  const baseJob = fixture.jobDraft;
  const job = representative ? baseJob : {
    ...baseJob,
    overview: {
      ...baseJob.overview,
      jobId: shipment.shipmentId,
      status: shipment.status,
      transportMode: shipment.transportMode,
      serviceType: shipment.serviceType,
    },
    identifiers: {
      ...baseJob.identifiers,
      customerPONumber: `PO-${shipment.shipmentId.replace(/^TRK-/, "")}`,
      referenceNumber: shipment.referenceNumber,
      bolNumber: shipment.bolNumber || null,
    },
    shipper: {
      ...baseJob.shipper,
      company: "Origin facility",
      address: origin,
      timeWindow: {
        ...baseJob.shipper.timeWindow,
        start: `${shipment.pickupDate}T09:00:00-07:00`,
        end: `${shipment.pickupDate}T12:00:00-07:00`,
      },
    },
    consignee: {
      ...baseJob.consignee,
      company: shipment.customer,
      address: destination,
      timeWindow: {
        ...baseJob.consignee.timeWindow,
        start: `${shipment.pickupDate}T13:00:00-07:00`,
        end: `${shipment.pickupDate}T17:00:00-07:00`,
      },
    },
  };
  const equipmentIssue = representative ? issueState["ISSUE-MISSING-001"] : null;
  const palletIssue = representative ? issueState["ISSUE-CONFLICT-001"] : null;
  const equipmentValue = equipmentIssue?.value || (representative ? null : "Dry Van");
  const palletValue = palletIssue?.value || (representative ? null : job.cargoLines[0].handlingUnitCount);
  const freightTerms = representative ? job.commercial.freightTerms : "Prepaid";
  const freightBillTo = representative ? job.commercial.billTo : `${shipment.customer} billing account`;
  const contactValue = (contact) => `${contact.name} · ${contact.phone} · ${contact.email}`;
  const reviewIssueByPath = representative ? Object.fromEntries(fixture.reviewIssues.map((issue) => [issue.fieldPath, issue])) : {};
  const defaultRouteStops = Array.isArray(job.routeStops) && job.routeStops.length
    ? job.routeStops
    : [
        {
          stopId: `${shipment.shipmentId}-PICKUP`,
          activity: "Pickup",
          company: job.shipper.company,
          address: job.shipper.address,
          contact: contactValue(job.shipper.contact),
          timeWindow: formatTimeWindow(job.shipper.timeWindow),
        },
        {
          stopId: `${shipment.shipmentId}-DELIVERY`,
          activity: "Delivery",
          company: job.consignee.company,
          address: job.consignee.address,
          contact: contactValue(job.consignee.contact),
          timeWindow: formatTimeWindow(job.consignee.timeWindow),
        },
      ];
  const routeStops = Array.isArray(fieldValues.routeStops) && fieldValues.routeStops.length
    ? fieldValues.routeStops
    : defaultRouteStops;
  const deliveryStopOptions = routeStops
    .filter((stop) => stop.activity === "Delivery")
    .map((stop, index) => ({
      value: stop.stopId,
      label: `Stop ${routeStops.indexOf(stop)} · ${stop.company || `Delivery ${index + 1}`}`,
    }));
  const cargoLines = Array.isArray(fieldValues.cargoLines) ? fieldValues.cargoLines : job.cargoLines;
  const originalCargoLineId = job.cargoLines[0]?.lineId;
  const cargoFieldPath = (line, index, key) => line.lineId === originalCargoLineId
    ? `cargoLines[0].${key}`
    : `cargoLines.${line.lineId || index}.${key}`;
  const cargoBooleanValue = (value) => value === null || value === undefined ? null : value ? "Yes" : "No";
  const cargoLineFields = cargoLines.flatMap((line, index) => {
    const dimensions = line.dimensions || {};
    const isOriginalLine = line.lineId === originalCargoLineId;
    const handlingUnitCount = isOriginalLine && representative
      ? palletValue ?? line.handlingUnitCount ?? ""
      : line.handlingUnitCount ?? "";
    return [
      { label: "Delivery stop", value: line.deliveryStopId || deliveryStopOptions[0]?.value || "", cargoKey: "deliveryStopId", cargoLineIndex: index, path: cargoFieldPath(line, index, "deliveryStopId"), control: "select", options: deliveryStopOptions, origin: "Route plan / Ops", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Handling Unit Type", value: line.handlingUnitType, cargoKey: "handlingUnitType", cargoLineIndex: index, path: cargoFieldPath(line, index, "handlingUnitType"), origin: "Customer document", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Handling Unit Count", value: handlingUnitCount, cargoKey: "handlingUnitCount", cargoLineIndex: index, path: cargoFieldPath(line, index, "handlingUnitCount"), origin: "Customer document", stage: "Draft / Review", scope: "Conditional", subgroup: `Cargo item ${index + 1}` },
      { label: "Package Type", value: line.packageType, cargoKey: "packageType", cargoLineIndex: index, path: cargoFieldPath(line, index, "packageType"), origin: "Customer document", stage: "Draft / Review", scope: "Conditional", subgroup: `Cargo item ${index + 1}` },
      { label: "Package / Piece Count", value: line.packagePieceCount === "" || line.packagePieceCount === null || line.packagePieceCount === undefined ? "" : `${line.packagePieceCount} ${line.packageType === "Carton" ? "cartons" : "pieces"}`, cargoKey: "packagePieceCount", cargoLineIndex: index, path: cargoFieldPath(line, index, "packagePieceCount"), origin: "Customer document", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Commodity Description", value: line.commodityDescription, cargoKey: "commodityDescription", cargoLineIndex: index, path: cargoFieldPath(line, index, "commodityDescription"), origin: "Customer document", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Weight", value: line.weight?.value === "" || line.weight?.value === null || line.weight?.value === undefined ? "" : `${Number(line.weight.value).toLocaleString()} ${line.weight.unit || "lb"}`, cargoKey: "weight", cargoLineIndex: index, path: cargoFieldPath(line, index, "weight"), origin: "Customer document", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Dimensions", value: dimensions.displayValue ?? `${dimensions.length || 0} × ${dimensions.width || 0} × ${dimensions.height || 0} ${dimensions.unit || "in"}`, cargoKey: "dimensions", cargoLineIndex: index, path: cargoFieldPath(line, index, "dimensions"), origin: "Customer document", stage: "Draft / Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Freight Class", value: line.freightClass, cargoKey: "freightClass", cargoLineIndex: index, path: cargoFieldPath(line, index, "freightClass"), origin: "Customer document / Carrier", stage: "Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "NMFC", value: line.nmfc, cargoKey: "nmfc", cargoLineIndex: index, path: cargoFieldPath(line, index, "nmfc"), origin: "Customer document / Carrier", stage: "Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Hazmat", value: cargoBooleanValue(line.hazmat), cargoKey: "hazmat", cargoLineIndex: index, path: cargoFieldPath(line, index, "hazmat"), control: "select", options: yesNoOptions, origin: "Customer document / Ops", stage: "Review", scope: "Core", subgroup: `Cargo item ${index + 1}` },
      { label: "Stackable", value: cargoBooleanValue(line.stackable), cargoKey: "stackable", cargoLineIndex: index, path: cargoFieldPath(line, index, "stackable"), control: "select", options: yesNoOptions, origin: "Customer document / Ops", stage: "Review", scope: "Conditional", subgroup: `Cargo item ${index + 1}` },
      { label: "Turnable", value: cargoBooleanValue(line.turnable), cargoKey: "turnable", cargoLineIndex: index, path: cargoFieldPath(line, index, "turnable"), control: "select", options: yesNoOptions, origin: "Customer document / Ops", stage: "Review", scope: "Conditional", subgroup: `Cargo item ${index + 1}` },
    ];
  });
  const calculatedCargoTotals = calculateCargoTotals(cargoLines, (line) => line.lineId === originalCargoLineId
    ? palletValue ?? line.handlingUnitCount ?? 0
    : line.handlingUnitCount || 0);
  const cargoTotalWeight = calculatedCargoTotals.totalWeight;
  const cargoTotalHandlingUnits = calculatedCargoTotals.totalHandlingUnits;
  const cargoTotalPackagePieces = calculatedCargoTotals.totalPackagesPieces;
  const customerOptions = partners.filter((partner) => partner.type === "customer").map((partner) => partner.name);
  const carrierOptions = partners.filter((partner) => partner.type === "carrier").map((partner) => partner.name);
  const sourceEvidenceByPath = representative ? {
    "identifiers.customerPONumber": {
      sourceIds: ["SRC-PDF-001"],
      sourceLocations: ["PDF page 1 · Customer PO"],
      originalValue: job.identifiers.customerPONumber,
    },
    "shipper.timeWindow": reviewIssueByPath["shipper.timeWindow"],
    "cargoLines[0].handlingUnitCount": reviewIssueByPath["cargoLines[0].handlingUnitCount"],
    "cargoLines[0].commodityDescription": {
      sourceIds: ["SRC-XLS-001"],
      sourceLocations: ["XLS Cargo Details · Commodity Description"],
      originalValue: job.cargoLines[0].commodityDescription,
    },
    instructions: reviewIssueByPath.instructions,
  } : {};
  const routeStopFields = routeStops.flatMap((stop, index) => {
    const sourcePrefix = index === 0 ? "shipper" : index === 1 ? "consignee" : null;
    const subgroup = index === 0 ? "Shipper" : `Stop ${index}`;
    const stopPath = (key) => `routeStops.${stop.stopId}.${key}`;
    const { date, timeRange } = splitRouteStopTimeWindow(stop.timeWindow);
    return [
      { label: "Shipping Type", value: stop.activity, stopKey: "activity", routeStopIndex: index, path: stopPath("activity"), control: "radio", options: selectOptions(["Pickup", "Delivery"]), origin: "Route plan / Ops", stage: "Draft / Review", scope: "Core", subgroup },
      { label: "Company / location", value: stop.company, stopKey: "company", routeStopIndex: index, path: stopPath("company"), sourcePath: sourcePrefix ? `${sourcePrefix}.company` : null, origin: index === 0 ? "Station master / Ops" : "Customer document / Ops", stage: "Draft / Review", scope: "Core", subgroup },
      { label: "Address", value: stop.address, stopKey: "address", routeStopIndex: index, path: stopPath("address"), sourcePath: sourcePrefix ? `${sourcePrefix}.address` : null, origin: "Customer document / Ops", stage: "Draft / Review", scope: "Core", subgroup },
      { label: "Contact", value: stop.contact, stopKey: "contact", routeStopIndex: index, path: stopPath("contact"), sourcePath: sourcePrefix ? `${sourcePrefix}.contact` : null, origin: "Customer document / Ops", stage: "Draft / Review", scope: "Conditional", subgroup },
      { label: "Time window", value: joinRouteStopTimeWindow(date, timeRange), stopKey: "timeWindow", routeStopIndex: index, path: stopPath("timeWindow"), sourcePath: sourcePrefix ? `${sourcePrefix}.timeWindow` : null, control: "timeWindow", origin: "Customer document / Ops", stage: "Draft / Review", scope: "Core", subgroup },
    ];
  });
  const shipperFields = routeStopFields
    .filter((field) => field.routeStopIndex === 0)
    .map((field) => ({
      ...field,
      subgroup: null,
      displayOnly: field.stopKey === "activity" ? true : field.displayOnly,
    }));
  const consigneeFields = routeStopFields.filter((field) => field.routeStopIndex > 0);
  const groups = [
    {
      id: "overview", label: "Overview", icon: LayoutList, description: "Core shipment context and identifiers.", fields: [
        { label: "Customer", value: customer, path: "overview.customer", control: "autocomplete", options: customerOptions, fullWidth: true, origin: "Customer master / Ops", stage: "Draft", scope: "Core" },
        { label: "Transport mode", value: formatTransportMode(job.overview.transportMode), path: "overview.transportMode", readOnly: true, origin: "System / Route plan", stage: "Draft", scope: "Core" },
        { label: "Service type", value: job.overview.serviceType, path: "overview.serviceType", control: "select", options: serviceTypeOptions, origin: "Customer document / Ops", stage: "Draft", scope: "Core" },
        { label: "Equipment Type", value: equipmentValue, path: "equipmentRequirements[0].type", control: "autocomplete", options: equipmentTypeOptions, freeSolo: true, origin: "Customer document / Ops", stage: "Review", scope: "Core" },
        { label: "Customer PO Number", value: job.identifiers.customerPONumber, path: "identifiers.customerPONumber", origin: "Customer document", stage: "Draft", scope: "Conditional" },
      ],
    },
    {
      id: "shipper", label: "Shipper", icon: Building2, description: "Manage the shipment origin.", fields: shipperFields,
    },
    {
      id: "consignees", label: "Consignees & Cargo", icon: MapPin, description: "Manage delivery stops and the cargo assigned to each consignee.", fields: consigneeFields,
    },
    {
      id: "services", label: "Instruction", icon: ClipboardCheck, description: "Keep structured service requirements and free-text instructions together in one operational section.", fields: [
        { label: "Service Requirements", value: job.serviceRequirements.map((service) => `${service.type} · ${service.appliesTo}`), path: "serviceRequirements[]", control: "autocomplete", options: serviceRequirementOptions, multiple: true, fullWidth: true, origin: "Customer document / Ops", stage: "Review", scope: "Core" },
        { label: "Remark", value: job.instructions, path: "instructions", fullWidth: true, origin: "Customer document / Ops", stage: "Draft / Review", scope: "Conditional" },
      ],
    },
    {
      id: "assignment", label: "Assignment", icon: Truck, description: "Carrier and platform references can be completed after document review.", fields: [
        { label: "Carrier", value: job.carrierAssignment.carrier, path: "carrierAssignment.carrier", control: "autocomplete", options: carrierOptions, origin: "Carrier master / Ops", stage: "Assignment", scope: "Core" },
        { label: "Quote Reference", value: job.carrierAssignment.quoteReference || "Q-DEMO-001 · Draft", path: "carrierAssignment.quoteReference", origin: "Ops / Carrier / Platform", stage: "Assignment", scope: "Core" },
        { label: "PRO Number", value: job.carrierAssignment.proNumber, path: "carrierAssignment.proNumber", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Pickup / Lot Number", value: null, path: "carrierAssignment.pickupLotNumber", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Carrier Pickup Number", value: job.carrierAssignment.carrierPickupNumber, path: "carrierAssignment.carrierPickupNumber", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Origin Terminal", value: job.carrierAssignment.originTerminal, path: "carrierAssignment.originTerminal", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Origin Terminal Phone", value: null, path: "carrierAssignment.originTerminalPhone", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Destination Terminal", value: job.carrierAssignment.destinationTerminal, path: "carrierAssignment.destinationTerminal", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
        { label: "Destination Terminal Phone", value: null, path: "carrierAssignment.destinationTerminalPhone", origin: "Carrier / Platform", stage: "Assignment", scope: "Conditional" },
      ],
    },
    {
      id: "commercial", label: "Commercial", icon: ReceiptText, description: "Review freight terms and billing responsibility.", fields: [
        { label: "Freight terms", value: freightTerms, path: "commercial.freightTerms", control: "select", options: freightTermOptions, origin: "Customer document / Operations / Quotation", stage: "Assignment", scope: "Core" },
        { label: "Freight bill-to", value: freightBillTo, path: "commercial.billTo", origin: "Customer document / Operations", stage: "Assignment", scope: "Conditional" },
      ],
    },
  ];
  const navItems = groups;
  const getIssueGroup = (issue) => {
    if (issue.fieldPath.startsWith("equipmentRequirements")) return "overview";
    if (issue.fieldPath.startsWith("shipper.")) return "shipper";
    if (issue.fieldPath.startsWith("consignee.")) return "consignees";
    if (issue.fieldPath.startsWith("cargoLines")) return "consignees";
    if (issue.fieldPath.startsWith("cargoTotals")) return "consignees";
    if (issue.fieldPath.startsWith("serviceRequirements")) return "services";
    if (issue.fieldPath === "instructions") return "services";
    if (issue.fieldPath.startsWith("carrierAssignment")) return "assignment";
    if (issue.fieldPath.startsWith("commercial")) return "commercial";
    return "overview";
  };
  const unresolvedIssuesFor = (groupId) => representative
    ? demoIssues.filter((issue) => getIssueGroup(issue) === groupId && issueState[issue.issueId].status === "unresolved")
    : [];
  const jumpToGroup = (groupId) => {
    setActiveGroup(groupId);
    document.getElementById(`field-section-${groupId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpToConsignee = (stopId) => {
    setActiveGroup("consignees");
    setActiveConsigneeStopId(stopId);
    document.getElementById(`consignee-stop-${stopId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const getFieldValue = (field) => field.displayOnly
    ? field.value
    : field.cargoLineIndex !== undefined || field.routeStopIndex !== undefined
      ? field.value
      : Object.prototype.hasOwnProperty.call(fieldValues, field.path) ? fieldValues[field.path] : field.value;
  const fieldsWithSourceState = groups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => ({
      ...field,
      sourceEvidence: sourceEvidenceByPath[field.sourcePath || field.path],
      sourceActive: selectedSourcePath === field.path,
      onOpenSource: setSelectedSourcePath,
    })),
  }));
  const cargoFieldsWithSourceState = cargoLineFields.map((field) => ({
    ...field,
    sourceEvidence: null,
    sourceActive: false,
  }));
  const cargoTableSourceFields = routeStops.slice(1).map((stop, stopIndex) => {
    const assignedLineIndexes = cargoLines
      .map((line, lineIndex) => line.deliveryStopId === stop.stopId ? lineIndex : null)
      .filter((lineIndex) => lineIndex !== null);
    const evidenceList = cargoLineFields
      .filter((field) => assignedLineIndexes.includes(field.cargoLineIndex))
      .map((field) => sourceEvidenceByPath[field.sourcePath || field.path])
      .filter(Boolean);
    const sourceIds = [...new Set(evidenceList.flatMap((evidence) => evidence.sourceIds || []))];
    const sourceLocations = [...new Set(evidenceList.flatMap((evidence) => evidence.sourceLocations || []))];
    const path = `cargoTable.${stop.stopId}`;
    return {
      stopId: stop.stopId,
      label: `Cargo for Stop ${stopIndex + 1}`,
      path,
      value: `${assignedLineIndexes.length} cargo ${assignedLineIndexes.length === 1 ? "item" : "items"}`,
      sourceEvidence: sourceIds.length ? { sourceIds, sourceLocations } : null,
      sourceActive: selectedSourcePath === path,
      onOpenSource: setSelectedSourcePath,
    };
  });
  const selectedField = [
    ...fieldsWithSourceState.flatMap((group) => group.fields),
    ...cargoFieldsWithSourceState,
    ...cargoTableSourceFields,
  ].find((field) => field.path === selectedSourcePath);
  const handleFieldChange = (field, value) => {
    onFieldChange(field.path, value);
    const issue = representative ? demoIssues.find((candidate) => candidate.fieldPath === field.path) : null;
    if (issue?.issueType === "missing" && equipmentTypeOptions.includes(value) && issueState[issue.issueId]?.status === "unresolved") {
      onResolve(issue.issueId, { label: `Added ${value}`, value });
    }
  };
  const updateCargoLine = (field, value) => {
    const nextCargoLines = cargoLines.map((line, index) => {
      if (index !== field.cargoLineIndex) return line;
      if (["handlingUnitCount", "packagePieceCount"].includes(field.cargoKey)) {
        const parsedValue = Number.parseInt(String(value).replace(/,/g, ""), 10);
        return { ...line, [field.cargoKey]: Number.isFinite(parsedValue) ? parsedValue : 0 };
      }
      if (["hazmat", "stackable", "turnable"].includes(field.cargoKey)) {
        return { ...line, [field.cargoKey]: value === "" ? null : value === "Yes" };
      }
      if (field.cargoKey === "weight") {
        const parsedValue = Number.parseFloat(String(value).replace(/,/g, ""));
        return { ...line, weight: { ...line.weight, value: Number.isFinite(parsedValue) ? parsedValue : 0 } };
      }
      if (field.cargoKey === "dimensions") {
        const matches = String(value).match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*[×x]\s*([\d.]+)/i);
        return matches
          ? { ...line, dimensions: { ...line.dimensions, length: Number(matches[1]), width: Number(matches[2]), height: Number(matches[3]), displayValue: undefined } }
          : { ...line, dimensions: { ...line.dimensions, displayValue: value } };
      }
      return { ...line, [field.cargoKey]: value };
    });
    onFieldChange("cargoLines", nextCargoLines);
    if (field.path === "cargoLines[0].handlingUnitCount") {
      const issue = demoIssues.find((candidate) => candidate.fieldPath === field.path);
      const parsedValue = Number.parseInt(String(value).replace(/,/g, ""), 10);
      if (issue && Number.isFinite(parsedValue) && issueState[issue.issueId]?.status === "unresolved") {
        onResolve(issue.issueId, { label: `Confirmed ${parsedValue} pallets`, value: parsedValue });
      }
    }
  };
  const updateRouteStop = (field, value) => {
    const nextRouteStops = routeStops.map((stop, index) => {
      if (index !== field.routeStopIndex) return stop;
      if (!field.timeWindowPart) return { ...stop, [field.stopKey]: value };
      const timeWindowParts = splitRouteStopTimeWindow(stop.timeWindow);
      const nextTimeWindowParts = { ...timeWindowParts, [field.timeWindowPart]: value };
      return { ...stop, timeWindow: joinRouteStopTimeWindow(nextTimeWindowParts.date, nextTimeWindowParts.timeRange) };
    });
    onFieldChange("routeStops", nextRouteStops);
    if (field.stopKey === "activity" && value !== "Delivery") {
      const fallbackDeliveryId = nextRouteStops.find((stop, index) => index !== field.routeStopIndex && stop.activity === "Delivery")?.stopId || "";
      onFieldChange("cargoLines", cargoLines.map((line) => line.deliveryStopId === nextRouteStops[field.routeStopIndex].stopId
        ? { ...line, deliveryStopId: fallbackDeliveryId }
        : line));
    }
  };
  const addRouteStop = () => {
    const nextIndex = routeStops.length + 1;
    onFieldChange("routeStops", [
      ...routeStops,
      {
        stopId: `STOP-${Date.now()}`,
        activity: "Delivery",
        company: `Delivery location ${nextIndex - 1}`,
        address: "",
        contact: "",
        timeWindow: "",
      },
    ]);
  };
  const removeRouteStop = (index) => {
    if (index === 0 || routeStops.length <= 2) return;
    const removedStopId = routeStops[index]?.stopId;
    const nextRouteStops = routeStops.filter((_, stopIndex) => stopIndex !== index);
    const fallbackDeliveryId = nextRouteStops.find((stop) => stop.activity === "Delivery")?.stopId || "";
    onFieldChange("routeStops", nextRouteStops);
    onFieldChange("cargoLines", cargoLines.map((line) => line.deliveryStopId === removedStopId
      ? { ...line, deliveryStopId: fallbackDeliveryId }
      : line));
  };
  const addCargoLine = (deliveryStopId = deliveryStopOptions[0]?.value || "") => {
    onFieldChange("cargoLines", [
      ...cargoLines,
      {
        lineId: `CARGO-${Date.now()}`,
        handlingUnitType: "Pallet",
        handlingUnitCount: 1,
        packageType: "Carton",
        packagePieceCount: 1,
        commodityDescription: "",
        weight: { value: 0, unit: "lb" },
        dimensions: { length: 0, width: 0, height: 0, unit: "in" },
        freightClass: null,
        nmfc: null,
        hazmat: false,
        stackable: null,
        turnable: null,
        deliveryStopId,
      },
    ]);
  };
  const removeCargoLine = (index) => {
    const removedLine = cargoLines[index];
    if (removedLine?.lineId === originalCargoLineId && selectedSourcePath?.startsWith("cargoLines[0]")) {
      setSelectedSourcePath(null);
    }
    if (removedLine?.lineId === originalCargoLineId) {
      demoIssues
        .filter((issue) => issue.fieldPath.startsWith("cargoLines[0]") && issueState[issue.issueId]?.status === "unresolved")
        .forEach((issue) => onResolve(issue.issueId, { label: "Removed cargo item", value: null }));
    }
    onFieldChange("cargoLines", cargoLines.filter((_, lineIndex) => lineIndex !== index));
  };
  const handleRenderedFieldChange = (field, value) => field.routeStopIndex !== undefined
    ? updateRouteStop(field, value)
    : field.cargoLineIndex !== undefined
      ? updateCargoLine(field, value)
      : handleFieldChange(field, value);

  return (
    <div className={`fields-workspace ${selectedSourcePath ? "has-source-inspector" : ""}`}>
      <aside className="field-index">
        <nav aria-label="Job field sections">
          {navItems.map((group) => {
            const GroupIcon = group.icon;
            const sectionIssues = unresolvedIssuesFor(group.id);
            const blockerIssues = sectionIssues.filter((issue) => issue.severity === "candidate_blocker");
            return (
              <Fragment key={group.id}>
                <button type="button" className={activeGroup === group.id ? "active" : ""} aria-current={activeGroup === group.id ? "location" : undefined} onClick={() => jumpToGroup(group.id)}>
                  <GroupIcon size={16} />
                  <span className="field-index-copy"><strong>{group.label}</strong></span>
                  {blockerIssues.length ? (
                    <Tooltip title={`${blockerIssues.length} unresolved ${blockerIssues.length === 1 ? "blocker" : "blockers"}`} placement="right">
                      <span className="anchor-issue-count is-blocker" aria-label={`${blockerIssues.length} unresolved ${blockerIssues.length === 1 ? "blocker" : "blockers"}`}>{blockerIssues.length}</span>
                    </Tooltip>
                  ) : <ChevronRight size={15} />}
                </button>
                {group.id === "consignees" && routeStops.length > 1 ? (
                  <div className="field-index-subnav" aria-label="Consignee anchors">
                    {routeStops.slice(1).map((stop, index) => {
                      const stopLabel = stop.activity ? `${stop.activity} Stop` : "Stop";
                      return (
                        <button key={stop.stopId} type="button" className={activeConsigneeStopId === stop.stopId ? "active" : ""} aria-current={activeConsigneeStopId === stop.stopId ? "location" : undefined} aria-label={`${stopLabel} ${index + 1}`} onClick={() => jumpToConsignee(stop.stopId)} title={`${stopLabel} ${index + 1}`}>
                          <span aria-hidden="true">{index + 1}</span>
                          <strong>{stopLabel}</strong>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </nav>
      </aside>
      <section className="field-sheet">
        {fieldsWithSourceState.map((group) => {
          const GroupIcon = group.icon;
          const subgroups = [...new Set(group.fields.map((field) => field.subgroup).filter(Boolean))];
          return (
            <section id={`field-section-${group.id}`} className="field-form-section" key={group.id}>
              <header className="field-section-heading">
                <div className="field-section-icon"><GroupIcon size={17} /></div>
                <div><h3>{group.label}</h3></div>
                {group.id === "commercial" ? (
                  <Button className="field-section-link" variant="text" endIcon={<ArrowRight size={16} />} onClick={onOpenCharges}>Charge & Cost</Button>
                ) : null}
              </header>
              {group.id === "commercial" ? (
                <div className="field-grid">{group.fields.map((field) => <FieldRecord key={field.path} field={field} value={getFieldValue(field)} onChange={(value) => handleRenderedFieldChange(field, value)} editing={editing} issueState={issueState} showReviewIssues={representative} />)}</div>
              ) : subgroups.length ? subgroups.map((subgroup) => {
                const routeStopIndex = group.id === "consignees"
                  ? subgroup === "Shipper"
                    ? 0
                    : subgroup.startsWith("Stop ")
                      ? Number(subgroup.replace("Stop ", ""))
                      : null
                  : null;
                const isRouteStop = routeStopIndex !== null;
                const isShipperOrigin = isRouteStop && routeStopIndex === 0;
                const isConsignee = isRouteStop && routeStopIndex > 0;
                const consigneeStop = isConsignee ? routeStops[routeStopIndex] : null;
                const consigneeCargoLines = consigneeStop
                  ? cargoLines.map((line, lineIndex) => ({ line, lineIndex })).filter(({ line }) => line.deliveryStopId === consigneeStop.stopId)
                  : [];
                const cargoTableSourceField = consigneeStop
                  ? cargoTableSourceFields.find((field) => field.stopId === consigneeStop.stopId)
                  : null;
                const showAddStop = editing && group.id === "consignees" && routeStopIndex === routeStops.length - 1;
                return (
                  <Fragment key={subgroup}>
                    <section
                      id={isConsignee ? `consignee-stop-${consigneeStop.stopId}` : undefined}
                      data-consignee-stop-id={isConsignee ? consigneeStop.stopId : undefined}
                      aria-label={isShipperOrigin ? "Shipper departure point" : isConsignee ? `Stop ${routeStopIndex}` : undefined}
                      className={`field-subgroup${isRouteStop ? " route-stop-group" : ""}`}
                    >
                      <div className="field-subgroup-title">
                        {isRouteStop ? (
                          <div className="route-stop-title">
                            {isShipperOrigin ? (
                              <>
                                <span className="route-stop-shipper-icon" aria-hidden="true"><Building2 size={14} /></span>
                                <span>Shipper</span>
                              </>
                            ) : (
                              <>
                                <span className="route-stop-number" aria-hidden="true">{routeStopIndex}</span>
                                <span>Stop</span>
                              </>
                            )}
                          </div>
                        ) : <span>{subgroup}</span>}
                        {editing && isRouteStop && !isShipperOrigin && routeStops.length > 2 ? (
                          <Tooltip title={`Delete stop ${routeStopIndex}`} placement="top">
                            <IconButton className="cargo-item-delete" color="error" size="small" aria-label={`Delete stop ${routeStopIndex}`} onClick={() => removeRouteStop(routeStopIndex)}><Trash2 size={16} /></IconButton>
                          </Tooltip>
                        ) : null}
                      </div>
                      <div className="field-grid">{group.fields.filter((field) => field.subgroup === subgroup).map((field) => <FieldRecord key={field.path} field={field} value={getFieldValue(field)} onChange={(value) => handleRenderedFieldChange(field, value)} editing={editing} issueState={issueState} showReviewIssues={representative} />)}</div>
                      {isConsignee ? (
                        <div className="consignee-cargo-block">
                          <div className="consignee-cargo-heading">
                            <strong>Cargo</strong>
                            <span>{consigneeCargoLines.length} {consigneeCargoLines.length === 1 ? "item" : "items"}</span>
                            {cargoTableSourceField?.sourceEvidence ? (
                              <Tooltip title="View source" placement="top" enterDelay={350}>
                                <IconButton
                                  className={`cargo-table-source-button ${cargoTableSourceField.sourceActive ? "source-active" : ""}`}
                                  size="small"
                                  aria-label={`View source for cargo at Stop ${routeStopIndex}`}
                                  aria-expanded={cargoTableSourceField.sourceActive}
                                  aria-controls="field-source-inspector"
                                  onClick={() => cargoTableSourceField.onOpenSource?.(cargoTableSourceField.path)}
                                >
                                  <FileSearch size={15} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </div>
                          {consigneeCargoLines.length ? (
                            <div className={`rate-rule-table consignee-cargo-table ${editing ? "is-editing" : ""}`} role="table" aria-label={`Cargo for consignee ${routeStopIndex}`}>
                              <div className="rate-rule-head consignee-cargo-table-head" role="row">
                                <span role="columnheader">Commodity</span>
                                {editing ? (
                                  <>
                                    <span role="columnheader">H/U Type</span>
                                    <span role="columnheader">H/U Qty</span>
                                    <span role="columnheader">Package Type</span>
                                    <span role="columnheader">Package Qty</span>
                                  </>
                                ) : (
                                  <>
                                    <span role="columnheader">Handling Unit</span>
                                    <span role="columnheader">Packages</span>
                                  </>
                                )}
                                <span role="columnheader">Weight</span>
                                <span role="columnheader">Dimensions</span>
                                <span role="columnheader">Class / NMFC</span>
                                <span role="columnheader">Hazmat / Stack / Turn</span>
                                {editing ? <span role="columnheader" aria-label="Actions" /> : null}
                              </div>
                              {consigneeCargoLines.map(({ line, lineIndex }, consigneeCargoIndex) => {
                                const cargoFields = cargoFieldsWithSourceState
                                  .filter((field) => field.cargoLineIndex === lineIndex && field.cargoKey !== "deliveryStopId")
                                  .map((field) => ({
                                    ...field,
                                    tableCell: true,
                                    value: field.cargoKey === "packagePieceCount" ? line.packagePieceCount ?? "" : field.value,
                                  }));
                                const cargoFieldByKey = Object.fromEntries(cargoFields.map((field) => [field.cargoKey, field]));
                                const renderCargoField = (cargoKey, nested = false) => {
                                  const field = cargoFieldByKey[cargoKey];
                                  return field ? (
                                    <div className="consignee-cargo-table-cell" role={nested ? undefined : "cell"} key={field.path}>
                                      <FieldRecord field={field} value={getFieldValue(field)} onChange={(value) => handleRenderedFieldChange(field, value)} editing={editing} issueState={issueState} showReviewIssues={representative} />
                                    </div>
                                  ) : null;
                                };
                                const combinedCargoValue = (countKey, typeKey) => {
                                  const count = cargoFieldByKey[countKey] ? getFieldValue(cargoFieldByKey[countKey]) : "";
                                  const type = cargoFieldByKey[typeKey] ? getFieldValue(cargoFieldByKey[typeKey]) : "";
                                  return [count, type].filter((value) => value !== "" && value !== null && value !== undefined).join(" ") || "—";
                                };
                                const joinedCargoValues = (cargoKeys) => cargoKeys.map((cargoKey) => {
                                  const field = cargoFieldByKey[cargoKey];
                                  const value = field ? getFieldValue(field) : "";
                                  return value === "" || value === null || value === undefined ? "—" : value;
                                }).join(" / ");
                                return (
                                  <div className="consignee-cargo-table-row" role="row" aria-label={`Cargo item ${consigneeCargoIndex + 1}`} key={line.lineId || lineIndex}>
                                    {renderCargoField("commodityDescription")}
                                    {editing ? (
                                      <>
                                        {renderCargoField("handlingUnitType")}
                                        {renderCargoField("handlingUnitCount")}
                                        {renderCargoField("packageType")}
                                        {renderCargoField("packagePieceCount")}
                                      </>
                                    ) : (
                                      <>
                                        <div className="consignee-cargo-combined-value" role="cell">{combinedCargoValue("handlingUnitCount", "handlingUnitType")}</div>
                                        <div className="consignee-cargo-combined-value" role="cell">{combinedCargoValue("packagePieceCount", "packageType")}</div>
                                      </>
                                    )}
                                    {renderCargoField("weight")}
                                    {renderCargoField("dimensions")}
                                    {editing ? (
                                      <div className="consignee-cargo-field-pair" role="cell">{renderCargoField("freightClass", true)}{renderCargoField("nmfc", true)}</div>
                                    ) : (
                                      <div className="consignee-cargo-combined-value" role="cell">{joinedCargoValues(["freightClass", "nmfc"])}</div>
                                    )}
                                    {editing ? (
                                      <div className="consignee-cargo-field-flags" role="cell">{renderCargoField("hazmat", true)}{renderCargoField("stackable", true)}{renderCargoField("turnable", true)}</div>
                                    ) : (
                                      <div className="consignee-cargo-combined-value" role="cell">{joinedCargoValues(["hazmat", "stackable", "turnable"])}</div>
                                    )}
                                    {editing ? (
                                      <Tooltip title={`Delete cargo item ${consigneeCargoIndex + 1}`} placement="top">
                                        <IconButton className="rule-delete-button" color="error" size="small" aria-label={`Delete cargo item ${consigneeCargoIndex + 1} from consignee ${routeStopIndex}`} onClick={() => removeCargoLine(lineIndex)}><Trash2 size={16} /></IconButton>
                                      </Tooltip>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : <p className="consignee-cargo-empty">No cargo assigned.</p>}
                          {editing ? <div className="consignee-cargo-action"><Button variant="text" size="small" startIcon={<Plus size={15} />} onClick={() => addCargoLine(consigneeStop.stopId)}>Add cargo item</Button></div> : null}
                        </div>
                      ) : null}
                    </section>
                    {showAddStop ? <div className="field-repeat-action"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addRouteStop}>Add stop</Button></div> : null}
                    {group.id === "consignees" && isConsignee && routeStopIndex === routeStops.length - 1 ? (
                      <div className="cargo-totals-footer" aria-label="Cargo totals">
                        <div><span>Total Weight</span><strong>{Number(cargoTotalWeight || 0).toLocaleString()} {job.cargoTotals.shipmentTotalWeight.unit}</strong></div>
                        <div><span>Total Handling Units</span><strong>{cargoTotalHandlingUnits}</strong></div>
                        <div><span>Total Packages / Pieces</span><strong>{cargoTotalPackagePieces}</strong></div>
                      </div>
                    ) : null}
                  </Fragment>
                );
              }) : <div className="field-grid">{group.fields.map((field) => <FieldRecord key={field.path} field={field} value={getFieldValue(field)} onChange={(value) => handleRenderedFieldChange(field, value)} editing={editing} issueState={issueState} showReviewIssues={representative} />)}</div>}
            </section>
          );
        })}
      </section>
      <FieldSourceInspector
        evidence={selectedField?.sourceEvidence}
        field={selectedField}
        value={selectedField ? getFieldValue(selectedField) : null}
        sources={sources}
        shipment={shipment}
        browseAll={selectedSourcePath === "__all_sources__"}
        panelKey={selectedSourcePath === "__all_sources__" ? `all-${sourcePanelRequest}` : selectedSourcePath}
        onClose={() => setSelectedSourcePath(null)}
      />
    </div>
  );
}

function NativeSourceDocumentPreview({ source }) {
  if (!source?.previewUrl) return null;
  return (
    <div className={`source-document-native-preview is-${source.previewKind || "file"}`}>
      {source.previewKind === "image" ? (
        <img src={source.previewUrl} alt={`Source: ${source.fileName}`} />
      ) : (
        <object data={source.previewUrl} type="application/pdf" aria-label={`Source: ${source.fileName}`}>
          <p>PDF preview is not available in this browser.</p>
        </object>
      )}
    </div>
  );
}

function createShipmentSourcePreview(source, shipment) {
  const [origin = "Origin not available", destination = "Destination not available"] = (shipment.route || "").split(" → ");
  const customerPo = `PO-${shipment.shipmentId.replace(/^TRK-/, "")}`;
  const pickupDate = formatDate(shipment.pickupDate, { withYear: true });
  if (source.documentType === "customer_email") {
    return {
      kind: "email",
      headers: [
        ["From", `${shipment.customer} <shipping@demo.example>`],
        ["To", "BEST USA Operations <ops-demo@example.com>"],
        ["Date", formatDateTime(shipment.lastUpdated)],
        ["Subject", `${shipment.serviceType} pickup request - ${customerPo}`],
      ],
      body: [
        "Hi Operations,",
        `Please arrange a ${shipment.serviceType} shipment for ${customerPo}.`,
        `Pickup is requested on ${pickupDate} from ${origin}. Delivery is required in ${destination}.`,
        "The shipping request and cargo details are attached for review.",
        `Thank you,\n${shipment.customer}`,
      ],
    };
  }
  if (source.documentType === "cargo_details") {
    return {
      kind: "spreadsheet",
      sheetName: "Cargo Details",
      headers: ["Line ID", "H/U Type", "H/U Count", "Package Type", "Piece Count", "Commodity Description", "Total Weight (lb)", "Dimensions (in)", "Freight Class", "NMFC", "Stackable", "Turnable", "Hazmat"],
      rows: [["CARGO-001", "Pallet", "8", "Carton", "120", "Consumer electronic accessories", "2450", "48 x 40 x 48", "70", "", "Yes", "Not confirmed", "No"]],
      summary: ["Total Handling Units: 8 pallets", "Total Packages / Pieces: 120 cartons", "Shipment Total Weight: 2,450 lb", "Turnable requires Operations confirmation."],
    };
  }
  return {
    kind: "shipping_request",
    title: "SHIPPING REQUEST",
    reference: shipment.shipmentId,
    fields: [
      ["Customer", shipment.customer],
      ["Customer PO", customerPo],
      ["Service", `${shipment.serviceType} · ${formatTransportMode(shipment.transportMode)}`],
      ["Route", `${origin} → ${destination}`],
      ["Pickup", pickupDate],
      ["Cargo", "8 pallets · 120 cartons · 2,450 lb"],
    ],
  };
}

function SourceDocumentEvidencePreview({ source }) {
  if (source?.previewUrl) return <NativeSourceDocumentPreview source={source} />;
  if (source?.preview?.kind === "email") {
    return (
      <div className="source-document-simulation source-document-email">
        <div className="source-email-headers">
          {source.preview.headers.map(([label, content]) => <div key={label}><span>{label}</span><strong>{content}</strong></div>)}
        </div>
        <div className="source-email-body">
          {source.preview.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </div>
    );
  }
  if (source?.preview?.kind === "spreadsheet") {
    return (
      <div className="source-document-simulation source-document-sheet">
        <div className="source-sheet-name">{source.preview.sheetName}</div>
        <div className="source-sheet-table-scroll">
          <table className="source-sheet-table">
            <thead><tr>{source.preview.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
            <tbody>{source.preview.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell || "—"}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <dl className="source-sheet-summary">
          {source.preview.summary.map((item) => {
            const [label, ...valueParts] = item.split(":");
            return <div key={item}><dt>{label}</dt><dd>{valueParts.join(":").trim()}</dd></div>;
          })}
        </dl>
      </div>
    );
  }
  if (source?.preview?.kind === "shipping_request") {
    return (
      <div className="source-document-simulation source-document-pdf">
        <div className="source-pdf-title"><strong>{source.preview.title}</strong><span>{source.preview.reference}</span></div>
        {source.preview.fields.map(([label, content]) => <div className="source-pdf-row" key={label}><span>{label}</span><strong>{content}</strong></div>)}
      </div>
    );
  }
  return (
    <div className="source-preview-unavailable">
      <FileSearch size={24} />
      <strong>Preview unavailable</strong>
      <span>This source has no verified preview content.</span>
    </div>
  );
}

function SourceDocumentPreviewDialog({ source, shipment, onClose }) {
  if (!source) return null;
  const sourceTypeLabel = source.documentType === "customer_email" ? "Customer email" : source.documentType === "cargo_details" ? "Cargo details" : source.documentType === "image" ? "Image" : "Shipping request";
  const sourceMetaLabel = source.sourceUrl ? "Provided source" : source.previewUrl ? "Uploaded source" : source.preview ? "Demo source" : source.added ? "Mock extraction" : "Preview unavailable";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="source-document-preview-title" className="source-document-preview-dialog">
      <DialogTitle className="source-document-preview-title" id="source-document-preview-title">
        <div><h2>{source.fileName}</h2><p>{sourceTypeLabel} · {sourceMetaLabel}</p></div>
      </DialogTitle>
      <DialogContent className="source-document-preview-content">
        <div className="source-document-viewer" aria-label={`${source.fileName} preview`}>
          <header className="source-document-page-meta">
            <span>{source.documentType === "cargo_details" ? source.preview?.sheetName || "Sheet 1" : "Page 1"}</span>
          </header>
          <div className={`source-document-viewport ${source.previewUrl ? "has-native-source" : ""}`}><SourceDocumentEvidencePreview source={source} /></div>
        </div>
      </DialogContent>
      <DialogActions className="source-document-preview-actions"><Button variant="outlined" onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

function DocumentsTab({ shipment, editing, onOpenBol, sources, onAddSources, onRemoveSource, fieldValues = {} }) {
  const [previewSourceId, setPreviewSourceId] = useState(null);
  const fileIcons = {
    customer_email: Mail,
    shipping_request: File,
    cargo_details: FileSpreadsheet,
  };
  const bolAvailable = Boolean(shipment.bolNumber);
  const previewSource = sources.find((source) => source.sourceId === previewSourceId);
  const canManageSources = editing;
  const bolDocuments = buildShipmentBolDocuments(shipment, fieldValues);

  return (
    <div className="document-workspace">
      <section className="document-group" aria-labelledby="source-documents-heading">
        <div className="document-group-heading">
          <div><h2 id="source-documents-heading">Reference</h2><p>Files used to prepare and review the shipment.</p></div>
          <div className="document-group-heading-actions">
            <span>{sources.length} {sources.length === 1 ? "doc" : "docs"}</span>
            {canManageSources ? (
              <Button component="label" variant="outlined" size="small" startIcon={<UploadCloud size={15} />}>
                Upload
                <input aria-label="Upload source documents" hidden multiple type="file" accept=".pdf,.eml,.msg,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={(event) => { onAddSources(event.target.files); event.target.value = ""; }} />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="source-document-table-scroll">
          <table className="source-document-table">
            <colgroup><col className="source-document-column" /><col className="source-uploader-column" /><col className="source-uploaded-at-column" /><col className="source-actions-column" /></colgroup>
            <thead>
              <tr><th scope="col">Document</th><th scope="col">Uploaded by</th><th scope="col">Uploaded at</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
            </thead>
            <tbody>
              {sources.map((source) => {
                const SourceIcon = fileIcons[source.documentType] || File;
                return (
                  <tr key={source.sourceId}>
                    <td>
                      <div className="source-document-cell">
                        <SourceIcon size={18} />
                        <span><strong>{source.fileName}</strong><small>{formatFileSize(source.size)}</small></span>
                      </div>
                    </td>
                    <td>{source.uploadedBy || "Demo user"}</td>
                    <td><time dateTime={source.uploadedAt}>{formatDateTime(source.uploadedAt)}</time></td>
                    <td>
                      <span className="source-document-row-actions">
                        {canManageSources ? (
                          <Tooltip title="Remove document" placement="top">
                            <IconButton color="error" className="source-document-remove-button" aria-label={`Remove ${source.fileName}`} onClick={() => onRemoveSource(source.sourceId)}><Trash2 size={16} /></IconButton>
                          </Tooltip>
                        ) : null}
                        <Tooltip title="Preview" placement="top">
                          <IconButton className="source-document-preview-button" aria-label={`Preview ${source.fileName}`} onClick={() => setPreviewSourceId(source.sourceId)}><ArrowUpRight size={16} /></IconButton>
                        </Tooltip>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="document-group" aria-labelledby="output-documents-heading">
        <div className="document-group-heading output-document-heading"><div><h2 id="output-documents-heading">Output</h2><p>One BOL is prepared for each consignee stop.</p></div><span>{formatBolCount(bolDocuments.length)}</span></div>
        <div className="source-document-table-scroll">
          <table className="source-document-table output-document-table">
            <colgroup><col className="output-document-column" /><col className="output-generated-at-column" /><col className="output-actions-column" /></colgroup>
            <thead>
              <tr><th scope="col">Document</th><th scope="col">Generated at</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
            </thead>
            <tbody>
              {bolDocuments.map((stop, stopIndex) => {
                const stopLabel = `Consignee ${stopIndex + 1}`;
                return <tr key={stop.stopId}>
                <td>
                  {bolAvailable ? (
                    <div className="source-document-cell">
                      <FileOutput size={18} />
                      <span><strong>Bill of Lading · {stopLabel}</strong><small>{stop.company} · {stop.cargoLines.length} cargo {stop.cargoLines.length === 1 ? "item" : "items"}</small></span>
                    </div>
                  ) : (
                    <div className="source-document-cell output-document-pending" aria-label={`Bill of Lading for ${stopLabel} pending shipment submission`}>
                      <FileOutput size={18} />
                      <span><strong>Bill of Lading · {stopLabel}</strong><small>{stop.company} · Generated after shipment submission</small></span>
                    </div>
                  )}
                </td>
                <td>{bolAvailable ? <time dateTime={shipment.lastUpdated}>{formatDateTime(shipment.lastUpdated)}</time> : <span className="table-empty">—</span>}</td>
                <td>
                  {bolAvailable ? (
                    <Tooltip title="Preview BOL" placement="top">
                      <IconButton className="source-document-preview-button" aria-label={`Preview Bill of Lading ${stop.bolNumber}`} onClick={() => onOpenBol(shipment.shipmentId, stop)}><ArrowUpRight size={16} /></IconButton>
                    </Tooltip>
                  ) : null}
                </td>
              </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
      <SourceDocumentPreviewDialog source={previewSource} shipment={shipment} onClose={() => setPreviewSourceId(null)} />
    </div>
  );
}

function SourcePreview({ issue }) {
  const sourceNames = Object.fromEntries(fixture.sourceSet.map((source) => [source.sourceId, source.fileName]));
  return (
    <section className="source-preview" aria-label="Selected source evidence">
      <div className="source-preview-heading">
        <div>
          <h3>Source Evidence</h3>
          <span>{issue ? formatStatus(issue.issueType) : "Select an issue"}</span>
        </div>
        <StatusBadge status={issue?.severity || "warning"} />
      </div>
      {issue ? (
        <>
          <div className="document-paper">
            <p className="paper-label">Source excerpt · Synthetic demo</p>
            {issue.sourceIds?.length ? issue.sourceIds.map((sourceId, index) => (
              <div className="paper-line" key={sourceId}>
                <small>{sourceNames[sourceId]}</small>
                <strong>
                  {issue.sourceValues?.[index]?.value ?? issue.originalValue ?? "No extracted value"}
                </strong>
                <span>{issue.sourceLocations?.[index] || "No source location"}</span>
              </div>
            )) : (
              <div className="paper-line">
                <small>No source supplied</small>
                <strong>Value is missing</strong>
                <span>Ops input is needed before the candidate rule can pass.</span>
              </div>
            )}
          </div>
          <p className="prototype-question"><Info size={15} />{issue.prototypeQuestion}</p>
        </>
      ) : (
        <p className="source-placeholder">Choose a review issue to inspect its source and working assumption.</p>
      )}
    </section>
  );
}

function IssueActions({ issue, state, onResolve }) {
  if (state.status === "resolved") {
    return (
      <div className="resolution-result">
        <CheckCircle2 size={16} />
        <span>{state.label}</span>
      </div>
    );
  }

  if (issue.issueType === "missing") {
    return (
      <div className="issue-actions">
        <button type="button" className="small-action primary-small" onClick={() => onResolve(issue.issueId, { label: "Added: Dry Van · demo value", value: "Dry Van" })}>Add demo value</button>
        <button type="button" className="small-action" onClick={() => onResolve(issue.issueId, { label: "Deferred with owner unresolved", value: null, deferred: true })}>Defer</button>
      </div>
    );
  }
  if (issue.issueType === "conflict") {
    return (
      <div className="issue-actions">
        {issue.sourceValues.map((sourceValue, index) => (
          <button
            type="button"
            className="small-action"
            key={sourceValue.sourceId}
            onClick={() => onResolve(issue.issueId, { label: `Selected ${sourceValue.value} pallets from source ${index + 1}`, value: sourceValue.value })}
          >
            Use {sourceValue.value} pallets
          </button>
        ))}
      </div>
    );
  }
  if (issue.issueType === "low_confidence") {
    return (
      <div className="issue-actions">
        <button type="button" className="small-action primary-small" onClick={() => onResolve(issue.issueId, { label: "Accepted after source review", value: issue.proposedValue })}>Accept value</button>
        <button type="button" className="small-action" onClick={() => onResolve(issue.issueId, { label: "Edited by Demo user", value: issue.proposedValue })}>Edit</button>
      </div>
    );
  }
  return (
    <div className="issue-actions">
      <button type="button" className="small-action primary-small" onClick={() => onResolve(issue.issueId, { label: "Kept in Instructions", includeInstructions: true })}>Keep in Instructions</button>
      <button type="button" className="small-action" onClick={() => onResolve(issue.issueId, { label: "Ignored for this demo", includeInstructions: false })}>Ignore</button>
    </div>
  );
}

function ReviewTab({ issueState, selectedIssueId, onSelectIssue, onResolve, filter, onFilterChange }) {
  const selectedIssue = demoIssues.find((issue) => issue.issueId === selectedIssueId) || demoIssues[0];
  const filteredIssues = demoIssues.filter((issue) => {
    if (filter === "all") return true;
    if (filter === "blocking") return issue.severity === "candidate_blocker";
    if (filter === "warning") return issue.severity === "warning";
    if (filter === "resolved") return issueState[issue.issueId].status === "resolved";
    return true;
  });
  const resolvedCount = demoIssues.filter((issue) => issueState[issue.issueId].status === "resolved").length;

  return (
    <div className="review-layout">
      <SourcePreview issue={selectedIssue} />
      <section className="review-worklist">
        <div className="review-summary">
          <div><strong>{demoIssues.length - resolvedCount}</strong><span>Unresolved</span></div>
          <div><strong>{demoIssues.filter((issue) => issue.severity === "candidate_blocker" && issueState[issue.issueId].status === "unresolved").length}</strong><span>Candidate blockers</span></div>
          <div><strong>{resolvedCount}</strong><span>Resolved</span></div>
        </div>
        <div className="review-filters" aria-label="Review issue filters">
          {[
            ["all", "All"],
            ["blocking", "Blocking"],
            ["warning", "Warnings"],
            ["resolved", "Resolved"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => onFilterChange(value)}>{label}</button>
          ))}
        </div>
        <div className="issue-list">
          {filteredIssues.length ? filteredIssues.map((issue) => {
            const state = issueState[issue.issueId];
            return (
              <article
                key={issue.issueId}
                className={`issue-card ${selectedIssueId === issue.issueId ? "selected" : ""} ${state.status === "resolved" ? "resolved" : ""}`}
                onClick={() => onSelectIssue(issue.issueId)}
              >
                <button className="issue-select" type="button" onClick={() => onSelectIssue(issue.issueId)}>
                  <span className="issue-type-icon">
                    {issue.issueType === "conflict" ? <GitCompareArrows size={16} /> : issue.issueType === "missing" ? <CircleAlert size={16} /> : <ClipboardCheck size={16} />}
                  </span>
                  <span className="issue-main">
                    <span className="issue-labels">
                      <strong>{formatStatus(issue.issueType)}</strong>
                      <StatusBadge status={issue.severity} />
                    </span>
                    <span className="issue-field-name">{issueFieldLabels[issue.fieldPath] || "Shipment field"}</span>
                    <span className="issue-value">{issue.originalValue ?? "No value found"}</span>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <IssueActions issue={issue} state={state} onResolve={onResolve} />
              </article>
            );
          }) : <div className="inline-empty"><CheckCircle2 size={19} />No issues in this filter.</div>}
        </div>
      </section>
    </div>
  );
}

function OutputTab({ committed, issueState }) {
  const job = fixture.jobDraft;
  const equipmentResolution = issueState["ISSUE-MISSING-001"];
  const palletResolution = issueState["ISSUE-CONFLICT-001"];
  const instructionResolution = issueState["ISSUE-UNMAPPED-001"];
  const equipmentValue = equipmentResolution.value || (equipmentResolution.deferred ? "Deferred · owner unresolved" : "Equipment type unresolved");
  const palletValue = palletResolution.value ? `${palletResolution.value} pallets` : "8 / 10 conflict";
  const instructionValue = instructionResolution.status === "resolved" && instructionResolution.includeInstructions === false
    ? "Unmapped charge instruction ignored for this demo."
    : job.instructions;
  return (
    <div className="panel-stack output-stack">
      <div className={`notice ${committed ? "notice-green" : "notice-neutral"}`}>
        {committed ? <CheckCircle2 size={18} /> : <Info size={18} />}
        <div>
          <strong>{committed ? "Shipment confirmed for this browser session" : "Preview before commit"}</strong>
          <span>{committed ? "Resolved values now flow into the connected output preview." : "This preview shows content coverage, not a production-ready BOL generator."}</span>
        </div>
      </div>
      <section className="bol-sheet" aria-label="Bill of lading preview">
        <header>
          <div><span>BEST USA</span><strong>Bill of Lading Preview</strong></div>
          <div><small>Job</small><b>{job.overview.jobId}</b></div>
        </header>
        <div className="bol-grid">
          <section><small>Shipper</small><strong>{job.shipper.company}</strong><span>{job.shipper.address}</span></section>
          <section><small>Consignee</small><strong>{job.consignee.company}</strong><span>{job.consignee.address}</span></section>
          <section><small>PO / Reference</small><strong>{job.identifiers.customerPONumber}</strong><span>{job.identifiers.referenceNumber}</span></section>
          <section><small>Transport / service</small><strong>{formatTransportMode(job.overview.transportMode)} / {job.overview.serviceType}</strong><span>{committed ? equipmentValue : "Equipment type unresolved"}</span></section>
        </div>
        <table>
          <thead><tr><th>Handling Units</th><th>Packages</th><th>Weight</th><th>Commodity</th></tr></thead>
          <tbody><tr><td>{committed ? palletValue : "8 / 10 conflict"}</td><td>120 cartons</td><td>2,450 lb</td><td>Consumer electronic accessories</td></tr></tbody>
        </table>
        <div className="bol-instructions"><small>Special instructions</small><p>{instructionValue}</p></div>
        <footer><span>Carrier / PRO: Not assigned</span><span>Signatures & legal text: Definition required</span></footer>
      </section>
    </div>
  );
}

function SubmitConfirmation({ open, shipment, job, equipmentType, blockerCount, onBack, onConfirm }) {
  const isBlocked = blockerCount > 0;
  return (
    <Dialog className="submit-confirmation-dialog" open={open} onClose={onBack} maxWidth="md" fullWidth aria-labelledby="submit-confirmation-title">
      <DialogTitle component="div" className="submit-confirmation-heading">
        <div>
          <h2 id="submit-confirmation-title">Review &amp; Confirm</h2>
        </div>
        <div className="submit-confirmation-title-actions">
          <IconButton aria-label="Close confirmation" onClick={onBack}><X size={18} /></IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className="submit-confirmation-content">
        <div className={`submit-readiness ${isBlocked ? "is-blocked" : "is-info"}`}>
          {isBlocked ? <CircleAlert size={18} /> : <Info size={18} />}
          <div>
            {isBlocked && <strong>Resolve candidate blockers before confirming</strong>}
            <span>{isBlocked ? "Return to shipment details and resolve or defer the blocking issues." : "After confirmation, Charge & Cost is recalculated from the confirmed shipment data. The BOL becomes ready to export."}</span>
          </div>
        </div>
        <div className="submit-confirmation-card">
          <dl>
            <div><dt>Customer</dt><dd>{shipment.customer}</dd></div>
            <div className="confirmation-route"><dt>Route</dt><dd>{shipment.route}</dd></div>
            <div><dt>Pickup</dt><dd>{formatDate(shipment.pickupDate, { withYear: true })}</dd></div>
            <div><dt>Customer PO</dt><dd>{job.identifiers.customerPONumber}</dd></div>
            <div><dt>Transport mode</dt><dd>{formatTransportMode(job.overview.transportMode)}</dd></div>
            <div><dt>Service type</dt><dd>{job.overview.serviceType}</dd></div>
            <div><dt>Equipment</dt><dd>{equipmentType || "Needs review"}</dd></div>
            <div><dt>Owner</dt><dd>{job.overview.owner}</dd></div>
            <div><dt>Cargo</dt><dd>8 pallets · 2,450 lb</dd></div>
            <div><dt>Services</dt><dd>Liftgate · Notify consignee</dd></div>
          </dl>
        </div>
      </DialogContent>
      <DialogActions className="submit-confirmation-actions">
        <Button variant="outlined" color="secondary" onClick={onBack}>Cancel</Button>
        <Button variant="contained" disabled={isBlocked} onClick={onConfirm}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
}

function ShipmentPanel({
  shipment,
  partners,
  quotePlans,
  carrierRatePlans,
  committed,
  issueState,
  selectedIssueId,
  setSelectedIssueId,
  resolveIssue,
  reviewFilter,
  setReviewFilter,
  onClose,
  onDelete,
  onCommit,
  onStatusChange,
  onSaveDraft,
  onSaveRateSelection,
  onOpenQuote,
  onOpenCarrierRate,
  onOpenBol,
  onExportBol,
  manualAdjustments,
  pricingLineOverrides,
  onUpdatePricingLine,
  onRestorePricingLineOverrides,
  onAddAdjustment,
  onUpdateAdjustment,
  onRemoveAdjustment,
  onRestoreAdjustments,
  initialEditing = false,
  initialDetailTab = "details",
  initialFieldValues,
  initialRateSelection,
  onRestoreIssueState,
  initialSourceFiles = EMPTY_SOURCE_FILES,
}) {
  const [pricingNeedsRecalculation, setPricingNeedsRecalculation] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState(initialDetailTab);
  const [sourcePanelRequest, setSourcePanelRequest] = useState(0);
  const [editing, setEditing] = useState(initialEditing);
  const [shipmentActionAnchorEl, setShipmentActionAnchorEl] = useState(null);
  const [selectedRatePlanId, setSelectedRatePlanId] = useState(() => Object.prototype.hasOwnProperty.call(initialRateSelection || {}, "customer")
    ? initialRateSelection.customer
    : pricingResults[shipment.shipmentId]?.ratePlanId || "");
  const [selectedVendorRatePlanId, setSelectedVendorRatePlanId] = useState(() => initialRateSelection?.vendor
    || pricingResults[shipment.shipmentId]?.vendorCost?.ratePlanId
    || "");
  const rateSelectionBaselineRef = useRef({ customer: selectedRatePlanId, vendor: selectedVendorRatePlanId });
  useEffect(() => {
    const customer = Object.prototype.hasOwnProperty.call(initialRateSelection || {}, "customer")
      ? initialRateSelection.customer
      : pricingResults[shipment.shipmentId]?.ratePlanId || "";
    const vendor = initialRateSelection?.vendor
      || pricingResults[shipment.shipmentId]?.vendorCost?.ratePlanId
      || "";
    setSelectedRatePlanId(customer);
    setSelectedVendorRatePlanId(vendor);
    rateSelectionBaselineRef.current = { customer, vendor };
  }, [shipment.shipmentId, initialRateSelection]);
  const [fieldValues, setFieldValues] = useState(() => initialFieldValues || {});
  const editBaselineRef = useRef({ fieldValues: initialFieldValues || {}, issueState });
  const [removedSourceIds, setRemovedSourceIds] = useState([]);
  const mapExtractedSources = (sourceFiles) => {
    const claimedFixtureSourceIds = new Set();
    return sourceFiles.map((sourceFile, index) => {
      const sourceRecord = typeof sourceFile === "string" ? { name: sourceFile } : sourceFile;
      const fileName = sourceRecord.name || sourceRecord.fileName;
      const documentType = sourceRecord.documentType || (/\.eml$/i.test(fileName) ? "customer_email" : /\.(xlsx?|csv)$/i.test(fileName) ? "cargo_details" : /\.(png|jpe?g)$/i.test(fileName) ? "image" : "shipping_request");
      const evidenceDocumentType = documentType === "image" ? "shipping_request" : documentType;
      const matchingFixtureSource = fixture.sourceSet.find((source) => source.documentType === evidenceDocumentType && !claimedFixtureSourceIds.has(source.sourceId));
      if (matchingFixtureSource) claimedFixtureSourceIds.add(matchingFixtureSource.sourceId);
      return {
        sourceId: matchingFixtureSource?.sourceId || `CREATED-${index}-${fileName}`,
        fileName,
        documentType,
        previewKind: sourceRecord.previewKind || null,
        previewUrl: sourceRecord.previewUrl || null,
        size: sourceRecord.size || null,
        version: 1,
        added: true,
        status: "needs_review",
        uploadedBy: "Demo user",
        uploadedAt: new Date().toISOString(),
      };
    });
  };
  const [additionalSources, setAdditionalSources] = useState(() => mapExtractedSources(initialSourceFiles));
  const sourceEditBaselineRef = useRef({ additionalSources, removedSourceIds: [] });
  const adjustmentEditBaselineRef = useRef(manualAdjustments);
  const pricingLineEditBaselineRef = useRef(pricingLineOverrides);
  const pricingRecalculationBaselineRef = useRef(false);
  useEffect(() => {
    const savedValues = initialFieldValues || {};
    const savedSources = mapExtractedSources(initialSourceFiles);
    setFieldValues(savedValues);
    setEditing(initialEditing);
    setActiveDetailTab(initialDetailTab);
    setSourcePanelRequest(0);
    setShipmentActionAnchorEl(null);
    setPricingNeedsRecalculation(false);
    pricingRecalculationBaselineRef.current = false;
    editBaselineRef.current = { fieldValues: savedValues, issueState };
    setAdditionalSources(savedSources);
    setRemovedSourceIds([]);
    sourceEditBaselineRef.current = { additionalSources: savedSources, removedSourceIds: [] };
    adjustmentEditBaselineRef.current = manualAdjustments;
    pricingLineEditBaselineRef.current = pricingLineOverrides;
  }, [shipment.shipmentId, initialSourceFiles, initialEditing, initialDetailTab]);
  useEffect(() => {
    if (!additionalSources.some((source) => source.status === "extracting")) return undefined;
    const timer = window.setTimeout(() => {
      setAdditionalSources((current) => current.map((source) => source.status === "extracting" ? { ...source, status: "needs_review" } : source));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [additionalSources]);
  const createdWithoutSourceDocuments = ["scratch", "existing"].includes(fieldValues.__startMode);
  const representative = shipment.shipmentId === fixture.fixtureId && !createdWithoutSourceDocuments;
  const equipmentType = Object.prototype.hasOwnProperty.call(fieldValues, "equipmentRequirements[0].type")
    ? fieldValues["equipmentRequirements[0].type"]
    : representative
      ? issueState["ISSUE-MISSING-001"]?.value || ""
      : "Dry Van";
  const shipmentSourceSet = representative
    ? fixture.sourceSet
    : createdWithoutSourceDocuments
      ? []
      : fixture.sourceSet.map((source, index) => {
        const { preview, previewKind, previewUrl, sourceUrl, ...sourceWithoutProvidedEvidence } = source;
        return {
          ...sourceWithoutProvidedEvidence,
          sourceId: `${shipment.shipmentId}-SOURCE-${index + 1}`,
          fileName: source.fileName.replaceAll(fixture.fixtureId, shipment.shipmentId),
          version: 1,
          preview: createShipmentSourcePreview(source, shipment),
        };
      });
  const sourceDocuments = (initialSourceFiles.length ? additionalSources : [...shipmentSourceSet, ...additionalSources]).filter((source) => !removedSourceIds.includes(source.sourceId));
  const addSourceDocuments = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const timestamp = Date.now();
    setAdditionalSources((current) => [
      ...current,
      ...files.map((file, index) => ({
        sourceId: `ADDITIONAL-${timestamp}-${index}`,
        fileName: file.name,
        documentType: /\.eml$/i.test(file.name) ? "customer_email" : /\.(xlsx?|csv)$/i.test(file.name) ? "cargo_details" : "shipping_request",
        version: 1,
        added: true,
        status: "extracting",
        uploadedBy: "Demo user",
        uploadedAt: new Date().toISOString(),
      })),
    ]);
  };
  const removeSourceDocument = (sourceId) => {
    setAdditionalSources((current) => current.filter((source) => source.sourceId !== sourceId));
    setRemovedSourceIds((current) => current.includes(sourceId) ? current : [...current, sourceId]);
  };
  const storedPricingResult = pricingResults[shipment.shipmentId];
  const appliedVendorRatePlanId = storedPricingResult?.vendorCost?.ratePlanId || "";
  const pricingCustomer = fieldValues["overview.customer"] || shipment.customer;
  const assignedCarrier = fieldValues["carrierAssignment.carrier"] || fixture.jobDraft.carrierAssignment.carrier || "";
  const ratePlanOptions = useMemo(() => quotePlans.filter((quote) => quote.customer === pricingCustomer
    && quote.transportMode === shipment.transportMode
    && (quote.status === "accepted" || quote.quoteId === storedPricingResult?.ratePlanId)), [quotePlans, pricingCustomer, shipment.transportMode, storedPricingResult?.ratePlanId]);
  const compatibleVendorRatePlans = useMemo(() => carrierRatePlans.filter((plan) => plan.ratePlanId === appliedVendorRatePlanId
    || (plan.transportMode === shipment.transportMode
      && plan.serviceType === shipment.serviceType
      && plan.status === "accepted")), [carrierRatePlans, shipment.transportMode, shipment.serviceType, appliedVendorRatePlanId]);
  const vendorRatePlanOptions = assignedCarrier
    ? compatibleVendorRatePlans.filter((plan) => plan.counterparty === assignedCarrier || plan.ratePlanId === appliedVendorRatePlanId)
    : compatibleVendorRatePlans;
  const defaultCustomerRatePlanId = ratePlanOptions.find((quote) => quote.status === "accepted" && quote.serviceScope?.startsWith(shipment.serviceType))?.quoteId
    || ratePlanOptions.find((quote) => quote.status === "accepted")?.quoteId
    || ratePlanOptions[0]?.quoteId
    || "";
  const defaultVendorRatePlanId = vendorRatePlanOptions.find((plan) => plan.ratePlanId === appliedVendorRatePlanId)?.ratePlanId
    || vendorRatePlanOptions.find((plan) => plan.status === "accepted")?.ratePlanId
    || vendorRatePlanOptions[0]?.ratePlanId
    || "";
  const ratePlanOptionKey = ratePlanOptions.map((plan) => plan.quoteId).join("|");
  const vendorRatePlanOptionKey = vendorRatePlanOptions.map((plan) => plan.ratePlanId).join("|");
  useEffect(() => {
    const customerSelectionValid = ratePlanOptions.some((plan) => plan.quoteId === selectedRatePlanId);
    const vendorSelectionValid = vendorRatePlanOptions.some((plan) => plan.ratePlanId === selectedVendorRatePlanId);
    const nextCustomerRatePlanId = customerSelectionValid ? selectedRatePlanId : defaultCustomerRatePlanId;
    const nextVendorRatePlanId = vendorSelectionValid ? selectedVendorRatePlanId : defaultVendorRatePlanId;
    if (nextCustomerRatePlanId === selectedRatePlanId && nextVendorRatePlanId === selectedVendorRatePlanId) return;
    setSelectedRatePlanId(nextCustomerRatePlanId);
    setSelectedVendorRatePlanId(nextVendorRatePlanId);
    onSaveRateSelection?.({ customer: nextCustomerRatePlanId, vendor: nextVendorRatePlanId });
  }, [shipment.shipmentId, pricingCustomer, assignedCarrier, ratePlanOptionKey, vendorRatePlanOptionKey, defaultCustomerRatePlanId, defaultVendorRatePlanId, selectedRatePlanId, selectedVendorRatePlanId]);
  const changeCustomerRatePlan = (ratePlanId) => {
    setSelectedRatePlanId(ratePlanId);
    onSaveRateSelection?.({ customer: ratePlanId, vendor: selectedVendorRatePlanId });
  };
  const changeVendorRatePlan = (ratePlanId) => {
    setSelectedVendorRatePlanId(ratePlanId);
    onSaveRateSelection?.({ customer: selectedRatePlanId, vendor: ratePlanId });
  };
  const relatedQuote = ratePlanOptions.find((quote) => quote.quoteId === selectedRatePlanId);
  const relatedVendorRatePlan = vendorRatePlanOptions.find((plan) => plan.ratePlanId === selectedVendorRatePlanId);
  const pricingResult = storedPricingResult || createPricingResultFromRatePlan(shipment, relatedQuote);
  const appliedPricingResult = applyVendorRatePlan(applyQuotationPlan(pricingResult, relatedQuote), relatedVendorRatePlan);
  const blockerCount = representative
    ? demoIssues.filter((issue) => issue.severity === "candidate_blocker" && issueState[issue.issueId].status === "unresolved").length
    : 0;
  const job = fixture.jobDraft;
  const beginEditing = () => {
    editBaselineRef.current = { fieldValues, issueState };
    sourceEditBaselineRef.current = { additionalSources, removedSourceIds };
    adjustmentEditBaselineRef.current = {
      customer: [...(manualAdjustments.customer || [])],
      vendor: [...(manualAdjustments.vendor || [])],
    };
    pricingLineEditBaselineRef.current = {
      customer: { ...(pricingLineOverrides.customer || {}) },
      vendor: { ...(pricingLineOverrides.vendor || {}) },
    };
    rateSelectionBaselineRef.current = { customer: selectedRatePlanId, vendor: selectedVendorRatePlanId };
    pricingRecalculationBaselineRef.current = pricingNeedsRecalculation;
    setEditing(true);
  };
  const cancelEditing = () => {
    setFieldValues(editBaselineRef.current.fieldValues);
    onRestoreIssueState?.(editBaselineRef.current.issueState);
    setAdditionalSources(sourceEditBaselineRef.current.additionalSources);
    setRemovedSourceIds(sourceEditBaselineRef.current.removedSourceIds);
    setSelectedRatePlanId(rateSelectionBaselineRef.current.customer);
    setSelectedVendorRatePlanId(rateSelectionBaselineRef.current.vendor);
    setPricingNeedsRecalculation(pricingRecalculationBaselineRef.current);
    if (JSON.stringify(manualAdjustments) !== JSON.stringify(adjustmentEditBaselineRef.current)) {
      onRestoreAdjustments?.(adjustmentEditBaselineRef.current);
    }
    if (JSON.stringify(pricingLineOverrides) !== JSON.stringify(pricingLineEditBaselineRef.current)) {
      onRestorePricingLineOverrides?.(pricingLineEditBaselineRef.current);
    }
    setEditing(false);
  };
  const saveDraft = () => {
    editBaselineRef.current = { fieldValues, issueState };
    sourceEditBaselineRef.current = { additionalSources, removedSourceIds };
    adjustmentEditBaselineRef.current = manualAdjustments;
    pricingLineEditBaselineRef.current = pricingLineOverrides;
    onSaveDraft?.(fieldValues);
    onSaveRateSelection?.({ customer: selectedRatePlanId, vendor: selectedVendorRatePlanId });
    setEditing(false);
  };
  const recalculatePricing = () => {
    setPricingNeedsRecalculation(false);
    setActiveDetailTab("billing");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };
  const changeDetailTab = (_, value) => {
    setActiveDetailTab(value);
    if (value !== "details") setSourcePanelRequest(0);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };
  const draftSubmissionAvailable = shipment.listStatus === "draft" && !committed;
  const billingWorkspaceAvailable = true;
  const contentEditing = editing && (draftSubmissionAvailable || billingWorkspaceAvailable);

  return (
    <>
      <DetailPageFrame
      title={shipment.shipmentId}
      meta={`${formatTransportMode(shipment.transportMode)} · ${shipment.serviceType}`}
      onClose={onClose}
      lastUpdated={formatDateTime(shipment.lastUpdated)}
      lastUpdatedAction={<ShipmentHistoryControl shipment={shipment} />}
      stickyHeader
      hideBack={editing}
      headerActions={<>{(draftSubmissionAvailable || billingWorkspaceAvailable) ? <>
        {editing ? <>
          <Button variant="text" color="secondary" onClick={cancelEditing}>Cancel</Button>
          <Button variant="contained" startIcon={<FileText size={16} />} onClick={saveDraft}>Save changes</Button>
        </> : <>
          <ShipmentProgressControl shipment={shipment} onChange={onStatusChange} />
          <Button variant="outlined" startIcon={<PenLine size={16} />} onClick={beginEditing}>Edit</Button>
          <Button variant="contained" startIcon={<FileOutput size={17} />} onClick={() => onExportBol(shipment.shipmentId, fieldValues)}>Export BOL</Button>
        </>}
      </> : null}
        {!editing ? <>
          <Tooltip title="More actions" placement="bottom">
            <IconButton
              aria-label="More shipment actions"
              aria-controls={shipmentActionAnchorEl ? "shipment-detail-actions-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(shipmentActionAnchorEl)}
              onClick={(event) => setShipmentActionAnchorEl(event.currentTarget)}
            >
              <MoreVertical size={19} />
            </IconButton>
          </Tooltip>
          <Menu
            id="shipment-detail-actions-menu"
            anchorEl={shipmentActionAnchorEl}
            open={Boolean(shipmentActionAnchorEl)}
            onClose={() => setShipmentActionAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: { sx: { minWidth: 176, mt: .5, border: "1px solid", borderColor: "divider", borderRadius: "8px", boxShadow: "0 8px 24px rgba(16, 24, 40, .14)" } },
              list: { "aria-label": "Shipment actions", dense: true },
            }}
          >
            <MenuItem
              sx={{ minHeight: 40, gap: 1, color: "error.main" }}
              onClick={() => {
                setShipmentActionAnchorEl(null);
                onDelete?.(shipment.shipmentId);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete shipment
            </MenuItem>
          </Menu>
        </> : null}
      </>}
    >
      <div className="shipment-single-page">
          <Tabs className="shipment-workspace-tabs" value={activeDetailTab} onChange={changeDetailTab} aria-label="Shipment workspace">
            <Tab value="details" label="Details" />
            <Tab value="billing" label="Charge & Cost" />
            <Tab value="documents" label="Documents" />
          </Tabs>

          {activeDetailTab === "documents" ? (
            <section className="source-page-section" aria-label="Shipment documents">
              <DocumentsTab shipment={shipment} editing={editing} onOpenBol={(shipmentId, stop) => onOpenBol(shipmentId, stop, fieldValues)} sources={sourceDocuments} onAddSources={addSourceDocuments} onRemoveSource={removeSourceDocument} fieldValues={fieldValues} />
            </section>
          ) : activeDetailTab === "billing" ? (
            <section className="single-page-section billing-page-section" id="charges-section" aria-labelledby={`charges-${shipment.shipmentId}`}>
              {pricingNeedsRecalculation ? (
                <Alert
                  className="pricing-recalculation-alert"
                  severity="warning"
                  variant="outlined"
                  icon={<CircleDollarSign size={20} />}
                  action={<Button size="small" variant="outlined" onClick={recalculatePricing}>Recalculate</Button>}
                >
                  <strong>Pricing needs recalculation</strong>
                  <div>Shipment details that affect pricing have changed. Recalculate to refresh Customer Charge and Vendor Cost.</div>
                </Alert>
              ) : null}
              <ShipmentPricingSection shipment={{ ...shipment, customer: pricingCustomer }} pricingResult={appliedPricingResult} ratePlan={relatedQuote} ratePlanOptions={ratePlanOptions} selectedRatePlanId={selectedRatePlanId} onRatePlanChange={changeCustomerRatePlan} vendorRatePlanOptions={vendorRatePlanOptions} selectedVendorRatePlanId={selectedVendorRatePlanId} onVendorRatePlanChange={changeVendorRatePlan} adjustments={manualAdjustments} pricingLineOverrides={pricingLineOverrides} onUpdatePricingLine={onUpdatePricingLine} onAddAdjustment={onAddAdjustment} onUpdateAdjustment={onUpdateAdjustment} onRemoveAdjustment={onRemoveAdjustment} onOpenRatePlan={onOpenQuote} onOpenVendorRatePlan={onOpenCarrierRate} editing={contentEditing} actorLabel="Demo user" />
            </section>
          ) : <>
          <section className={`single-page-section ${contentEditing ? "is-editing" : "is-viewing"}`} id="job-fields-section" aria-labelledby="job-fields-section-title">
            <div className="detail-section-heading">
              <div className="detail-section-title">
                <h2 id="job-fields-section-title">Shipment Details</h2>
              </div>
              <Button
                variant="text"
                size="small"
                startIcon={<FileSearch size={16} />}
                aria-controls="field-source-inspector"
                onClick={() => setSourcePanelRequest((current) => current + 1)}
              >
                {sourceDocuments.length} sources
              </Button>
            </div>
            <JobFieldsTab
              shipment={shipment}
              issueState={issueState}
              fieldValues={fieldValues}
              onFieldChange={(path, value) => {
                const previousValue = fieldValues[path];
                setFieldValues((current) => ({ ...current, [path]: value }));
                const pricingRelevant = path === "overview.customer"
                  || path === "overview.serviceType"
                  || path === "equipmentRequirements[0].type"
                  || path === "serviceRequirements[]"
                  || path === "carrierAssignment.carrier"
                  || path.startsWith("routeStops")
                  || path.startsWith("cargoLines");
                if (pricingRelevant && JSON.stringify(previousValue) !== JSON.stringify(value)) setPricingNeedsRecalculation(true);
              }}
              onResolve={resolveIssue}
              partners={partners}
              customer={shipment.customer}
              editing={contentEditing}
              sources={sourceDocuments}
              sourcePanelRequest={sourcePanelRequest}
              onOpenCharges={() => {
                setActiveDetailTab("billing");
                setSourcePanelRequest(0);
                window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
              }}
            />
          </section>

          </>}
      </div>
      </DetailPageFrame>
    </>
  );
}

function CreateShipmentDialog({ open, onClose, onExtract, onManual, onStartExisting, existingShipments = [] }) {
  const [startMethod, setStartMethod] = useState("documents");
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [existingShipmentMode, setExistingShipmentMode] = useState("OCEAN");
  const [existingShipmentId, setExistingShipmentId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const previewUrlsRef = useRef(new Set());

  useEffect(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setStartMethod("documents");
    setDragActive(false);
    setFiles([]);
    setSelectedFileId(null);
    const initialMode = existingShipments[0]?.transportMode || "OCEAN";
    setExistingShipmentMode(initialMode);
    setExistingShipmentId(existingShipments.find((shipment) => shipment.transportMode === initialMode)?.shipmentId || "");
    setUploadProgress(0);
    setUploading(false);
    setExtracting(false);
    setExtractionProgress(0);
  }, [open]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!uploading) return undefined;
    const steps = [18, 46, 74, 100];
    let index = 0;
    setUploadProgress(steps[index]);
    const timer = window.setInterval(() => {
      index += 1;
      setUploadProgress(steps[index]);
      if (index === steps.length - 1) {
        window.clearInterval(timer);
        setUploading(false);
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [uploading]);

  useEffect(() => {
    if (!extracting) return undefined;
    setExtractionProgress(4);
    const timer = window.setInterval(() => {
      setExtractionProgress((current) => {
        const next = Math.min(100, current + (current < 60 ? 7 : 4));
        if (next === 100) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            files.forEach((file) => {
              if (file.previewUrl) previewUrlsRef.current.delete(file.previewUrl);
            });
            onExtract(files);
          }, 260);
        }
        return next;
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [extracting, files, onExtract]);

  const inferDocumentType = (fileName) => {
    const extension = fileName.split(".").at(-1)?.toLowerCase();
    if (["eml", "msg"].includes(extension)) return "customer_email";
    if (["xlsx", "xls", "csv"].includes(extension)) return "cargo_details";
    if (["png", "jpg", "jpeg"].includes(extension)) return "image";
    return "shipping_request";
  };

  const submitFiles = (fileList) => {
    const uploadedFiles = Array.from(fileList || []);
    if (!uploadedFiles.length) return;
    const timestamp = Date.now();
    const nextFiles = uploadedFiles.map((file, index) => {
      const extension = file.name.split(".").at(-1)?.toLowerCase();
      const previewKind = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" || extension === "pdf" ? "pdf" : null;
      const previewUrl = previewKind ? URL.createObjectURL(file) : null;
      if (previewUrl) previewUrlsRef.current.add(previewUrl);
      return {
        id: `${timestamp}-${index}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        documentType: inferDocumentType(file.name),
        previewKind,
        previewUrl,
      };
    });
    setDragActive(false);
    setFiles((current) => [...current, ...nextFiles]);
    setSelectedFileId((current) => current || nextFiles[0].id);
    setUploadProgress(0);
    setUploading(true);
  };
  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];
  const existingModeOptions = selectOptions(["Ocean", "Air"]);
  const existingModeValue = formatTransportMode(existingShipmentMode);
  const modeShipments = existingShipments.filter((shipment) => shipment.transportMode === existingShipmentMode);
  const selectedExistingShipment = modeShipments.find((shipment) => shipment.shipmentId === existingShipmentId.trim().toUpperCase());
  const handleExistingModeChange = (event) => {
    const nextMode = event.target.value.toUpperCase();
    setExistingShipmentMode(nextMode);
    setExistingShipmentId(existingShipments.find((shipment) => shipment.transportMode === nextMode)?.shipmentId || "");
  };
  const activeExtractionIndex = files.length ? Math.min(files.length - 1, Math.floor((extractionProgress / 100) * files.length)) : 0;
  const previewFile = extracting ? files[activeExtractionIndex] : selectedFile;
  const fileIcon = (documentType) => documentType === "customer_email" ? Mail : documentType === "cargo_details" ? FileSpreadsheet : documentType === "image" ? FileSearch : File;
  const fileTypeLabel = (documentType) => ({ customer_email: "Email", cargo_details: "Spreadsheet", image: "Image", shipping_request: "Document" }[documentType] || "Document");
  const PreviewFileIcon = previewFile ? fileIcon(previewFile.documentType) : File;

  return (
    <Dialog open={open} onClose={extracting ? undefined : onClose} maxWidth="md" aria-labelledby="create-shipment-dialog-title" fullWidth className="create-shipment-dialog" slotProps={{ paper: { sx: { minHeight: { xs: "calc(100dvh - 32px)", sm: 640 }, maxHeight: "calc(100dvh - 32px)", borderRadius: 1.25 }, "aria-busy": extracting } }}>
      <DialogTitle id="create-shipment-dialog-title" sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, px: 3, pt: 3, pb: 1.5 }}>
        <Box component="span" sx={{ color: "text.primary", fontSize: 20, lineHeight: "28px", fontWeight: 700 }}>Create Shipment</Box>
        <IconButton aria-label="Close create shipment" disabled={extracting} onClick={onClose} sx={{ mt: -.5, mr: -.5 }}><X size={19} /></IconButton>
      </DialogTitle>
      <DialogContent className="create-shipment-dialog-content">
        <div className="create-start-method" role="radiogroup" aria-label="Choose how to start the shipment">
          <div>
            <button type="button" role="radio" aria-checked={startMethod === "documents"} className={startMethod === "documents" ? "is-selected" : ""} disabled={extracting} onClick={() => setStartMethod("documents")}><FileText size={16} />Source documents</button>
            <button type="button" role="radio" aria-checked={startMethod === "existing"} className={startMethod === "existing" ? "is-selected" : ""} disabled={extracting} onClick={() => setStartMethod("existing")}><Link2 size={16} />Existing shipment</button>
          </div>
        </div>
        {startMethod === "existing" ? (
          <section className="create-existing-workspace" aria-label="Start from existing shipment">
            <div className="create-existing-form">
              <div><h3>Choose an existing shipment</h3><p>Use it as a starting point for a new operational record.</p></div>
              <div className="create-existing-fields">
                <SelectInput label="Mode" value={existingModeValue} options={existingModeOptions} onChange={handleExistingModeChange} />
                <TextInput label="Shipment No." value={existingShipmentId} placeholder="Enter shipment no." onChange={(event) => setExistingShipmentId(event.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="create-existing-reuse" role="note">
              <Info size={16} aria-hidden="true" />
              <p>Shared information will be copied: Customer and reference, cargo details.</p>
            </div>
          </section>
        ) : !files.length ? (
          <Box
            component="section"
            className="create-shipment-dropzone"
            aria-label="Upload source documents"
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false); }}
            onDrop={(event) => { event.preventDefault(); submitFiles(event.dataTransfer.files); }}
            data-active={dragActive || undefined}
          >
            <Box className="create-shipment-dropzone-icon"><UploadCloud size={26} /></Box>
            <Box><Box component="h3">{dragActive ? "Drop Files To Continue" : "Drag Source Files Here"}</Box><Box component="p">PDF, email, spreadsheet, or image</Box></Box>
            <Button component="label" variant="contained" startIcon={<UploadCloud size={17} />}>
              Choose files
              <input aria-label="Choose source files" hidden multiple type="file" accept=".pdf,.xlsx,.xls,.csv,.eml,.msg,image/*" onChange={(event) => { submitFiles(event.target.files); event.target.value = ""; }} />
            </Button>
          </Box>
        ) : (
          <section className="create-upload-workspace" aria-label="Uploaded source files" aria-busy={extracting}>
            <div className="create-upload-file-pane">
              <div className="create-upload-pane-heading">
                <div><strong>Uploaded files</strong><span>{files.length} {files.length === 1 ? "file" : "files"}</span></div>
                <Button component="label" variant="text" size="small" startIcon={<Plus size={15} />} disabled={extracting}>
                  Add
                  <input aria-label="Add more source files" hidden multiple disabled={extracting} type="file" accept=".pdf,.xlsx,.xls,.csv,.eml,.msg,image/*" onChange={(event) => { submitFiles(event.target.files); event.target.value = ""; }} />
                </Button>
              </div>
              {uploading || extracting ? (
                <div className="create-upload-progress" aria-live="polite">
                  <div><span>{extracting ? "Scanning documents" : "Uploading"}</span><strong>{extracting ? extractionProgress : uploadProgress}%</strong></div>
                  <LinearProgress variant="determinate" value={extracting ? extractionProgress : uploadProgress} />
                  {extracting ? <small>Reading file {activeExtractionIndex + 1} of {files.length}: {previewFile?.name}</small> : null}
                </div>
              ) : null}
              <div className="create-upload-file-list">
                {files.map((file, index) => {
                  const FileIcon = fileIcon(file.documentType);
                  const extractionStart = (index / files.length) * 100;
                  const extractionEnd = ((index + 1) / files.length) * 100;
                  const extractionState = extractionProgress >= extractionEnd ? "complete" : extractionProgress >= extractionStart ? "scanning" : "queued";
                  return (
                    <button key={file.id} type="button" disabled={extracting} className={(extracting ? previewFile?.id : selectedFile?.id) === file.id ? "is-selected" : ""} aria-pressed={(extracting ? previewFile?.id : selectedFile?.id) === file.id} onClick={() => setSelectedFileId(file.id)}>
                      <FileIcon size={17} />
                      <span><strong>{file.name}</strong><small>{fileTypeLabel(file.documentType)} · {formatFileSize(file.size)}</small></span>
                      {uploading ? <span className="create-upload-state">Uploading</span> : extracting ? (
                        extractionState === "complete" ? <CheckCircle2 size={16} aria-label="Extracted" /> : <span className={`create-upload-state is-${extractionState}`}>{extractionState === "scanning" ? "Scanning" : "Queued"}</span>
                      ) : <CheckCircle2 size={16} aria-label="Uploaded" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="create-upload-preview-pane" aria-label={previewFile ? `Preview of ${previewFile.name}` : "File preview"}>
              {previewFile?.previewUrl ? (
                <div className={`create-upload-preview-document has-native-preview ${extracting ? "is-extracting" : ""}`}>
                  <div className="create-upload-native-preview">
                    {previewFile.previewKind === "image" ? (
                      <img src={previewFile.previewUrl} alt={`Preview of ${previewFile.name}`} />
                    ) : (
                      <object data={previewFile.previewUrl} type="application/pdf" aria-label={`Preview of ${previewFile.name}`}>
                        <p>PDF preview is not available in this browser.</p>
                      </object>
                    )}
                  </div>
                  {extracting ? <div className="create-extraction-scan" aria-hidden="true"><span /></div> : null}
                </div>
              ) : previewFile ? (
                <div className={`create-upload-preview-document ${extracting ? "is-extracting" : ""}`}>
                  <PreviewFileIcon size={34} />
                  <strong>{previewFile.name}</strong>
                  <span>{fileTypeLabel(previewFile.documentType)} · {formatFileSize(previewFile.size)}</span>
                  <p>A visual preview is not available for this file type.</p>
                  {extracting ? <div className="create-extraction-scan" aria-hidden="true"><span /></div> : null}
                </div>
              ) : null}
            </div>
          </section>
        )}
      </DialogContent>
      <DialogActions className="create-shipment-dialog-actions">
        <Button
          variant="text"
          startIcon={<PenLine size={17} />}
          disabled={extracting}
          onClick={onManual}
        >
          Start from scratch
        </Button>
        <span />
        <Button variant="outlined" color="secondary" disabled={extracting} onClick={onClose}>Cancel</Button>
        {startMethod === "existing" ? (
          <Button variant="contained" startIcon={<Plus size={17} />} disabled={!selectedExistingShipment} onClick={() => onStartExisting?.(selectedExistingShipment)}>Create</Button>
        ) : (
          <Button variant="contained" startIcon={<FileSearch size={17} />} disabled={!files.length || uploading || extracting} onClick={() => setExtracting(true)}>{extracting ? "Extracting…" : "Extract"}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function IntakePanel({ onClose, onPrepare, autoStart = false, uploadedFiles = [] }) {
  const [ocrState, setOcrState] = useState(autoStart ? "scanning" : "ready");
  const [progress, setProgress] = useState(0);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const mapLocalSource = (fileName, index, prefix = "local") => {
    const extension = fileName.split(".").at(-1)?.toLowerCase();
    const documentType = ["xlsx", "xls", "csv"].includes(extension) ? "cargo_details" : ["eml", "msg"].includes(extension) ? "customer_email" : "shipping_request";
    return { sourceId: `${prefix}-${index}`, fileName, version: 1, documentType };
  };
  const initialSources = uploadedFiles.length ? uploadedFiles.map((fileName, index) => mapLocalSource(fileName, index)) : fixture.sourceSet;
  const displaySources = [
    ...initialSources,
    ...additionalFiles.map((fileName, index) => mapLocalSource(fileName, index, "additional")),
  ];

  useEffect(() => {
    if (ocrState !== "scanning") return undefined;
    const steps = [18, 42, 68, 86, 100];
    let stepIndex = 0;
    setProgress(steps[stepIndex]);
    const timer = window.setInterval(() => {
      stepIndex += 1;
      setProgress(steps[stepIndex]);
      if (stepIndex === steps.length - 1) {
        window.clearInterval(timer);
        setOcrState("complete");
      }
    }, 340);
    return () => window.clearInterval(timer);
  }, [ocrState]);

  const startOcr = () => {
    setProgress(0);
    setOcrState("scanning");
  };
  const uploadAdditionalFiles = (fileList) => {
    const fileNames = Array.from(fileList || []).map((file) => file.name);
    if (!fileNames.length) return;
    setAdditionalFiles((current) => [...current, ...fileNames]);
    startOcr();
  };
  const isComplete = ocrState === "complete";

  return (
    <DetailPageFrame
      title="Create Shipment"
      meta="Document-assisted intake"
      onClose={onClose}
      headerActions={<Button variant="contained" startIcon={<ArrowRight size={17} />} disabled={!isComplete} onClick={onPrepare}>Create draft</Button>}
      stickyHeader
      size="medium"
    >
      <div className="panel-stack intake-stack">
        {isComplete ? (
          <section className="ocr-add-files-card">
            <div className="ocr-upload-copy">
              <span className="ocr-upload-icon"><UploadCloud size={21} /></span>
              <div><h2>Upload Other Files</h2><p>Add PDF, email, spreadsheet, or image files.</p></div>
            </div>
            <Button component="label" variant="outlined" startIcon={<UploadCloud size={17} />}>
              Add files
              <input hidden multiple type="file" accept=".pdf,.xlsx,.xls,.csv,.eml,.msg,image/*" onChange={(event) => uploadAdditionalFiles(event.target.files)} />
            </Button>
          </section>
        ) : (
          <section className={"ocr-upload-card is-" + ocrState}>
            <div className="ocr-upload-copy">
              <span className="ocr-upload-icon"><FileText size={22} /></span>
              <div><h2>Source Documents</h2><p>Email, shipping request, and cargo details</p></div>
            </div>
            <Button variant="contained" disabled={ocrState === "scanning"} onClick={startOcr}>
              {ocrState === "scanning" ? "Extracting…" : "Run sample OCR"}
            </Button>
          </section>
        )}

        {ocrState !== "ready" ? (
          <section className="ledger-section ocr-source-section">
            <div className="section-heading"><h2>Document Extraction</h2><span>{isComplete ? displaySources.length + " files complete" : "Reading " + displaySources.length + " files"}</span></div>
            <div className="compact-file-list ocr-source-list">
              {displaySources.map((source, index) => (
                <div key={source.sourceId}>
                  {source.documentType === "customer_email" ? <Mail size={17} /> : source.documentType === "cargo_details" ? <FileSpreadsheet size={17} /> : <File size={17} />}
                  <span><strong>{source.fileName}</strong><small>Version {source.version} · synthetic</small></span>
                  <span className={"ocr-file-state " + (isComplete || progress >= Math.min(86, 18 + index * 24) ? "is-active" : "")}>
                    {isComplete ? <><CheckCircle2 size={14} />Extracted</> : progress >= Math.min(86, 18 + index * 24) ? "Reading…" : "Queued"}
                  </span>
                </div>
              ))}
            </div>
            {!isComplete ? (
              <div className="ocr-progress">
                <div><strong>Reading structured text</strong><span>{progress}%</span></div>
                <LinearProgress variant="determinate" value={progress} />
                <small>Identifying fixed values from the connected sample documents.</small>
              </div>
            ) : null}
          </section>
        ) : null}

        {isComplete ? (
          <section className="ledger-section ocr-result-section">
            <div className="section-heading"><h2>Extraction Summary</h2><span>26 fields found</span></div>
            <dl className="definition-grid">
              <div><dt>Customer</dt><dd>Demo Retail Distribution LLC</dd></div>
              <div><dt>Customer PO</dt><dd>PO-DEMO-260914</dd></div>
              <div><dt>Freight Type</dt><dd>Trucking</dd></div>
              <div><dt>Mode</dt><dd>LTL</dd></div>
              <div className="span-two"><dt>Route</dt><dd>Livermore, CA → Los Angeles, CA</dd></div>
            </dl>
            <div className="ocr-rule-note"><Info size={15} /><span>Rule-based mapping matched 22 fields; 4 values need human confirmation in the draft.</span></div>
          </section>
        ) : null}

        <p className="scope-footnote"><Info size={15} />OCR only extracts fixed, structured text. Mapping uses rules and human confirmation in this prototype.</p>
      </div>
    </DetailPageFrame>
  );
}

function QuotationPreviewDialog({ quote, onClose }) {
  if (!quote) return null;
  const hasServiceItems = (quote.serviceItems || []).length > 0;
  const usesServiceItems = hasServiceItems && (quote.rateMatrix || []).length === 0 && (quote.surchargeRules || []).length === 0;
  const serviceItemTotal = (quote.serviceItems || []).reduce((total, item) => total + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const formatQuotationRate = (rule) => {
    if (rule.unit === "percent") return `${rule.rate}%`;
    const suffix = rule.unit === "per 30 min" ? " / 30 min" : rule.unit === "per unit" ? " / unit" : "";
    return `${formatMoney(rule.rate, quote.currency)}${suffix}`;
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="quotation-preview-title" className="quotation-preview-dialog">
      <DialogTitle id="quotation-preview-title" className="quotation-preview-dialog-title">
        <span>Quotation Preview</span>
        <StatusChip label={`Version ${quote.version}`} tone="neutral" />
      </DialogTitle>
      <DialogContent dividers className="quotation-preview-content">
        <section className="quotation-preview-sheet" aria-label={`Quotation ${quote.quoteId}`}>
          <header className="quotation-document-header">
            <div className="quotation-document-brand">
              <span className="quotation-document-logo">B</span>
              <div>
                <strong>BEST USA LOGISTICS INC</strong>
                <small>Freight Forwarding &amp; Logistics</small>
                <small>Los Angeles, California · +1 310 555 0188</small>
              </div>
            </div>
            <div className="quotation-document-title">
              <h2>QUOTATION</h2>
              <strong>QUOTE NO. {quote.quoteId}</strong>
            </div>
          </header>

          <dl className="quotation-document-meta">
            <div><dt>TO</dt><dd>{quote.customer}</dd></div>
            <div><dt>CREATE DATE</dt><dd>{formatDate(quote.createdAt)}</dd></div>
            <div><dt>TRANSPORT MODE</dt><dd>{formatTransportMode(quote.transportMode)}</dd></div>
            <div><dt>CURRENCY</dt><dd>{quote.currency}</dd></div>
            <div><dt>PREPARED BY</dt><dd>Pricing Manager</dd></div>
          </dl>

          <section className="quotation-document-pricing" aria-labelledby="quotation-pricing-schedule-title">
            <div className="quotation-document-section-heading">
              <h3 id="quotation-pricing-schedule-title">Pricing Schedule</h3>
              <span>{usesServiceItems ? `${quote.serviceItems.length} items` : `${quote.rateMatrix.length + quote.surchargeRules.length} rates`}</span>
            </div>
            <table>
              <thead>
                <tr><th>Description</th><th>Applies when</th>{usesServiceItems ? <><th>Qty</th><th>Unit</th></> : <th>Configuration</th>}<th>{usesServiceItems ? "Unit rate" : "Rate"}</th>{usesServiceItems ? <th>Subtotal</th> : null}</tr>
              </thead>
              <tbody>
                {usesServiceItems ? (quote.serviceItems || []).map((item) => (
                  <tr key={item.lineId}>
                    <td>{item.name}</td>
                    <td>{formatTransportMode(quote.transportMode)}</td>
                    <td>{Number(item.quantity).toLocaleString("en-US")}</td>
                    <td>{item.unit}</td>
                    <td>{formatMoney(item.rate, quote.currency)}</td>
                    <td>{formatMoney(Number(item.quantity) * Number(item.rate), quote.currency)}</td>
                  </tr>
                )) : (
                  <>
                    {(quote.rateMatrix || []).map((rule, index) => (
                      <tr key={rule.ruleId || `${rule.lane}-${rule.tier}-${index}`}>
                        <td>{rule.templateLabel || "Base freight"}</td>
                        <td>{rule.lane}</td>
                        <td>{rule.tier} · {rule.basis}</td>
                        <td>{formatMoney(rule.rate, quote.currency)}</td>
                      </tr>
                    ))}
                    {(quote.surchargeRules || []).map((rule) => (
                      <tr key={rule.code}>
                        <td>{rule.name}</td>
                        <td>{rule.trigger}</td>
                        <td>{rule.templateLabel || "Additional charge"}</td>
                        <td>{formatQuotationRate(rule)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              {usesServiceItems ? <tfoot><tr><td colSpan="5">Estimated total</td><td>{formatMoney(serviceItemTotal, quote.currency)}</td></tr></tfoot> : null}
            </table>
          </section>

          {hasServiceItems && !usesServiceItems ? (
            <section className="quotation-document-pricing" aria-labelledby="warehouse-pricing-schedule-title">
              <div className="quotation-document-section-heading">
                <h3 id="warehouse-pricing-schedule-title">Warehouse Service Items</h3>
                <span>{quote.serviceItems.length} items</span>
              </div>
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit rate</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {quote.serviceItems.map((item) => (
                    <tr key={item.lineId}>
                      <td>{item.name}</td>
                      <td>{Number(item.quantity).toLocaleString("en-US")}</td>
                      <td>{item.unit}</td>
                      <td>{formatMoneyWithCents(item.rate, quote.currency)}</td>
                      <td>{formatMoneyWithCents(Number(item.quantity) * Number(item.rate), quote.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan="4">Estimated total</td><td>{formatMoneyWithCents(serviceItemTotal, quote.currency)}</td></tr></tfoot>
              </table>
            </section>
          ) : null}

          <section className="quotation-document-terms">
            <strong>PAYMENT TERM: NET 30 DAYS</strong>
            <p>{hasServiceItems ? "Trucking charges use the matching shipment conditions; warehouse charges use the actual quantity processed." : "Final charge is calculated using the rate that matches the shipment conditions and quantities."}</p>
            <p>Rates are subject to the transport mode and validity period shown above. Please verify the applicable rate before booking.</p>
          </section>
          <footer><span>{quote.quoteId} · Page 1 of 1</span><strong>BEST USA LOGISTICS INC</strong></footer>
        </section>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<Download size={17} />} onClick={() => window.print()}>Export PDF</Button>
      </DialogActions>
    </Dialog>
  );
}

function QuotationPanel({ quote, onSave, onClose, onDelete, initialEditing = false, isCreating = false }) {
  const createDraft = (source) => ({
    ...source,
    transportMode: source.transportMode || "TRUCKING",
    serviceScopes: [...(source.serviceScopes || (source.serviceScope ? [source.serviceScope] : []))],
    rateMatrix: (source.rateMatrix || []).map((rule) => ({ ...rule })),
    surchargeRules: (source.surchargeRules || []).map((rule) => ({
      ...rule,
      templateKey: "per_unit",
      templateLabel: "Per unit",
      unit: "per unit",
      billingUnit: rule.billingUnit || "SHIPMENT",
    })),
    serviceItems: (source.serviceItems || []).map((item) => ({ ...item })),
  });
  const [editing, setEditing] = useState(Boolean(initialEditing));
  const [quotationActionAnchorEl, setQuotationActionAnchorEl] = useState(null);
  const [quotationPreviewOpen, setQuotationPreviewOpen] = useState(false);
  const [draft, setDraft] = useState(() => createDraft(quote));
  useEffect(() => {
    setDraft(createDraft(quote));
    setEditing(Boolean(initialEditing));
  }, [quote, initialEditing]);

  const displayedQuote = editing ? draft : quote;
  const hasServiceItems = (displayedQuote.serviceItems || []).length > 0;
  const usesServiceItems = hasServiceItems && displayedQuote.rateMatrix.length === 0 && displayedQuote.surchargeRules.length === 0;
  const updateDraftField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateRule = (collection, index, field, value) => setDraft((current) => ({
    ...current,
    [collection]: current[collection].map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [field]: value } : rule),
  }));
  const canSave = Boolean(draft.customer.trim()
    && draft.name.trim()
    && draft.quoteId.trim()
    && draft.currency
    && draft.transportMode
    && draft.rateMatrix.every((rule) => rule.templateKey && rule.lane.trim() && rule.tier.trim() && rule.basis.trim() && Number(rule.rate) > 0)
    && draft.surchargeRules.every((rule) => rule.templateKey && rule.name.trim() && rule.billingUnit && Number(rule.rate) > 0)
    && draft.serviceItems.every((item) => item.name.trim() && Number(item.quantity) > 0 && item.unit && Number(item.rate) > 0));
  const startEditing = () => {
    setDraft(createDraft(quote));
    setEditing(true);
  };
  const cancelEditing = () => {
    if (isCreating) {
      onClose();
      return;
    }
    setDraft(createDraft(quote));
    setEditing(false);
  };
  const changeStatus = (nextStatus) => {
    if (nextStatus === displayedQuote.status) return;
    if (editing) {
      updateDraftField("status", nextStatus);
      return;
    }
    const changedAt = new Date().toISOString();
    onSave({
      ...quote,
      status: nextStatus,
      lastUpdated: changedAt,
      versionHistory: [{
        historyId: `STATUS-${Date.now()}`,
        version: quote.version,
        event: "Status changed",
        role: "Pricing Manager",
        changedAt,
        summary: `Changed quote plan status from ${formatStatus(quote.status)} to ${formatStatus(nextStatus)}.`,
      }, ...(quote.versionHistory || [])],
    }, "Quote plan status updated.");
  };
  const saveChanges = () => {
    if (!canSave) return;
    const changedAt = new Date().toISOString();
    const nextVersion = isCreating ? 1 : Number(draft.version || 1) + 1;
    onSave({
      ...draft,
      version: nextVersion,
      customer: draft.customer.trim(),
      name: draft.name.trim(),
      quoteId: draft.quoteId.trim(),
      billingAccountId: draft.billingAccountId.trim(),
      transportMode: draft.transportMode,
      serviceScopes: [...draft.serviceScopes],
      serviceScope: draft.serviceScopes.join(", "),
      rateMatrix: draft.rateMatrix.map((rule) => ({ ...rule, rate: Number(rule.rate) })),
      surchargeRules: draft.surchargeRules.map((rule) => ({ ...rule, rate: Number(rule.rate) })),
      serviceItems: draft.serviceItems.map((item) => ({
        ...item,
        name: item.name.trim(),
        quantity: Number(item.quantity),
        rate: Number(item.rate),
      })),
      lastUpdated: changedAt,
      versionHistory: [{
        historyId: `EDIT-${Date.now()}`,
        version: nextVersion,
        event: isCreating ? "Created" : "Edited",
        role: "Pricing Manager",
        changedAt,
        summary: isCreating ? "Created the customer quote." : "Updated quote plan details and pricing rules.",
      }, ...(draft.versionHistory || [])],
    }, isCreating ? "Customer quote created." : undefined, quote.quoteId);
    setEditing(false);
  };
  const addBaseRule = () => {
    const ruleId = `BASE_CUSTOM_${Date.now()}`;
    setDraft((current) => ({
      ...current,
      rateMatrix: [...current.rateMatrix, { ruleId, lane: "", tier: "", basis: "", rate: "", unit: "", templateKey: "", templateLabel: "" }],
    }));
    window.requestAnimationFrame(() => document.querySelector(`[data-base-rule-id="${ruleId}"] [role="combobox"]`)?.focus());
  };
  const removeBaseRule = (index) => setDraft((current) => ({
    ...current,
    rateMatrix: current.rateMatrix.filter((_, ruleIndex) => ruleIndex !== index),
  }));
  const updateBaseRuleType = (index, templateKey) => {
    const template = baseRuleTemplates.find((candidate) => candidate.templateKey === templateKey);
    const fields = baseRuleFieldOptions[templateKey];
    if (!template || !fields) return;
    setDraft((current) => ({
      ...current,
      rateMatrix: current.rateMatrix.map((rule, ruleIndex) => ruleIndex === index ? {
        ...rule,
        templateKey,
        templateLabel: template.label,
        unit: template.defaultUnit,
        lane: fields.appliesWhen[0],
        tier: fields.tiers[0],
        basis: fields.bases[0],
        rate: "",
      } : rule),
    }));
  };
  const updateBaseRuleConfiguration = (index, value) => {
    const [tier, basis] = value.split("::");
    setDraft((current) => ({
      ...current,
      rateMatrix: current.rateMatrix.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, tier, basis } : rule),
    }));
  };
  const addDraftRule = () => {
    const code = `CUSTOM_${Date.now()}`;
    setDraft((current) => ({
      ...current,
      surchargeRules: [...current.surchargeRules, { code, name: "", rate: "", unit: "per unit", billingUnit: "SHIPMENT", templateKey: "per_unit", templateLabel: "Per unit" }],
    }));
    window.requestAnimationFrame(() => document.querySelector(`[data-rule-code="${code}"] [role="combobox"]`)?.focus());
  };
  const removeDraftRule = (index) => setDraft((current) => ({
    ...current,
    surchargeRules: current.surchargeRules.filter((_, ruleIndex) => ruleIndex !== index),
  }));
  const addServiceItem = () => {
    const lineId = `WH-CUSTOM-${Date.now()}`;
    setDraft((current) => ({
      ...current,
      serviceItems: [...current.serviceItems, { lineId, name: "", quantity: 1, unit: "UNIT", rate: "" }],
    }));
    window.requestAnimationFrame(() => document.querySelector(`[data-service-item-id="${lineId}"] input`)?.focus());
  };
  const updateServiceItem = (index, field, value) => setDraft((current) => ({
    ...current,
    serviceItems: current.serviceItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const removeServiceItem = (index) => setDraft((current) => ({
    ...current,
    serviceItems: current.serviceItems.filter((_, itemIndex) => itemIndex !== index),
  }));
  const updateAdditionalRuleType = (index, templateKey) => {
    const template = additionalRuleTemplates.find((candidate) => candidate.templateKey === templateKey);
    if (!template) return;
    setDraft((current) => ({
      ...current,
      surchargeRules: current.surchargeRules.map((rule, ruleIndex) => ruleIndex === index ? {
        ...rule,
        templateKey,
        templateLabel: template.label,
        unit: template.defaultUnit,
        billingUnit: rule.billingUnit || "SHIPMENT",
        rate: "",
      } : rule),
    }));
  };
  const rulePricingHint = (rule) => {
    const template = ruleTemplates.find((candidate) => candidate.templateKey === rule.templateKey);
    if (!template) return "Select a Rule Type";
    if (rule.unit === "percent") return `${template.rateLabel} · %`;
    if (rule.unit === "per unit") return `${template.rateLabel} · ${displayedQuote.currency} / unit`;
    if (rule.unit === "per 30 min") return `${template.rateLabel} · ${displayedQuote.currency} / 30 min`;
    return `${template.rateLabel} · ${displayedQuote.currency}`;
  };
  const ruleRateInputLabel = (rule) => ruleTemplates.find((candidate) => candidate.templateKey === rule.templateKey)?.rateLabel || "Rate";
  const ruleRateInputProps = (rule) => ({ min: 0, step: rule.unit === "percent" ? 0.1 : 0.01 });
  return (
    <DetailPageFrame
      title={isCreating ? "Create Customer Quote" : quote.name}
      meta={isCreating ? undefined : `Customer Quote・${displayedQuote.customer}`}
      headerActions={editing ? (
        <>
          <Button variant="text" color="secondary" sx={{ backgroundColor: "transparent !important", "&:hover": { backgroundColor: "rgba(99, 113, 124, .08) !important" } }} onClick={cancelEditing}>Cancel</Button>
          <Button variant="contained" startIcon={isCreating ? undefined : <Check size={16} />} disabled={!canSave} onClick={saveChanges}>{isCreating ? "Create" : "Save changes"}</Button>
        </>
      ) : (
        <>
          <QuotationStatusSelect value={displayedQuote.status} onChange={changeStatus} />
          <Button variant="contained" startIcon={<PenLine size={16} />} onClick={startEditing}>Edit</Button>
          <Tooltip title="More actions" placement="bottom">
            <IconButton
              aria-label="More quotation actions"
              aria-controls={quotationActionAnchorEl ? "quotation-detail-actions-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(quotationActionAnchorEl)}
              onClick={(event) => setQuotationActionAnchorEl(event.currentTarget)}
            >
              <MoreVertical size={19} />
            </IconButton>
          </Tooltip>
          <Menu
            id="quotation-detail-actions-menu"
            anchorEl={quotationActionAnchorEl}
            open={Boolean(quotationActionAnchorEl)}
            onClose={() => setQuotationActionAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: { sx: { minWidth: 176, mt: .5, border: "1px solid", borderColor: "divider", borderRadius: "8px", boxShadow: "0 8px 24px rgba(16, 24, 40, .14)" } },
              list: { "aria-label": "Quotation actions", dense: true },
            }}
          >
            <MenuItem
              sx={{ minHeight: 40, gap: 1 }}
              onClick={() => {
                setQuotationActionAnchorEl(null);
                setQuotationPreviewOpen(true);
              }}
            >
              <Download size={16} aria-hidden="true" />
              Export
            </MenuItem>
            <MenuItem
              sx={{ minHeight: 40, gap: 1, color: "error.main" }}
              onClick={() => {
                setQuotationActionAnchorEl(null);
                onDelete?.(quote.quoteId);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete quotation
            </MenuItem>
          </Menu>
        </>
      )}
      onClose={onClose}
      size="wide"
      stickyHeader
      hideBack={editing}
    >
      <div className="panel-stack quotation-panel-stack">
        {!isCreating ? <Alert className="rate-scope-alert" severity="info" variant="outlined" icon={<Info size={18} />}>
          Applies to {formatTransportMode(displayedQuote.transportMode)} shipments for {displayedQuote.customer}
        </Alert> : null}
        <section className="ledger-section quotation-card quotation-overview-card">
          <div className="section-heading"><h2>Overview</h2></div>
          {editing ? (
            <div className="rate-plan-edit-grid">
              <AutocompleteInput label="Customer" required options={basePartners.filter((partner) => partner.type === "customer").map((partner) => partner.name)} value={draft.customer} onChange={(value) => updateDraftField("customer", value || "")} />
              <TextInput label="Quotation name" required value={draft.name} onChange={(event) => updateDraftField("name", event.target.value)} />
              <SelectInput
                label="Transport mode"
                required
                options={quotationShipmentModeOptions}
                value={draft.transportMode}
                onChange={(event) => updateDraftField("transportMode", event.target.value)}
                placeholder="Select transport mode"
              />
              <TextInput label="Quote No." required value={draft.quoteId} onChange={(event) => updateDraftField("quoteId", event.target.value)} />
              <SelectInput label="Currency" required inputProps={{ "aria-label": "Currency" }} value={draft.currency} onChange={(event) => updateDraftField("currency", event.target.value)} options={[{ value: "USD", label: "USD" }, { value: "CAD", label: "CAD" }, { value: "MXN", label: "MXN" }]} />
            </div>
          ) : (
            <dl className="definition-grid">
              <div><dt>Customer</dt><dd>{displayedQuote.customer}</dd></div>
              <div><dt>Quotation name</dt><dd>{displayedQuote.name}</dd></div>
              <div><dt>Quote No.</dt><dd>{displayedQuote.quoteId}</dd></div>
              <div><dt>Transport mode</dt><dd>{formatTransportMode(displayedQuote.transportMode)}</dd></div>
              <div><dt>Currency</dt><dd>{displayedQuote.currency}</dd></div>
            </dl>
          )}
        </section>
        <section className="quotation-card quotation-rules-card">
          {usesServiceItems ? (
            <div className="quotation-rule-group">
              <div className="section-heading">
                <h2>Service Items</h2>
                {editing ? <div className="section-heading-actions"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addServiceItem}>Add item</Button></div> : null}
              </div>
              <div className={`rate-rule-table warehouse-service-table ${editing ? "is-editing" : ""}`} role="table" aria-label="Warehouse service items">
                <div className="rate-rule-head" role="row">
                  <span role="columnheader">Service item</span>
                  <span role="columnheader">Qty</span>
                  <span role="columnheader">Unit</span>
                  <span role="columnheader">Unit rate</span>
                  {editing ? <span role="columnheader" aria-label="Actions" /> : null}
                </div>
                {(displayedQuote.serviceItems || []).map((item, index) => editing ? (
                  <div role="row" key={item.lineId} data-service-item-id={item.lineId}>
                    <TextInput aria-label={`Service item ${index + 1} name`} required value={item.name} onChange={(event) => updateServiceItem(index, "name", event.target.value)} />
                    <TextInput aria-label={`Service item ${index + 1} quantity`} required type="number" value={item.quantity} onChange={(event) => updateServiceItem(index, "quantity", event.target.value)} />
                    <SelectInput aria-label={`Service item ${index + 1} unit`} required value={item.unit} onChange={(event) => updateServiceItem(index, "unit", event.target.value)} options={["UNIT", "WEEK", "DAY", "HOUR", "PALLET", "CNTR", "B/L"].map((unit) => ({ value: unit, label: unit }))} />
                    <TextInput aria-label={`Service item ${index + 1} unit rate`} required type="number" inputProps={{ min: 0, step: 0.01 }} value={item.rate} onChange={(event) => updateServiceItem(index, "rate", event.target.value)} />
                    <Tooltip title="Delete item" placement="top"><IconButton color="error" className="rule-delete-button" aria-label={`Delete ${item.name || `service item ${index + 1}`}`} onClick={() => removeServiceItem(index)}><Trash2 size={16} /></IconButton></Tooltip>
                  </div>
                ) : (
                  <div role="row" key={item.lineId}>
                    <span role="cell"><strong>{item.name}</strong></span>
                    <span role="cell">{Number(item.quantity).toLocaleString("en-US")}</span>
                    <span role="cell">{item.unit}</span>
                    <span role="cell">{formatMoneyWithCents(item.rate, displayedQuote.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
          <div className="quotation-rule-group">
          <div className="section-heading"><h2>Base Pricing</h2>{editing ? <div className="section-heading-actions"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addBaseRule}>Add rule</Button></div> : null}</div>
          <div className={`rate-rule-table rate-matrix-table ${editing ? "is-editing" : ""}`} role="table" aria-label="Customer rate matrix">
            <div className="rate-rule-head" role="row"><span role="columnheader">Rule template</span><span role="columnheader">Applies when</span><span role="columnheader">Configuration</span><span role="columnheader">Rate</span>{editing ? <span role="columnheader" aria-label="Actions" /> : null}</div>
            {displayedQuote.rateMatrix.length === 0 ? (
              <div className="rate-rule-empty" role="row">
                <span role="cell">{editing ? "No base pricing rules yet. Select Add rule to create one." : "No base pricing rules available."}</span>
              </div>
            ) : null}
            {displayedQuote.rateMatrix.map((rule, index) => {
              const fieldOptions = baseRuleFieldOptions[rule.templateKey];
              return editing ? (
              <div role="row" key={rule.ruleId || `${rule.templateKey}-${index}`} data-base-rule-id={rule.ruleId || `base-rule-${index + 1}`}>
                <span role="cell" className="rule-type-edit-cell">
                  <SelectInput
                    value={rule.templateKey}
                    placeholder="Select type"
                    inputProps={{ "aria-label": `Base rule ${index + 1} type` }}
                    onChange={(event) => updateBaseRuleType(index, event.target.value)}
                    options={baseRuleTemplates.map((template) => ({ value: template.templateKey, label: template.label }))}
                  />
                  <small>{ruleTemplates.find((template) => template.templateKey === rule.templateKey)?.description || "Choose a base calculation pattern."}</small>
                </span>
                <SelectInput
                  value={rule.lane}
                  disabled={!fieldOptions}
                  placeholder={fieldOptions ? "Select condition" : "Select type first"}
                  inputProps={{ "aria-label": `Base rule ${index + 1} applies when` }}
                  onChange={(event) => updateRule("rateMatrix", index, "lane", event.target.value)}
                  options={(fieldOptions?.appliesWhen || []).map((option) => ({ value: option, label: option }))}
                />
                <SelectInput
                  value={fieldOptions ? `${rule.tier}::${rule.basis}` : ""}
                  disabled={!fieldOptions}
                  placeholder={fieldOptions ? "Select configuration" : "Select type first"}
                  inputProps={{ "aria-label": `Base rule ${index + 1} configuration` }}
                  onChange={(event) => updateBaseRuleConfiguration(index, event.target.value)}
                  options={(fieldOptions?.tiers || []).flatMap((tier) => (fieldOptions?.bases || []).map((basis) => ({ value: `${tier}::${basis}`, label: `${tier} · ${basis}` })))}
                />
                <div className="rule-pricing-edit-cell">
                  <TextInput aria-label={`Base rule ${index + 1} ${ruleRateInputLabel(rule).toLowerCase()}`} type="number" inputProps={ruleRateInputProps(rule)} value={rule.rate} onChange={(event) => updateRule("rateMatrix", index, "rate", event.target.value)} />
                  <small>{rulePricingHint(rule)}</small>
                </div>
                <Tooltip title="Delete rule" placement="top"><IconButton color="error" className="rule-delete-button" aria-label={`Delete base rule ${index + 1}`} onClick={() => removeBaseRule(index)}><Trash2 size={16} /></IconButton></Tooltip>
              </div>
            ) : <div role="row" key={rule.ruleId || `${rule.lane}-${rule.tier}`}><span role="cell"><strong>{rule.templateLabel}</strong></span><span role="cell">{rule.lane}</span><span role="cell">{rule.tier} · {rule.basis}</span><strong role="cell">{formatMoney(rule.rate, displayedQuote.currency)}</strong></div>;
            })}
          </div>
          </div>
          <div className="quotation-rule-group">
          <div className="section-heading"><h2>Additional Pricing</h2>{editing ? <div className="section-heading-actions"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addDraftRule}>Add rule</Button></div> : null}</div>
          <div className={`rate-rule-table surcharge-rule-table ${editing ? "is-editing" : ""}`} role="table" aria-label="Surcharge rules">
            <div className="rate-rule-head" role="row"><span role="columnheader">Fee item</span><span role="columnheader">Rule template</span><span role="columnheader">Unit</span><span role="columnheader">Unit price</span>{editing ? <span role="columnheader" aria-label="Actions" /> : null}</div>
            {displayedQuote.surchargeRules.length === 0 ? (
              <div className="rate-rule-empty" role="row">
                <span role="cell">{editing ? "No additional pricing rules yet. Select Add rule to create one." : "No additional pricing rules available."}</span>
              </div>
            ) : null}
            {displayedQuote.surchargeRules.map((rule, index) => editing ? (
              <div role="row" key={rule.code} data-rule-code={rule.code}>
                <TextInput aria-label={`Additional rule ${index + 1} fee item`} value={rule.name} onChange={(event) => updateRule("surchargeRules", index, "name", event.target.value)} />
                <span role="cell" className="rule-type-edit-cell">
                  <SelectInput
                    value={rule.templateKey}
                    placeholder="Select rule template"
                    inputProps={{ "aria-label": `Additional rule ${index + 1} rule template` }}
                    onChange={(event) => updateAdditionalRuleType(index, event.target.value)}
                    options={additionalRuleTemplates.map((template) => ({ value: template.templateKey, label: template.label }))}
                  />
                  <small>{ruleTemplates.find((template) => template.templateKey === rule.templateKey)?.description || "Choose a standard calculation pattern."}</small>
                </span>
                <SelectInput
                  value={rule.billingUnit || "SHIPMENT"}
                  inputProps={{ "aria-label": `Additional rule ${index + 1} unit` }}
                  onChange={(event) => updateRule("surchargeRules", index, "billingUnit", event.target.value)}
                  options={["SHIPMENT", "TRUCK", "PALLET", "UNIT", "HOUR", "DAY"].map((unit) => ({ value: unit, label: formatPricingUnit(unit) }))}
                />
                <div className="rule-pricing-edit-cell">
                  <TextInput aria-label={`Additional rule ${index + 1} unit price`} type="number" inputProps={ruleRateInputProps(rule)} value={rule.rate} onChange={(event) => updateRule("surchargeRules", index, "rate", event.target.value)} />
                  <small>{displayedQuote.currency} / {formatPricingUnit(rule.billingUnit || "SHIPMENT")}</small>
                </div>
                <Tooltip title="Delete rule" placement="top"><IconButton color="error" className="rule-delete-button" aria-label={`Delete ${rule.name || `additional rule ${index + 1}`}`} onClick={() => removeDraftRule(index)}><Trash2 size={16} /></IconButton></Tooltip>
              </div>
            ) : <div role="row" key={rule.code}><span role="cell"><strong>{rule.name}</strong></span><span role="cell"><strong>Per unit</strong></span><span role="cell">{formatPricingUnit(rule.billingUnit || "SHIPMENT")}</span><strong role="cell">{formatMoney(rule.rate, displayedQuote.currency)}</strong></div>)}
          </div>
          </div>
            </>
          )}
          {hasServiceItems && !usesServiceItems ? (
            <div className="quotation-rule-group">
              <div className="section-heading">
                <h2>Warehouse Service Items</h2>
                {editing ? <div className="section-heading-actions"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addServiceItem}>Add item</Button></div> : null}
              </div>
              <div className={`rate-rule-table warehouse-service-table ${editing ? "is-editing" : ""}`} role="table" aria-label="Warehouse service items">
                <div className="rate-rule-head" role="row">
                  <span role="columnheader">Service item</span>
                  <span role="columnheader">Qty</span>
                  <span role="columnheader">Unit</span>
                  <span role="columnheader">Unit rate</span>
                  {editing ? <span role="columnheader" aria-label="Actions" /> : null}
                </div>
                {displayedQuote.serviceItems.map((item, index) => editing ? (
                  <div role="row" key={item.lineId} data-service-item-id={item.lineId}>
                    <TextInput aria-label={`Service item ${index + 1} name`} required value={item.name} onChange={(event) => updateServiceItem(index, "name", event.target.value)} />
                    <TextInput aria-label={`Service item ${index + 1} quantity`} required type="number" value={item.quantity} onChange={(event) => updateServiceItem(index, "quantity", event.target.value)} />
                    <SelectInput aria-label={`Service item ${index + 1} unit`} required value={item.unit} onChange={(event) => updateServiceItem(index, "unit", event.target.value)} options={["UNIT", "WEEK", "DAY", "HOUR", "PALLET", "CNTR", "B/L"].map((unit) => ({ value: unit, label: unit }))} />
                    <TextInput aria-label={`Service item ${index + 1} unit rate`} required type="number" inputProps={{ min: 0, step: 0.01 }} value={item.rate} onChange={(event) => updateServiceItem(index, "rate", event.target.value)} />
                    <Tooltip title="Delete item" placement="top"><IconButton color="error" className="rule-delete-button" aria-label={`Delete ${item.name || `service item ${index + 1}`}`} onClick={() => removeServiceItem(index)}><Trash2 size={16} /></IconButton></Tooltip>
                  </div>
                ) : (
                  <div role="row" key={item.lineId}>
                    <span role="cell"><strong>{item.name}</strong></span>
                    <span role="cell">{Number(item.quantity).toLocaleString("en-US")}</span>
                    <span role="cell">{item.unit}</span>
                    <span role="cell">{formatMoneyWithCents(item.rate, displayedQuote.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        {!isCreating ? <section className="version-history-section quotation-inline-section" aria-labelledby="version-history-title">
          <div className="section-heading"><div><h2 id="version-history-title">Version History</h2><p>Record of quote plan creation and edits.</p></div></div>
          <ol className="version-history-timeline">
            {(displayedQuote.versionHistory || []).map((entry) => (
              <li key={entry.historyId || `${entry.version}-${entry.changedAt}`}>
                <span className="version-history-marker" aria-hidden="true" />
                <div className="version-history-entry">
                  <div className="version-history-entry-heading">
                    <div><strong>Version {entry.version}</strong><span>{entry.event}</span></div>
                    <time dateTime={entry.changedAt}>{formatDateTime(entry.changedAt)}</time>
                  </div>
                  <p>{entry.summary}</p>
                  <small>Edited by {entry.role}</small>
                </div>
              </li>
            ))}
          </ol>
        </section> : null}
      </div>
      {quotationPreviewOpen ? <QuotationPreviewDialog quote={displayedQuote} onClose={() => setQuotationPreviewOpen(false)} /> : null}
    </DetailPageFrame>
  );
}

function CarrierRatePlanPanel({ plan, partners, onSave, onClose, initialEditing = false, isCreating = false }) {
  const defaultAppliesWhen = (source) => ["LTL", "FTL"].includes(source.serviceType)
    ? `${source.serviceType} shipments`
    : "All shipments";
  const createDraft = (source) => ({
    ...source,
    transportMode: source.transportMode || "TRUCKING",
    chargeLines: (source.chargeLines || []).map((line) => ({
      ...line,
      appliesWhen: carrierRuleAppliesWhenOptions.some((option) => option.value === line.appliesWhen)
        ? line.appliesWhen
        : defaultAppliesWhen(source),
    })),
  });
  const [editing, setEditing] = useState(Boolean(initialEditing));
  const [draft, setDraft] = useState(() => createDraft(plan));

  useEffect(() => {
    setDraft(createDraft(plan));
    setEditing(Boolean(initialEditing));
  }, [plan, initialEditing]);

  const displayedPlan = editing ? draft : plan;
  const updateDraftField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateRule = (index, field, value) => setDraft((current) => ({
    ...current,
    chargeLines: current.chargeLines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
  }));
  const canSave = Boolean(
    draft.counterparty.trim()
    && draft.name.trim()
    && draft.transportMode
    && draft.currency
    && draft.chargeLines.length
    && draft.chargeLines.every((line) => line.templateKey && line.description.trim() && line.appliesWhen.trim() && Number(line.amount) > 0),
  );
  const startEditing = () => {
    setDraft(createDraft(plan));
    setEditing(true);
  };
  const cancelEditing = () => {
    if (isCreating) {
      onClose();
      return;
    }
    setDraft(createDraft(plan));
    setEditing(false);
  };
  const changeStatus = (nextStatus) => {
    if (nextStatus === displayedPlan.status) return;
    const changedAt = new Date().toISOString();
    onSave({
      ...plan,
      status: nextStatus,
      lastUpdated: changedAt,
      versionHistory: [{
        historyId: `STATUS-${Date.now()}`,
        version: plan.version,
        event: "Status changed",
        role: "Pricing Manager",
        changedAt,
        summary: `Changed carrier rate status from ${formatStatus(plan.status)} to ${formatStatus(nextStatus)}.`,
      }, ...(plan.versionHistory || [])],
    }, "Carrier rate status updated.");
  };
  const saveChanges = () => {
    if (!canSave) return;
    const changedAt = new Date().toISOString();
    const nextVersion = isCreating ? 1 : Number(draft.version || 1) + 1;
    onSave({
      ...draft,
      version: nextVersion,
      name: draft.name.trim(),
      counterparty: draft.counterparty.trim(),
      chargeLines: draft.chargeLines.map((line) => ({
        ...line,
        description: line.description.trim(),
        appliesWhen: line.appliesWhen.trim(),
        amount: Number(line.amount),
      })),
      lastUpdated: changedAt,
      versionHistory: [{
        historyId: `EDIT-${Date.now()}`,
        version: nextVersion,
        event: isCreating ? "Created" : "Edited",
        role: "Pricing Manager",
        changedAt,
        summary: isCreating ? "Created the carrier rate plan." : "Updated carrier rate details and pricing rules.",
      }, ...(draft.versionHistory || [])],
    }, isCreating ? "Carrier rate created." : undefined);
    setEditing(false);
  };
  const updateRuleType = (index, templateKey) => {
    const template = baseRuleTemplates.find((candidate) => candidate.templateKey === templateKey);
    if (!template) return;
    setDraft((current) => ({
      ...current,
      chargeLines: current.chargeLines.map((line, lineIndex) => lineIndex === index ? {
        ...line,
        templateKey,
        source: template.label,
      } : line),
    }));
  };
  const addRule = () => {
    const code = `CARRIER-${Date.now()}`;
    setDraft((current) => ({
      ...current,
      chargeLines: [...current.chargeLines, {
        code,
        description: "",
        source: "",
        templateKey: "",
        appliesWhen: defaultAppliesWhen(current),
        amount: "",
      }],
    }));
    window.requestAnimationFrame(() => document.querySelector(`[data-carrier-rule-code="${code}"] [role="combobox"]`)?.focus());
  };
  const removeRule = (index) => setDraft((current) => ({
    ...current,
    chargeLines: current.chargeLines.filter((_, lineIndex) => lineIndex !== index),
  }));

  return (
    <DetailPageFrame
      title={isCreating ? "Create Carrier Rate" : plan.name}
      meta={isCreating ? undefined : `Carrier Rate・${displayedPlan.counterparty}`}
      headerActions={editing ? (
        <>
          <Button variant="text" color="secondary" sx={{ backgroundColor: "transparent !important", "&:hover": { backgroundColor: "rgba(99, 113, 124, .08) !important" } }} onClick={cancelEditing}>Cancel</Button>
          <Button variant="contained" startIcon={isCreating ? undefined : <Check size={16} />} disabled={!canSave} onClick={saveChanges}>{isCreating ? "Create" : "Save changes"}</Button>
        </>
      ) : (
        <>
          <QuotationStatusSelect value={displayedPlan.status} onChange={changeStatus} ariaLabel="Carrier rate status" options={carrierRateStatusOptions} />
          <Button variant="contained" startIcon={<PenLine size={16} />} onClick={startEditing}>Edit</Button>
        </>
      )}
      onClose={onClose}
      size="wide"
      stickyHeader
      hideBack={editing}
    >
      <div className="panel-stack quotation-panel-stack">
        {!isCreating ? <Alert className="rate-scope-alert" severity="info" variant="outlined" icon={<Info size={18} />}>
          Applies to {formatTransportMode(displayedPlan.transportMode)} shipments fulfilled by {displayedPlan.counterparty || "the selected carrier"}.
        </Alert> : null}
        <section className="ledger-section quotation-card quotation-overview-card">
          <div className="section-heading"><h2>Overview</h2></div>
          {editing ? (
            <div className="rate-plan-edit-grid">
              <AutocompleteInput label="Carrier" required options={partners.filter((partner) => partner.type === "carrier").map((partner) => partner.name)} value={draft.counterparty} onChange={(value) => updateDraftField("counterparty", value || "")} />
              <TextInput label="Rate plan name" required value={draft.name} onChange={(event) => updateDraftField("name", event.target.value)} />
              <SelectInput label="Transport mode" required value={draft.transportMode} onChange={(event) => updateDraftField("transportMode", event.target.value)} options={quotationShipmentModeOptions} />
              <TextInput label="Rate No." value={draft.ratePlanId} disabled helperText={isCreating ? "Generated automatically." : "Rate number cannot be changed after creation."} />
              <SelectInput label="Currency" required inputProps={{ "aria-label": "Currency" }} value={draft.currency} onChange={(event) => updateDraftField("currency", event.target.value)} options={[{ value: "USD", label: "USD" }, { value: "CAD", label: "CAD" }, { value: "MXN", label: "MXN" }]} />
            </div>
          ) : (
            <dl className="definition-grid">
              <div><dt>Carrier</dt><dd>{displayedPlan.counterparty}</dd></div>
              <div><dt>Rate plan name</dt><dd>{displayedPlan.name}</dd></div>
              <div><dt>Rate No.</dt><dd>{displayedPlan.ratePlanId}</dd></div>
              <div><dt>Transport mode</dt><dd>{formatTransportMode(displayedPlan.transportMode)}</dd></div>
              <div><dt>Currency</dt><dd>{displayedPlan.currency}</dd></div>
            </dl>
          )}
        </section>
        <section className="quotation-card quotation-rules-card">
          <div className="quotation-rule-group">
            <div className="section-heading"><h2>Pricing</h2>{editing ? <div className="section-heading-actions"><Button variant="outlined" size="small" startIcon={<Plus size={15} />} onClick={addRule}>Add rule</Button></div> : null}</div>
            <div className={`rate-rule-table surcharge-rule-table ${editing ? "is-editing" : ""}`} role="table" aria-label="Carrier pricing rules">
              <div className="rate-rule-head" role="row"><span role="columnheader">Fee item</span><span role="columnheader">Rule template</span><span role="columnheader">Applies when</span><span role="columnheader">Pricing</span>{editing ? <span role="columnheader" aria-label="Actions" /> : null}</div>
              {!(displayedPlan.chargeLines || []).length ? (
                <div className="rate-rule-empty" role="row">
                  <span role="cell">{editing ? "No pricing rules yet. Select Add rule to create one." : "No pricing rules available."}</span>
                </div>
              ) : null}
              {(displayedPlan.chargeLines || []).map((line, index) => editing ? (
                <div role="row" key={line.code} data-carrier-rule-code={line.code}>
                  <TextInput aria-label={`Carrier rule ${index + 1} fee item`} required value={line.description} onChange={(event) => updateRule(index, "description", event.target.value)} />
                  <span role="cell" className="rule-type-edit-cell">
                    <SelectInput value={line.templateKey || ""} placeholder="Select rule template" inputProps={{ "aria-label": `Carrier rule ${index + 1} rule template` }} onChange={(event) => updateRuleType(index, event.target.value)} options={baseRuleTemplates.map((template) => ({ value: template.templateKey, label: template.label }))} />
                    <small>{baseRuleTemplates.find((template) => template.templateKey === line.templateKey)?.description || "Choose a pricing calculation pattern."}</small>
                  </span>
                  <SelectInput aria-label={`Carrier rule ${index + 1} applies when`} required value={line.appliesWhen} onChange={(event) => updateRule(index, "appliesWhen", event.target.value)} options={carrierRuleAppliesWhenOptions} />
                  <div role="cell" className="rule-pricing-edit-cell"><TextInput aria-label={`Carrier rule ${index + 1} pricing`} required type="number" value={line.amount} onChange={(event) => updateRule(index, "amount", event.target.value)} /><small>{displayedPlan.currency}</small></div>
                  <Tooltip title="Remove rule"><IconButton className="rule-delete-button" size="small" aria-label={`Remove carrier rule ${index + 1}`} onClick={() => removeRule(index)}><Trash2 size={16} /></IconButton></Tooltip>
                </div>
              ) : (
                <div role="row" key={line.code}>
                  <span role="cell"><strong>{line.description}</strong></span>
                  <span role="cell">{line.source}</span>
                  <span role="cell">{line.appliesWhen || formatTransportMode(displayedPlan.transportMode)}</span>
                  <strong role="cell">{formatMoney(line.amount, displayedPlan.currency)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        {!isCreating ? <section className="version-history-section quotation-inline-section" aria-labelledby="carrier-version-history-title">
          <div className="section-heading"><div><h2 id="carrier-version-history-title">Version History</h2><p>Record of carrier rate creation, edits, and status changes.</p></div></div>
          <ol className="version-history-timeline">
            {(displayedPlan.versionHistory || []).map((entry) => (
              <li key={entry.historyId || `${entry.version}-${entry.changedAt}`}>
                <span className="version-history-marker" aria-hidden="true" />
                <div className="version-history-entry">
                  <div className="version-history-entry-heading">
                    <div><strong>Version {entry.version}</strong><span>{entry.event}</span></div>
                    <time dateTime={entry.changedAt}>{formatDateTime(entry.changedAt)}</time>
                  </div>
                  <p>{entry.summary}</p>
                  <small>Edited by {entry.role}</small>
                </div>
              </li>
            ))}
          </ol>
        </section> : null}
      </div>
    </DetailPageFrame>
  );
}

function BolDocument({ shipment, stop, pageIndex = 0, pageCount = 1 }) {
  const [origin, destination] = shipment.route.split(" → ");
  const bolNumber = stop?.bolNumber || shipment.bolNumber || "Pending submission";
  const deliveryCompany = stop?.company || shipment.customer;
  const deliveryAddress = stop?.address || destination || "California";
  const bolCargoLines = stop?.cargoLines || fixture.jobDraft.cargoLines.slice(0, 1);
  const bolCargoTotals = calculateCargoTotals(bolCargoLines);
  return (
    <section className="bol-sheet bol-dialog-sheet" aria-label={`BOL ${bolNumber} for ${deliveryCompany}`}>
      <header className="bol-document-header">
        <div className="bol-document-brand">
          <span className="bol-document-logo">B</span>
          <div>
            <strong>BEST USA</strong>
            <small>Freight Forwarding &amp; Logistics</small>
            <small>Los Angeles, California · +1 310 555 0188</small>
          </div>
        </div>
        <div className="bol-document-title">
          <span>ORIGINAL</span>
          <h2>STRAIGHT BILL OF LADING</h2>
          <dl>
            <div><dt>BOL NO.</dt><dd>{bolNumber}</dd></div>
            <div><dt>SHIPMENT NO.</dt><dd>{shipment.shipmentId}</dd></div>
          </dl>
          <div className="bol-barcode" aria-label={`Barcode for ${bolNumber}`} />
        </div>
      </header>
      <div className="bol-reference-row">
        <div><small>SHIP DATE</small><strong>{formatDate(shipment.pickupDate, { withYear: true })}</strong></div>
        <div><small>CUSTOMER PO</small><strong>PO-{shipment.shipmentId.slice(-6)}</strong></div>
        <div><small>SERVICE</small><strong>{formatTransportMode(shipment.transportMode)} · {shipment.serviceType}</strong></div>
        <div><small>FREIGHT TERMS</small><strong>Prepaid</strong></div>
      </div>
      <div className="bol-party-grid">
        <section>
          <small>SHIP FROM</small>
          <strong>{origin || "—"} Distribution Center</strong>
          <span>1250 Commerce Way</span>
          <span>{origin || "California"}</span>
          <span>Contact: Shipping Department · (510) 555-0142</span>
        </section>
        <section>
          <small>SHIP TO</small>
          <strong>{deliveryCompany}</strong>
          <span>{deliveryAddress}</span>
          <span>{stop?.contact ? `Contact: ${stop.contact}` : "Contact: Receiving Department · (619) 555-0176"}</span>
          {stop?.timeWindow ? <span>Window: {stop.timeWindow}</span> : null}
        </section>
        <section>
          <small>THIRD PARTY FREIGHT CHARGES BILL TO</small>
          <strong>BEST USA Forwarder</strong>
          <span>2100 E. Pacific Coast Highway</span>
          <span>Long Beach, CA 90804</span>
        </section>
        <section>
          <small>CARRIER</small>
          <strong>BEST USA Contracted Carrier</strong>
          <span>SCAC: BUSA · Trailer: Pending</span>
          <span>PRO number: Assigned at pickup</span>
        </section>
      </div>
      <div className="bol-cargo-heading">CUSTOMER ORDER INFORMATION</div>
      <table className="bol-cargo-table">
        <thead>
          <tr><th>Handling Units</th><th>Packages</th><th>Description of Articles</th><th>NMFC</th><th>Class</th><th>Weight</th></tr>
        </thead>
        <tbody>
          {bolCargoLines.map((line) => <tr key={line.lineId}><td>{line.handlingUnitCount || 0} {line.handlingUnitType === "Pallet" ? "PLTS" : "H/U"}</td><td>{line.packagePieceCount || 0} {line.packageType === "Carton" ? "CTNS" : "PCS"}</td><td>{line.commodityDescription || "Cargo item"}<br /><small>{line.hazmat ? "Hazardous" : "Non-hazardous"} · {line.stackable ? "Stackable" : "Do not stack"}</small></td><td>{line.nmfc || "—"}</td><td>{line.freightClass || "—"}</td><td>{Number(line.weight?.value || 0).toLocaleString()} {String(line.weight?.unit || "lb").toUpperCase()}</td></tr>)}
          <tr className="bol-total-row"><td>{bolCargoTotals.totalHandlingUnits}</td><td>{bolCargoTotals.totalPackagesPieces}</td><td colSpan="3">TOTAL</td><td>{bolCargoTotals.totalWeight.toLocaleString()} LB</td></tr>
        </tbody>
      </table>
      <div className="bol-special-services">
        <div><small>SPECIAL INSTRUCTIONS</small><p>Call consignee before delivery. Liftgate service required. Do not break pallets without written authorization.</p></div>
        <div><small>DECLARED VALUE</small><strong>$25,000 USD</strong></div>
      </div>
      <p className="bol-legal-copy">Received, subject to individually determined rates or contracts agreed upon in writing between the carrier and shipper. The property described above is in apparent good order, except as noted, and is marked, consigned, and destined as indicated.</p>
      <div className="bol-signature-grid">
        <section><span>Shipper signature</span><strong>____________________________</strong><small>Date: __________________</small></section>
        <section><span>Carrier signature / pickup date</span><strong>____________________________</strong><small>Trailer / seal: _____________</small></section>
        <section><span>Consignee signature</span><strong>____________________________</strong><small>Date: __________________</small></section>
      </div>
      <footer><span>{bolNumber} · Page {pageIndex + 1} of {pageCount}</span><span>BEST USA · Straight Bill of Lading</span></footer>
    </section>
  );
}

function BolPreviewDialog({ shipment, stop, fieldValues = {}, onClose, autoExport = false, onAutoExportComplete }) {
  const [activeStopId, setActiveStopId] = useState(null);
  const [exportState, setExportState] = useState("idle");
  const documentsRef = useRef(null);
  const bolStops = useMemo(() => {
    const documents = buildShipmentBolDocuments(shipment, fieldValues);
    if (!stop) return documents;
    const selectedIndex = documents.findIndex((candidate) => candidate.stopId === stop.stopId);
    if (selectedIndex < 0) return documents.length ? documents : [stop];
    documents[selectedIndex] = { ...documents[selectedIndex], ...stop };
    return documents;
  }, [shipment, stop, fieldValues]);
  useEffect(() => {
    setActiveStopId(stop?.stopId || bolStops[0]?.stopId || null);
  }, [shipment?.shipmentId, stop?.stopId, bolStops.length]);
  const exportBolPdf = async () => {
    if (!shipment || exportState === "exporting") return;
    const sourceSheets = Array.from(documentsRef.current?.querySelectorAll(".bol-dialog-sheet") || []);
    if (!sourceSheets.length) return;
    setExportState("exporting");
    const exportHost = document.createElement("div");
    Object.assign(exportHost.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "760px",
      background: "#ffffff",
      zIndex: "-1",
    });
    document.body.appendChild(exportHost);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      if (document.fonts?.ready) await document.fonts.ready;
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      for (let index = 0; index < sourceSheets.length; index += 1) {
        const clone = sourceSheets[index].cloneNode(true);
        Object.assign(clone.style, {
          width: "760px",
          minHeight: "940px",
          margin: "0",
          boxShadow: "none",
        });
        exportHost.replaceChildren(clone);
        await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
        const canvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
        });
        if (index > 0) pdf.addPage("letter", "portrait");
        const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
        const imageWidth = canvas.width * scale;
        const imageHeight = canvas.height * scale;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageWidth - imageWidth) / 2, margin, imageWidth, imageHeight, undefined, "FAST");
      }
      pdf.save(`${shipment.shipmentId}-${bolStops.length > 1 ? `${bolStops.length}-BOLs` : "BOL"}.pdf`);
      setExportState("success");
      onAutoExportComplete?.();
    } catch (error) {
      setExportState("error");
      onAutoExportComplete?.();
    } finally {
      exportHost.remove();
    }
  };
  useEffect(() => {
    if (!shipment || !autoExport || !bolStops.length) return undefined;
    const timer = window.setTimeout(() => {
      exportBolPdf();
    }, 240);
    return () => window.clearTimeout(timer);
  }, [shipment?.shipmentId, autoExport, bolStops.length]);
  if (!shipment) return null;
  const activeStop = bolStops.find((candidate) => candidate.stopId === activeStopId) || bolStops[0] || stop;
  const activeStopIndex = Math.max(0, bolStops.findIndex((candidate) => candidate.stopId === activeStop?.stopId));
  const goToBolPage = (nextIndex) => {
    const nextStop = bolStops[nextIndex];
    if (nextStop) setActiveStopId(nextStop.stopId);
  };
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="bol-preview-title" className="bol-preview-dialog">
      <DialogTitle className="bol-preview-dialog-title">
        <span id="bol-preview-title">Bill Of Lading Preview</span>
        {bolStops.length > 1 ? (
          <span className="bol-preview-page-controls" role="navigation" aria-label="Bill of Lading pages">
            <IconButton
              size="small"
              aria-label="Previous BOL"
              disabled={activeStopIndex === 0}
              onClick={() => goToBolPage(activeStopIndex - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </IconButton>
            <span className="bol-preview-page-indicator" aria-live="polite">{activeStopIndex + 1} / {bolStops.length}</span>
            <IconButton
              size="small"
              aria-label="Next BOL"
              disabled={activeStopIndex === bolStops.length - 1}
              onClick={() => goToBolPage(activeStopIndex + 1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </IconButton>
          </span>
        ) : null}
      </DialogTitle>
      <DialogContent dividers className="bol-dialog-content">
        <div className="bol-preview-documents" ref={documentsRef}>
          {bolStops.map((candidate, pageIndex) => (
            <div className={candidate.stopId === activeStop?.stopId ? "is-active" : "is-hidden"} key={candidate.stopId}>
              <BolDocument shipment={shipment} stop={candidate} pageIndex={pageIndex} pageCount={bolStops.length} />
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {exportState === "error" ? <span className="bol-export-status is-error" role="alert"><CircleAlert size={16} />PDF export failed</span> : null}
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={exportState === "exporting"}
          startIcon={exportState === "exporting" ? <CircularProgress size={16} color="inherit" /> : <Download size={17} />}
          onClick={exportBolPdf}
        >
          {exportState === "exporting" ? "Exporting…" : `Export ${formatBolCount(bolStops.length)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ShipmentsTable({ shipments, onOpen, onOpenBol, onDelete, selectedId, selectedIds, onSelectedIdsChange, rowsPerPage, noRowsLabel = "No matching shipments", emptyStateVisual = "search", emptyStateHint }) {
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });
  const closeActionMenu = () => setActionMenu({ anchorEl: null, row: null });
  const columns = [
    { field: "shipmentId", headerName: "Shipment No.", minWidth: 132, flex: .9, renderCell: ({ row }) => <div className="grid-primary-cell"><span>{row.shipmentId}</span></div> },
    { field: "customer", headerName: "Customer", minWidth: 145, flex: 1.05 },
    { field: "serviceType", headerName: "Service Type", width: 105, renderCell: ({ value }) => <span className="mode-tag">{value}</span> },
    { field: "route", headerName: "Route", minWidth: 270, flex: 1.95, renderCell: ({ value }) => <span className="route-cell">{value}</span> },
    { field: "listStatus", headerName: "Status", width: 174, minWidth: 166, renderCell: ({ row }) => (
      <span className="shipment-status-cell">
        <StatusBadge status={row.listStatus} />
      </span>
    ) },
    {
      field: "bolNumber",
      headerName: "BOL",
      width: 64,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => row.transportMode === "TRUCKING" && row.bolNumber ? (
        <Tooltip title="View BOL">
          <IconButton
            size="small"
            aria-label={"View BOL for " + row.shipmentId}
            onClick={(event) => {
              event.stopPropagation();
              onOpenBol(row.shipmentId);
            }}
            sx={{
              width: 32,
              height: 32,
              color: "primary.main",
              borderRadius: 2,
              "&:hover": { backgroundColor: "primary.100" },
            }}
          >
            <FileOutput size={17} />
          </IconButton>
        </Tooltip>
      ) : <span className="table-empty">—</span>,
    },
    { field: "lastUpdated", headerName: "Last updated", width: 150, renderCell: ({ value }) => formatDateTime(value) },
    { field: "actions", headerName: "", width: 56, sortable: false, filterable: false, align: "right", renderCell: ({ row }) => <RowActionButton label={row.shipmentId} onClick={(event) => setActionMenu({ anchorEl: event.currentTarget, row })} /> },
  ];
  return (
    <>
      <ManagementDataGrid rows={shipments} columns={columns} getRowId={(row) => row.shipmentId} onOpenRow={onOpen} isRowOpenable={(row) => row.detailAvailable !== false} ariaLabel="Shipments" selectedId={selectedId} selectedIds={selectedIds} onSelectedIdsChange={onSelectedIdsChange} rowsPerPage={rowsPerPage} noRowsLabel={noRowsLabel} emptyStateVisual={emptyStateVisual} emptyStateHint={emptyStateHint} />
      <RowActionMenu
        label={actionMenu.row?.shipmentId || "Shipment"}
        anchorEl={actionMenu.anchorEl}
        onClose={closeActionMenu}
        onEdit={actionMenu.row?.detailAvailable !== false ? () => actionMenu.row && onOpen(actionMenu.row) : undefined}
        onDelete={() => actionMenu.row && onDelete(actionMenu.row.shipmentId)}
      />
    </>
  );
}

function QuotationsTable({ rows, onOpen, onEdit, onDuplicate, onDelete, selectedIds, onSelectedIdsChange, rowsPerPage }) {
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });
  const closeActionMenu = () => setActionMenu({ anchorEl: null, row: null });
  const columns = [
    { field: "name", headerName: "Quote Plan", minWidth: 200, flex: 1.15, renderCell: ({ value }) => <div className="grid-primary-cell"><span>{value}</span></div> },
    { field: "quoteId", headerName: "Quote No.", width: 130 },
    { field: "customer", headerName: "Customer", minWidth: 210, flex: 1.25, renderCell: ({ row }) => <div className="grid-primary-cell"><span>{row.customer}</span></div> },
    { field: "transportMode", headerName: "Transport mode", minWidth: 130, flex: .8, renderCell: ({ value }) => formatTransportMode(value) },
    { field: "status", headerName: "Status", width: 100, renderCell: ({ value }) => <StatusBadge status={value} /> },
    { field: "createdAt", headerName: "Created", width: 100, renderCell: ({ value }) => formatDate(value) },
    { field: "lastUpdated", headerName: "Updated", width: 95, renderCell: ({ value }) => formatDate(value) },
    { field: "actions", headerName: "", width: 56, sortable: false, filterable: false, align: "right", renderCell: ({ row }) => <RowActionButton label={row.quoteId} onClick={(event) => setActionMenu({ anchorEl: event.currentTarget, row })} /> },
  ];
  return (
    <>
      <ManagementDataGrid rows={rows} columns={columns} getRowId={(row) => row.quoteId} onOpenRow={onOpen} selectedIds={selectedIds} onSelectedIdsChange={onSelectedIdsChange} ariaLabel="Rate plans" rowsPerPage={rowsPerPage} noRowsLabel="No matching rate plans" />
      <RowActionMenu
        label={actionMenu.row?.quoteId || "Customer quote"}
        anchorEl={actionMenu.anchorEl}
        onClose={closeActionMenu}
        onEdit={() => actionMenu.row && onEdit(actionMenu.row)}
        onDuplicate={() => actionMenu.row && onDuplicate(actionMenu.row)}
        onDelete={() => actionMenu.row && onDelete(actionMenu.row.quoteId)}
      />
    </>
  );
}

function CarrierRatePlansTable({ rows, onOpen, onEdit, onDuplicate, onDelete, selectedIds, onSelectedIdsChange, rowsPerPage }) {
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });
  const closeActionMenu = () => setActionMenu({ anchorEl: null, row: null });
  const columns = [
    { field: "name", headerName: "Rate Plan", minWidth: 210, flex: 1.2, renderCell: ({ value }) => <div className="grid-primary-cell"><span>{value}</span></div> },
    { field: "ratePlanId", headerName: "Rate No.", width: 135 },
    { field: "counterparty", headerName: "Carrier", minWidth: 210, flex: 1.2 },
    { field: "transportMode", headerName: "Transport mode", minWidth: 150, flex: 1, renderCell: ({ value }) => formatTransportMode(value) },
    { field: "status", headerName: "Status", width: 100, renderCell: ({ value }) => <StatusBadge status={value} /> },
    { field: "lastUpdated", headerName: "Updated", width: 105, renderCell: ({ value }) => formatDate(value) },
    { field: "actions", headerName: "", width: 56, sortable: false, filterable: false, align: "right", renderCell: ({ row }) => <RowActionButton label={row.ratePlanId} onClick={(event) => setActionMenu({ anchorEl: event.currentTarget, row })} /> },
  ];
  return (
    <>
      <ManagementDataGrid rows={rows} columns={columns} getRowId={(row) => row.ratePlanId} onOpenRow={onOpen} selectedIds={selectedIds} onSelectedIdsChange={onSelectedIdsChange} ariaLabel="Carrier rates" rowsPerPage={rowsPerPage} noRowsLabel="No matching carrier rates" />
      <RowActionMenu
        label={actionMenu.row?.ratePlanId || "Carrier rate"}
        anchorEl={actionMenu.anchorEl}
        onClose={closeActionMenu}
        onEdit={() => actionMenu.row && onEdit(actionMenu.row)}
        onDuplicate={() => actionMenu.row && onDuplicate(actionMenu.row)}
        onDelete={() => actionMenu.row && onDelete(actionMenu.row.ratePlanId)}
      />
    </>
  );
}

function BillingTable({ rows, billingType, onOpen, onOpenShipment, onExportCsv, onExportPdf, expandedGroupKeys, onExpandedGroupKeysChange }) {
  const groups = useMemo(() => {
    const groupedRows = new Map();
    rows.forEach((row) => {
      const key = `${row.billingType}:${row.counterparty}`;
      if (!groupedRows.has(key)) groupedRows.set(key, { key, counterparty: row.counterparty, billingType: row.billingType, rows: [] });
      groupedRows.get(key).rows.push(row);
    });
    return [...groupedRows.values()].map((group) => {
      const amountRows = group.rows.filter((row) => row.amount !== null && row.amount !== undefined);
      return {
        ...group,
        amount: amountRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        hasAmount: amountRows.length > 0,
        currency: amountRows[0]?.currency || group.rows[0]?.currency || "USD",
      };
    });
  }, [rows]);
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState(null);
  const [activeGroupMenuKey, setActiveGroupMenuKey] = useState(null);
  const activeGroupMenu = groups.find((group) => group.key === activeGroupMenuKey) || null;
  const closeGroupMenu = () => {
    setGroupMenuAnchorEl(null);
    setActiveGroupMenuKey(null);
  };
  const groupSignature = groups.map((group) => `${group.key}:${group.rows.length}`).join("|");
  useEffect(() => {
    onExpandedGroupKeysChange((current) => {
      const validKeys = new Set(groups.map((group) => group.key));
      const retained = current.filter((key) => validKeys.has(key));
      return retained.length === current.length ? current : retained;
    });
  }, [groupSignature]);
  const toggleGroup = (key) => onExpandedGroupKeysChange((current) => current.includes(key)
    ? current.filter((candidate) => candidate !== key)
    : [...current, key]);
  const noRowsLabel = billingType === "customer_ar"
    ? "No matching customer billing tasks"
    : billingType === "vendor_ap"
      ? "No matching carrier billing tasks"
      : "No matching billing records";
  if (!groups.length) return <div className="billing-groups-empty">{noRowsLabel}</div>;
  return (
    <div className="billing-grouped-list" aria-label={`${billingType === "all" ? "All" : billingTypeLabels[billingType]} billing shipments grouped by counterparty`}>
      {groups.map((group, groupIndex) => {
        const expanded = expandedGroupKeys.includes(group.key);
        const panelId = `billing-counterparty-group-${groupIndex}`;
        const customerAr = group.billingType === "customer_ar";
        const typeLabel = customerAr ? "Customer" : "Carrier";
        const accountingSideLabel = customerAr ? "AR" : "AP";
        return (
          <section className={`billing-counterparty-group ${expanded ? "is-expanded" : ""}`} key={group.key}>
            <header className="billing-counterparty-header">
              <button
                type="button"
                className="billing-counterparty-toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.key)}
              >
                <span className="billing-counterparty-chevron" aria-hidden="true">{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                <span className="billing-counterparty-name">
                  <span className="billing-counterparty-name-line">
                    <strong>{group.counterparty}</strong>
                  </span>
                  <small>{typeLabel}</small>
                </span>
                <span className="billing-counterparty-task-count">{group.rows.length} {group.rows.length === 1 ? "shipment" : "shipments"}</span>
                <span className="billing-counterparty-amount">
                  <Chip className={`billing-type-tag ${customerAr ? "is-ar" : "is-ap"}`} label={accountingSideLabel} size="small" />
                  <strong>{group.hasAmount ? formatMoney(group.amount, group.currency) : "—"}</strong>
                </span>
              </button>
              <Tooltip title="More actions" placement="top">
                <IconButton
                  className="billing-counterparty-more"
                  aria-label={`${group.counterparty} actions`}
                  aria-haspopup="menu"
                  aria-expanded={activeGroupMenuKey === group.key && Boolean(groupMenuAnchorEl)}
                  onClick={(event) => {
                    setGroupMenuAnchorEl(event.currentTarget);
                    setActiveGroupMenuKey(group.key);
                  }}
                >
                  <MoreVertical size={18} aria-hidden="true" />
                </IconButton>
              </Tooltip>
            </header>
            {expanded ? (
              <div className="billing-counterparty-body" id={panelId}>
                <div className="billing-task-table-scroll">
                  <table className="billing-task-table">
                    <thead><tr><th>Shipment</th><th>Transport mode</th><th>Record No.</th><th>Billing date</th><th className="is-numeric">Amount</th></tr></thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.billingId}>
                          <td><button className="table-link" type="button" onClick={() => onOpenShipment(row.shipmentId)}>{row.shipmentId}<ArrowUpRight size={13} /></button></td>
                          <td>{formatTransportMode(row.transportMode)}</td>
                          <td><button className="billing-record-link" type="button" onClick={() => onOpen(row)}>{row.billingId}</button></td>
                          <td>{row.billingDate ? formatDate(row.billingDate) : <span className="table-empty">—</span>}</td>
                          <td className="is-numeric">{formatMoney(row.amount, row.currency) || <span className="table-empty">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      <Menu
        anchorEl={groupMenuAnchorEl}
        open={Boolean(groupMenuAnchorEl)}
        onClose={closeGroupMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { "aria-label": "Billing party actions" } }}
      >
        <MenuItem onClick={() => {
          if (activeGroupMenu) onExportCsv(activeGroupMenu);
          closeGroupMenu();
        }}>
          Export CSV
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeGroupMenu) onExportPdf(activeGroupMenu);
          closeGroupMenu();
        }}>
          Export PDF
        </MenuItem>
      </Menu>
    </div>
  );
}

function PartnerFormPage({ draft, onChange, onClose, onSave }) {
  const value = draft;
  const editing = Boolean(value.partnerId);
  const roleLabel = value.type === "carrier" ? "Carrier" : "Customer";
  const update = (key) => (event) => onChange({ ...value, [key]: event.target.value });
  return (
    <DetailPageFrame
      title={editing ? `Edit ${roleLabel}` : `Create ${roleLabel}`}
      meta={editing ? value.name : undefined}
      onClose={onClose}
      size="medium"
      compactHeader
      hideBack
      headerActions={(
        <>
          <Button variant="text" color="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!value.name.trim()} onClick={onSave}>{editing ? "Save changes" : "Create"}</Button>
        </>
      )}
    >
      <div className="panel-stack partner-form-page">
        <section className="partner-form-section" aria-labelledby="partner-details-title">
          <div className="section-heading"><h2 id="partner-details-title">{roleLabel} Details</h2></div>
          <Box className="partner-page-form-grid">
            <TextInput label={`${roleLabel} name`} value={value.name} onChange={update("name")} required placeholder="Enter legal or trading name" />
          <TextInput label="Primary contact" value={value.contactName} onChange={update("contactName")} placeholder="Enter contact name" />
          <TextInput label="Email" type="email" value={value.email} onChange={update("email")} placeholder="Email address" />
          <TextInput label="Mobile" type="tel" value={value.mobile || ""} onChange={update("mobile")} placeholder="Enter mobile number" />
          <TextInput label="Office phone" type="tel" value={value.phone} onChange={update("phone")} placeholder="Enter office phone number" />
          </Box>
        </section>
      </div>
    </DetailPageFrame>
  );
}

function PartnersTable({ rows, entityLabel, onEdit, onDelete, selectedIds, onSelectedIdsChange, rowsPerPage }) {
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });
  const closeActionMenu = () => setActionMenu({ anchorEl: null, row: null });
  const columns = [
    { field: "name", headerName: entityLabel, minWidth: 220, flex: 1.2 },
    { field: "contactName", headerName: "Primary Contact", minWidth: 150, flex: .9, renderCell: ({ value }) => value || <span className="table-empty">—</span> },
    { field: "email", headerName: "Email", minWidth: 210, flex: 1, renderCell: ({ value }) => value || <span className="table-empty">—</span> },
    { field: "mobile", headerName: "Mobile", width: 145, renderCell: ({ value }) => value || <span className="table-empty">—</span> },
    { field: "phone", headerName: "Phone", width: 145, renderCell: ({ value }) => value || <span className="table-empty">—</span> },
    { field: "actions", headerName: "", width: 56, sortable: false, filterable: false, align: "right", renderCell: ({ row }) => <RowActionButton label={row.name} onClick={(event) => setActionMenu({ anchorEl: event.currentTarget, row })} /> },
  ];
  return (
    <>
      <ManagementDataGrid rows={rows} columns={columns} getRowId={(row) => row.partnerId} onOpenRow={onEdit} selectedIds={selectedIds} onSelectedIdsChange={onSelectedIdsChange} rowsPerPage={rowsPerPage} ariaLabel={`${entityLabel} master data`} noRowsLabel={`No matching ${entityLabel.toLowerCase()}`} />
      <RowActionMenu
        label={actionMenu.row?.name || entityLabel}
        anchorEl={actionMenu.anchorEl}
        onClose={closeActionMenu}
        onEdit={() => actionMenu.row && onEdit(actionMenu.row)}
        onDelete={() => actionMenu.row && onDelete(actionMenu.row.partnerId)}
      />
    </>
  );
}

function ReportSeriesChart({ data, chart, variant, ariaLabel }) {
  const chartWidth = 600;
  const chartHeight = 200;
  const horizontalPadding = 8;
  const baseline = 196;
  const pointFor = (value, index) => ({
    x: ((index + .5) / Math.max(data.length, 1)) * chartWidth,
    y: baseline - (value / chart.max) * 176,
  });
  const pointsFor = (key) => data.map((entry, index) => {
    const point = pointFor(entry[key], index);
    return point.x + "," + point.y;
  }).join(" ");

  return (
    <div className={"report-chart-plot report-series-chart is-" + variant} role="img" aria-label={ariaLabel}>
      <svg className="report-series-svg" viewBox={"0 0 " + chartWidth + " " + chartHeight} preserveAspectRatio="none" aria-hidden="true">
        {chart.series.map((series) => {
          const points = pointsFor(series.key);
          const areaPoints = horizontalPadding + "," + baseline + " " + points + " " + (chartWidth - horizontalPadding) + "," + baseline;
          return (
            <g key={series.key} className={"report-series " + series.className}>
              {variant === "area" ? <polygon className="report-series-area" points={areaPoints} /> : null}
              <polyline className="report-series-line" points={points} />
            </g>
          );
        })}
      </svg>
      <div className="report-chart-point-targets" style={{ gridTemplateColumns: "repeat(" + data.length + ", minmax(52px, 1fr))" }}>
        {data.map((entry, index) => (
          <div className="report-chart-point-target" key={entry.key} tabIndex="0" aria-label={entry.fullLabel}>
            {chart.series.map((series) => {
              const point = pointFor(entry[series.key], index);
              return <span key={series.key} className={"report-series-html-point " + series.className} style={{ top: point.y }} />;
            })}
            <div className="report-chart-tooltip" aria-hidden="true">
              <strong>{entry.fullLabel}</strong>
              {chart.series.map((series) => (
                <span key={series.key}>
                  <i className={series.className} />
                  <span>{series.label}</span>
                  <b>{chart.unitPrefix}{entry[series.key]}{chart.unitSuffix}</b>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="report-series-months" style={{ gridTemplateColumns: "repeat(" + data.length + ", minmax(52px, 1fr))" }}>
        {data.map((entry) => <span key={entry.key}>{entry.label}</span>)}
      </div>
    </div>
  );
}

function ReportChartSelector({ chartView, onChartViewChange }) {
  const chartOptions = [
    { value: "finance", label: "Revenue & cost" },
    { value: "profit", label: "Gross profit" },
    { value: "volume", label: "Shipment volume" },
  ];
  return (
    <div className="report-chart-type-field">
      <span className="report-filter-field-label" id="report-chart-type-label">Type</span>
      <FormControl className="report-chart-selector" size="small">
        <Select labelId="report-chart-type-label" value={chartView} onChange={(event) => onChartViewChange(event.target.value)} inputProps={{ "aria-label": "Chart analysis" }}>
          {chartOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </Select>
      </FormControl>
    </div>
  );
}

function ReportDimensionSelector({ dimension, onDimensionChange }) {
  const dimensionOptions = [
    { value: "month", label: "Month" },
    { value: "customer", label: "Customer" },
    { value: "service_type", label: "Service type" },
    { value: "route", label: "Route" },
  ];
  return (
    <div className="report-chart-dimension-field">
      <span className="report-filter-field-label" id="report-chart-dimension-label">Dimension</span>
      <FormControl className="report-dimension-selector" size="small">
        <Select labelId="report-chart-dimension-label" value={dimension} onChange={(event) => onDimensionChange(event.target.value)} inputProps={{ "aria-label": "Chart dimension" }}>
          {dimensionOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </Select>
      </FormControl>
    </div>
  );
}

function getDefaultReportDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toInputDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
}

function ReportDateRangeFilter({
  dateRange,
  onDateRangeChange,
  label = "Date Range",
  ariaLabel = "Chart date range",
  minDate = "2026-04-01",
  maxDate = "2026-09-30",
  className = "",
  showLabel = true,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [draftRange, setDraftRange] = useState(dateRange);
  const open = Boolean(anchorEl);
  const updateDraftDate = (key) => (event) => {
    const value = event.target.value;
    if (key === "dateFrom") {
      setDraftRange((current) => ({ dateFrom: value, dateTo: value > current.dateTo ? value : current.dateTo }));
      return;
    }
    setDraftRange((current) => ({ dateFrom: value < current.dateFrom ? value : current.dateFrom, dateTo: value }));
  };
  const openPicker = (event) => {
    setDraftRange(dateRange);
    setAnchorEl(event.currentTarget);
  };
  const closePicker = () => setAnchorEl(null);
  const applyRange = () => {
    onDateRangeChange(draftRange);
    closePicker();
  };
  return (
    <>
      <div className={`report-date-range-field ${className}`.trim()}>
        {showLabel ? <span className="report-filter-field-label">{label}</span> : null}
        <Button
          className="report-date-range-trigger"
          variant="outlined"
          startIcon={<CalendarRange size={16} />}
          aria-label={`${ariaLabel}: ${formatDate(dateRange.dateFrom)} to ${formatDate(dateRange.dateTo)}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openPicker}
        >
          {formatDate(dateRange.dateFrom)} – {formatDate(dateRange.dateTo)}
        </Button>
      </div>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { className: "report-date-range-popover" } }}
      >
        <section aria-label={`Choose ${label.toLowerCase()}`}>
          <h3>{label}</h3>
          <div className="report-date-range-fields">
            <TextField
              label="From"
              type="date"
              size="small"
              value={draftRange.dateFrom}
              onChange={updateDraftDate("dateFrom")}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate, max: draftRange.dateTo } }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={draftRange.dateTo}
              onChange={updateDraftDate("dateTo")}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: draftRange.dateFrom, max: maxDate } }}
            />
          </div>
          <div className="report-date-range-actions">
            <Button variant="text" color="secondary" onClick={closePicker}>Cancel</Button>
            <Button variant="contained" onClick={applyRange}>Apply</Button>
          </div>
        </section>
      </Popover>
    </>
  );
}

const reportMonthlyChartData = [
    { key: "2026-04", label: "Apr", fullLabel: "Apr 2026", date: "2026-04-01", revenue: 18, cost: 11, profit: 7, draft: 18, confirmed: 7 },
    { key: "2026-05", label: "May", fullLabel: "May 2026", date: "2026-05-01", revenue: 24, cost: 15, profit: 9, draft: 20, confirmed: 8 },
    { key: "2026-06", label: "Jun", fullLabel: "Jun 2026", date: "2026-06-01", revenue: 21, cost: 14, profit: 7, draft: 17, confirmed: 9 },
    { key: "2026-07", label: "Jul", fullLabel: "Jul 2026", date: "2026-07-01", revenue: 29, cost: 18, profit: 11, draft: 21, confirmed: 9 },
    { key: "2026-08", label: "Aug", fullLabel: "Aug 2026", date: "2026-08-01", revenue: 33, cost: 21, profit: 12, draft: 19, confirmed: 10 },
    { key: "2026-09", label: "Sep", fullLabel: "Sep 2026", date: "2026-09-01", revenue: 38, cost: 24, profit: 14, draft: 20, confirmed: 10 },
];
const reportGroupedChartData = {
    customer: [
      { key: "retail", label: "Retail Dist.", fullLabel: "Demo Retail Distribution LLC", revenue: 34, cost: 21, profit: 13, draft: 26, confirmed: 16 },
      { key: "home", label: "Home Supply", fullLabel: "Demo Home Supply Inc.", revenue: 29, cost: 18, profit: 11, draft: 22, confirmed: 14 },
      { key: "foods", label: "Foods West", fullLabel: "Demo Foods West LLC", revenue: 24, cost: 15, profit: 9, draft: 18, confirmed: 12 },
      { key: "industrial", label: "Industrial", fullLabel: "Summit Industrial", revenue: 19, cost: 12, profit: 7, draft: 14, confirmed: 10 },
    ],
    service_type: [
      { key: "ltl", label: "LTL", fullLabel: "LTL shipments", revenue: 38, cost: 24, profit: 14, draft: 30, confirmed: 19 },
      { key: "ftl", label: "FTL", fullLabel: "FTL shipments", revenue: 29, cost: 18, profit: 11, draft: 24, confirmed: 15 },
      { key: "refrigerated", label: "Refrigerated", fullLabel: "Refrigerated shipments", revenue: 21, cost: 14, profit: 7, draft: 12, confirmed: 8 },
    ],
    route: [
      { key: "los-angeles", label: "Los Angeles", fullLabel: "California to Los Angeles", revenue: 33, cost: 21, profit: 12, draft: 25, confirmed: 16 },
      { key: "san-diego", label: "San Diego", fullLabel: "California to San Diego", revenue: 27, cost: 17, profit: 10, draft: 21, confirmed: 13 },
      { key: "las-vegas", label: "Las Vegas", fullLabel: "California to Las Vegas", revenue: 24, cost: 15, profit: 9, draft: 18, confirmed: 12 },
      { key: "northwest", label: "Northwest", fullLabel: "California to Northwest", revenue: 18, cost: 12, profit: 6, draft: 13, confirmed: 9 },
    ],
};
const reportDimensionLabels = {
    month: "Month",
    customer: "Customer",
    service_type: "Service Type",
    route: "Route",
};
const reportChartViews = {
    finance: {
      label: "Revenue & cost",
      title: "Revenue And Vendor Cost",
      max: 40,
      axis: ["$40k", "$30k", "$20k", "$10k", "$0"],
      unitPrefix: "$",
      unitSuffix: "k",
      ariaLabel: "Monthly revenue and vendor cost",
      series: [
        { key: "revenue", label: "Revenue", className: "is-revenue" },
        { key: "cost", label: "Vendor cost", className: "is-cost" },
      ],
    },
    profit: {
      label: "Gross profit",
      title: "Gross Profit",
      max: 16,
      axis: ["$16k", "$12k", "$8k", "$4k", "$0"],
      unitPrefix: "$",
      unitSuffix: "k",
      ariaLabel: "Monthly gross profit",
      series: [{ key: "profit", label: "Gross profit", className: "is-profit" }],
    },
    volume: {
      label: "Shipment volume",
      title: "Shipment Volume",
      max: 32,
      axis: ["32", "24", "16", "8", "0"],
      unitPrefix: "",
      unitSuffix: " shipments",
      ariaLabel: "Monthly draft and confirmed shipment volume",
      series: [
        { key: "draft", label: "Draft", className: "is-draft" },
        { key: "confirmed", label: "Confirmed", className: "is-confirmed" },
      ],
    },
};

function getReportChartModel(chartView, chartDimension, chartDateRange) {
  const activeChart = {
    ...reportChartViews[chartView],
    title: `${reportChartViews[chartView].title} By ${reportDimensionLabels[chartDimension]}`,
    ariaLabel: `${reportChartViews[chartView].label} by ${reportDimensionLabels[chartDimension]}`,
  };
  const startMonth = chartDateRange.dateFrom.slice(0, 7);
  const endMonth = chartDateRange.dateTo.slice(0, 7);
  const visibleMonthlyData = reportMonthlyChartData.filter((entry) => {
    const entryMonth = entry.date.slice(0, 7);
    return entryMonth >= startMonth && entryMonth <= endMonth;
  });
  const periodScale = visibleMonthlyData.length / reportMonthlyChartData.length;
  const visibleChartData = chartDimension === "month"
    ? visibleMonthlyData
    : reportGroupedChartData[chartDimension].map((entry) => ({
      ...entry,
      revenue: Math.max(1, Math.round(entry.revenue * periodScale)),
      cost: Math.max(1, Math.round(entry.cost * periodScale)),
      profit: Math.max(1, Math.round(entry.profit * periodScale)),
      draft: Math.max(1, Math.round(entry.draft * periodScale)),
      confirmed: Math.max(1, Math.round(entry.confirmed * periodScale)),
    }));
  const periodLabel = `${formatDate(chartDateRange.dateFrom)}–${formatDate(chartDateRange.dateTo)}`;
  return { activeChart, visibleChartData, periodLabel, dimensionLabel: reportDimensionLabels[chartDimension] };
}

function ReportsPreview({ onOpenShipment, chartView, onChartViewChange, chartDimension, onChartDimensionChange, chartDateRange, onChartDateRangeChange }) {
  const [chartLoading, setChartLoading] = useState(false);
  const chartTransitionTimer = useRef(null);
  const { activeChart, visibleChartData, periodLabel, dimensionLabel } = getReportChartModel(chartView, chartDimension, chartDateRange);
  useEffect(() => () => {
    if (chartTransitionTimer.current) window.clearTimeout(chartTransitionTimer.current);
  }, []);
  const updateChart = (update, value) => {
    setChartLoading(true);
    update(value);
    if (chartTransitionTimer.current) window.clearTimeout(chartTransitionTimer.current);
    chartTransitionTimer.current = window.setTimeout(() => {
      setChartLoading(false);
      chartTransitionTimer.current = null;
    }, 240);
  };
  const reportRows = baseShipments.map((shipment) => {
    const ar = billingRecords.find((record) => record.shipmentId === shipment.shipmentId && record.billingType === "customer_ar");
    const ap = billingRecords.find((record) => record.shipmentId === shipment.shipmentId && record.billingType === "vendor_ap");
    const revenue = ar?.amount ?? null;
    const cost = ap?.amount ?? null;
    const profit = revenue !== null && cost !== null ? revenue - cost : null;
    return {
      shipmentId: shipment.shipmentId,
      route: shipment.route,
      revenue,
      cost,
      profit,
      margin: profit !== null && revenue ? `${Math.round((profit / revenue) * 100)}%` : null,
    };
  });
  const reportColumns = [
    {
      field: "shipmentId",
      headerName: "Shipment No.",
      width: 140,
      renderCell: ({ row }) => (
        <button className="table-link report-shipment-link" type="button" onClick={(event) => { event.stopPropagation(); onOpenShipment(row.shipmentId); }}>
          {row.shipmentId}<ArrowUpRight size={13} />
        </button>
      ),
    },
    {
      field: "route",
      headerName: "Route",
      minWidth: 250,
      flex: 1.4,
      renderCell: ({ value }) => <span className="report-route-cell" title={value}>{value}</span>,
    },
    { field: "revenue", headerName: "Customer Revenue", width: 140, renderCell: ({ value }) => formatMoney(value) || "—" },
    { field: "cost", headerName: "Vendor Cost", width: 120, renderCell: ({ value }) => formatMoney(value) || "—" },
    { field: "profit", headerName: "Profit", width: 100, renderCell: ({ value }) => formatMoney(value) || "—" },
    { field: "margin", headerName: "Margin", width: 80, renderCell: ({ value }) => value || "—" },
  ];
  return (
    <div className="report-page">
      <section className="report-chart-filter-card" aria-label="Report chart filters">
        <div className="report-chart-control-row">
          <ReportChartSelector chartView={chartView} onChartViewChange={(value) => updateChart(onChartViewChange, value)} />
          <ReportDimensionSelector dimension={chartDimension} onDimensionChange={(value) => updateChart(onChartDimensionChange, value)} />
          <ReportDateRangeFilter dateRange={chartDateRange} onDateRangeChange={(value) => updateChart(onChartDateRangeChange, value)} />
        </div>
      </section>
      <section className="report-chart-card" aria-labelledby="report-chart-title" aria-busy={chartLoading}>
        <header>
          <div className="report-chart-summary-row">
            <div className="report-chart-heading">
              <h2 id="report-chart-title">{activeChart.title}</h2>
            </div>
            <div className="report-chart-legend" aria-hidden="true">
              {activeChart.series.map((series) => <span key={series.key}><i className={series.className} />{series.label}</span>)}
            </div>
          </div>
        </header>
        <div className={"report-chart-body" + (chartLoading ? " is-loading" : "")} style={{ "--report-chart-min-width": `${Math.max(240, visibleChartData.length * 90)}px` }}>
          {chartLoading ? <LinearProgress className="report-chart-loading-indicator" aria-label="Updating chart" /> : null}
          <div className="report-chart-axis" aria-hidden="true">
            {activeChart.axis.map((label) => <span key={label}>{label}</span>)}
          </div>
          {chartView === "finance" || chartDimension !== "month" ? (
            <div
              className="report-chart-plot"
              role="img"
              aria-label={activeChart.ariaLabel + ", " + periodLabel}
              style={{ gridTemplateColumns: "repeat(" + visibleChartData.length + ", minmax(52px, 1fr))" }}
            >
              {visibleChartData.map((chartEntry) => {
                const monthSummary = activeChart.series
                  .map((series) => series.label + ": " + activeChart.unitPrefix + chartEntry[series.key] + activeChart.unitSuffix)
                  .join(", ");
                return (
                  <div className="report-chart-group" key={chartEntry.key} tabIndex="0" aria-label={chartEntry.fullLabel + ", " + monthSummary}>
                    <div className="report-chart-tooltip" aria-hidden="true">
                      <strong>{chartEntry.fullLabel}</strong>
                      {activeChart.series.map((series) => (
                        <span key={series.key}>
                          <i className={series.className} />
                          <span>{series.label}</span>
                          <b>{activeChart.unitPrefix}{chartEntry[series.key]}{activeChart.unitSuffix}</b>
                        </span>
                      ))}
                    </div>
                    <div className="report-chart-bars">
                      {activeChart.series.map((series) => (
                        <span
                          key={series.key}
                          className={"report-chart-bar " + series.className}
                          style={{ height: ((chartEntry[series.key] / activeChart.max) * 100) + "%" }}
                        />
                      ))}
                    </div>
                    <span title={chartEntry.fullLabel}>{chartEntry.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <ReportSeriesChart
              data={visibleChartData}
              chart={activeChart}
              variant={chartView === "profit" ? "line" : "area"}
              ariaLabel={activeChart.ariaLabel + ", " + periodLabel}
            />
          )}
        </div>
      </section>
      <section className="report-ledger">
        <ManagementDataGrid
          rows={reportRows}
          columns={reportColumns}
          getRowId={(row) => row.shipmentId}
          onOpenRow={(row) => onOpenShipment(row.shipmentId)}
          rowsPerPage={10}
          ariaLabel="Shipment profitability ledger"
          noRowsLabel="No profitability records"
          sx={{ borderRadius: "12px" }}
        />
      </section>
    </div>
  );
}

function BillingExportPanel({ filters, onChange }) {
  const updateFilter = (key) => (event) => onChange((current) => ({ ...current, [key]: event.target.value }));
  const previewRecords = getBillingReportRecords(filters);
  return (
    <section className="billing-export-card" aria-label="Billing export report">
      <div className="billing-export-layout">
        <div className="billing-export-controls">
          <div className="billing-export-section">
            <h3>Report Period</h3>
            <div className="billing-export-grid">
              <TextInput label="From" type="date" value={filters.dateFrom} onChange={updateFilter("dateFrom")} required />
              <TextInput label="To" type="date" value={filters.dateTo} onChange={updateFilter("dateTo")} required />
            </div>
          </div>
          <div className="billing-export-section">
            <h3>Report Conditions</h3>
            <div className="billing-export-grid">
              <SelectInput label="Billing type" value={filters.billingType} onChange={updateFilter("billingType")} options={[
                { value: "all", label: "All billing types" },
                { value: "customer_ar", label: "Customer AR" },
                { value: "vendor_ap", label: "Vendor AP" },
              ]} />
            </div>
          </div>
        </div>
        <div className="billing-export-section billing-export-preview-section">
          <div className="billing-preview-heading">
            <h3>Preview</h3>
            <span>{previewRecords.length} {previewRecords.length === 1 ? "record" : "records"}</span>
          </div>
          <div className="billing-preview-table" role="region" aria-label="Billing export preview" tabIndex="0">
            <table>
              <thead><tr><th>Shipment</th><th>Type</th><th>Counterparty</th><th>Amount</th></tr></thead>
              <tbody>
                {previewRecords.length ? previewRecords.map((record) => (
                  <tr key={record.billingId}>
                    <td>{record.shipmentId}</td>
                    <td>{formatStatus(record.billingType)}</td>
                    <td>{record.counterparty}</td>
                    <td>{formatMoney(record.amount, record.currency) || "—"}</td>
                  </tr>
                )) : <tr><td className="billing-preview-empty" colSpan="4">No billing records match these conditions.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activeModule, setActiveModule] = useState("shipments-trucking");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quotationFilters, setQuotationFilters] = useState({ customer: "", transportMode: "" });
  const [draftFilters, setDraftFilters] = useState({ query: "", status: "all", customer: "", transportMode: "" });
  const [searchOpen, setSearchOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [draftSourceFiles, setDraftSourceFiles] = useState([]);
  const draftSourcePreviewUrlsRef = useRef(new Set());
  useEffect(() => () => {
    draftSourcePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    draftSourcePreviewUrlsRef.current.clear();
  }, []);
  const replaceDraftSourceFiles = (sourceFiles) => {
    draftSourcePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviewUrls = sourceFiles.map((source) => source.previewUrl).filter(Boolean);
    draftSourcePreviewUrlsRef.current = new Set(nextPreviewUrls);
    setDraftSourceFiles(sourceFiles);
  };
  const [shipmentFieldValuesById, setShipmentFieldValuesById] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedBillingGroupKeys, setExpandedBillingGroupKeys] = useState([]);
  const [quotations, setQuotations] = useState(baseQuotations);
  const [pendingDeleteQuotationId, setPendingDeleteQuotationId] = useState(null);
  const [carrierRatePlans, setCarrierRatePlans] = useState(baseCostRatePlans);
  const [pendingDeleteCarrierRateId, setPendingDeleteCarrierRateId] = useState(null);
  const [partners, setPartners] = useState(basePartners);
  const [quotationTypeTab, setQuotationTypeTab] = useState("customer");
  const [billingTypeTab, setBillingTypeTab] = useState("all");
  const [partnerDraft, setPartnerDraft] = useState(null);
  const [pendingDeletePartnerId, setPendingDeletePartnerId] = useState(null);
  const [billingReportFilters, setBillingReportFilters] = useState({
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
    billingType: "all",
  });
  const [shipmentDateRange, setShipmentDateRange] = useState({
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
  });
  const [reportChartView, setReportChartView] = useState("finance");
  const [reportChartDimension, setReportChartDimension] = useState("month");
  const [reportChartDateRange, setReportChartDateRange] = useState(getDefaultReportDateRange);
  const [reportExportAnchorEl, setReportExportAnchorEl] = useState(null);
  const [billingExportAnchorEl, setBillingExportAnchorEl] = useState(null);
  const [quotationCreateAnchorEl, setQuotationCreateAnchorEl] = useState(null);
  const [selectedRowsByModule, setSelectedRowsByModule] = useState({ shipments: [], quotations: [], billing: [] });
  const [panel, setPanel] = useState(null);
  const [returnFocusId, setReturnFocusId] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [selectedIssueId, setSelectedIssueId] = useState(demoIssues[0].issueId);
  const [committedShipmentIds, setCommittedShipmentIds] = useState([]);
  const [shipmentsPendingReview, setShipmentsPendingReview] = useState([]);
  const [rateSelectionsByShipment, setRateSelectionsByShipment] = useState({});
  const [toast, setToast] = useState(null);
  const [selectedBolShipmentId, setSelectedBolShipmentId] = useState(null);
  const [selectedBolStop, setSelectedBolStop] = useState(null);
  const [selectedBolFieldValues, setSelectedBolFieldValues] = useState(null);
  const [autoExportBol, setAutoExportBol] = useState(false);
  const [pendingDeleteShipmentId, setPendingDeleteShipmentId] = useState(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState([]);
  const [pendingBulkDeleteQuotation, setPendingBulkDeleteQuotation] = useState(null);
  const [deletedShipmentIds, setDeletedShipmentIds] = useState([]);
  const [manualAdjustmentsByShipment, setManualAdjustmentsByShipment] = useState(() => Object.fromEntries(
    Object.entries(pricingResults).map(([shipmentId, result]) => [shipmentId, {
      customer: result.initialAdjustments || [],
      vendor: result.vendorCost?.initialAdjustments || [],
    }]),
  ));
  const [pricingLineOverridesByShipment, setPricingLineOverridesByShipment] = useState({});
  const [issueState, setIssueState] = useState(() => Object.fromEntries(demoIssues.map((issue) => [issue.issueId, { status: "unresolved", resolution: null }])));

  const unresolvedBlockingIssueCount = demoIssues.filter((issue) => issue.severity === "candidate_blocker" && issueState[issue.issueId].status === "unresolved").length;
  const shipments = useMemo(() => baseShipments.filter((shipment) => !deletedShipmentIds.includes(shipment.shipmentId)).map((shipment) => {
    const pendingReview = shipmentsPendingReview.includes(shipment.shipmentId);
    const status = pendingReview ? "draft" : committedShipmentIds.includes(shipment.shipmentId) ? "confirmed" : shipment.status;
    const listStatus = shipmentListStatus(status);
    return {
      ...shipment,
      status,
      listStatus,
      bolNumber: shipment.transportMode === "TRUCKING" && isConfirmedShipmentStatus(listStatus) ? "BOL-DEMO-" + shipment.shipmentId.split("-").at(-1) : null,
      reviewIssueCount: shipment.shipmentId === fixture.fixtureId ? unresolvedBlockingIssueCount : shipment.reviewIssueCount,
    };
  }), [committedShipmentIds, shipmentsPendingReview, unresolvedBlockingIssueCount, deletedShipmentIds]);
  const isShipmentModule = isShipmentModuleKey(activeModule);
  const isPartnerModule = activeModule === "customers" || activeModule === "carriers";
  const activeTransportMode = isShipmentModule ? shipmentModeByModule[activeModule] : null;
  const activePartnerType = activeModule === "carriers" ? "carrier" : activeModule === "customers" ? "customer" : null;
  const shipmentScopeRows = useMemo(
    () => activeTransportMode ? shipments.filter((shipment) => shipment.transportMode === activeTransportMode) : shipments,
    [activeTransportMode, shipments],
  );
  const shipmentDateScopeRows = useMemo(
    () => shipmentScopeRows.filter((shipment) => shipment.createdDate
      && (!shipmentDateRange.dateFrom || shipment.createdDate >= shipmentDateRange.dateFrom)
      && (!shipmentDateRange.dateTo || shipment.createdDate <= shipmentDateRange.dateTo)),
    [shipmentDateRange, shipmentScopeRows],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (panel || !returnFocusId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(`[data-id="${returnFocusId}"] [role="gridcell"]`)?.focus();
      setReturnFocusId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [panel, returnFocusId]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (isShipmentModule) {
      return shipmentDateScopeRows.filter((row) => {
        const matchesSearch = !normalizedQuery || [row.shipmentId, row.customer, row.route].some((value) => value.toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === "all" || row.listStatus === statusFilter;
        return matchesSearch && matchesStatus;
      });
    }
    if (isPartnerModule) {
      return partners.filter((row) => {
        const matchesSearch = !normalizedQuery || [row.partnerId, row.name, row.contactName, row.email, row.mobile, row.phone].some((value) => (value || "").toLowerCase().includes(normalizedQuery));
        return matchesSearch && row.type === activePartnerType;
      });
    }
    if (activeModule === "quotations") {
      const quoteRows = quotationTypeTab === "carrier" ? carrierRatePlans : quotations;
      return quoteRows.filter((row) => {
        const searchableValues = quotationTypeTab === "carrier"
          ? [row.ratePlanId, row.name, row.counterparty, formatTransportMode(row.transportMode)]
          : [row.quoteId, row.name, row.contractId, row.billingAccountId];
        const matchesSearch = !normalizedQuery || searchableValues.some((value) => (value || "").toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        const matchesCustomer = quotationTypeTab === "carrier" || !quotationFilters.customer || row.customer === quotationFilters.customer;
        const matchesTransportMode = quotationTypeTab === "carrier" || !quotationFilters.transportMode || row.transportMode === quotationFilters.transportMode;
        return matchesSearch && matchesStatus && matchesCustomer && matchesTransportMode;
      });
    }
    if (activeModule === "billing") {
      return billingRecords.filter((row) => {
        const matchesSearch = !normalizedQuery || [row.billingId, row.accountId, row.sourceRatePlanId, row.shipmentId, row.counterparty].some((value) => (value || "").toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        const matchesBillingType = billingTypeTab === "all" || row.billingType === billingTypeTab;
        const matchesDate = row.billingDate
          && (!billingReportFilters.dateFrom || row.billingDate >= billingReportFilters.dateFrom)
          && (!billingReportFilters.dateTo || row.billingDate <= billingReportFilters.dateTo);
        return matchesSearch && matchesStatus && matchesBillingType && matchesDate;
      });
    }
    return [];
  }, [activeModule, activePartnerType, billingReportFilters, billingTypeTab, carrierRatePlans, isPartnerModule, isShipmentModule, query, quotationFilters, quotationTypeTab, shipmentDateScopeRows, partners, quotations, statusFilter]);
  const visibleBillingGroupKeys = useMemo(() => activeModule === "billing"
    ? [...new Set(visibleRows.map((row) => `${row.billingType}:${row.counterparty}`))]
    : [], [activeModule, visibleRows]);
  const allBillingGroupsExpanded = visibleBillingGroupKeys.length > 0
    && visibleBillingGroupKeys.every((key) => expandedBillingGroupKeys.includes(key));

  const selectedShipment = shipments.find((shipment) => shipment.shipmentId === panel?.id);
  const selectedShipmentCommitted = selectedShipment ? isConfirmedShipmentStatus(selectedShipment.listStatus) : false;
  const selectedBolShipment = shipments.find((shipment) => shipment.shipmentId === selectedBolShipmentId);
  const openBolPreview = (shipmentId, stop = null, fieldValues = null) => {
    setAutoExportBol(false);
    setSelectedBolShipmentId(shipmentId);
    setSelectedBolStop(stop);
    setSelectedBolFieldValues(fieldValues);
  };
  const exportBol = (shipmentId, fieldValues = null) => {
    setAutoExportBol(false);
    setSelectedBolShipmentId(shipmentId);
    setSelectedBolStop(null);
    setSelectedBolFieldValues(fieldValues);
  };
  const selectedQuote = quotations.find((quote) => quote.quoteId === panel?.id)
    || (panel?.type === "quotation" ? panel.draftRecord : null);
  const selectedCarrierRatePlan = carrierRatePlans.find((plan) => plan.ratePlanId === panel?.id)
    || (panel?.type === "carrier-rate" ? panel.draftRecord : null);
  const config = isShipmentModule ? shipmentPageConfig[activeModule] : moduleConfig[activeModule];
  const selectionModuleKey = isShipmentModule ? "shipments" : activeModule === "billing" ? `billing-${billingTypeTab}` : activeModule === "quotations" ? `quotations-${quotationTypeTab}` : activeModule;
  const selectedRowIds = selectedRowsByModule[selectionModuleKey] || [];
  const setSelectedRowIds = (ids) => setSelectedRowsByModule((current) => ({ ...current, [selectionModuleKey]: ids }));
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));
  const activePage = Math.min(currentPage, pageCount - 1);
  const pageStart = activePage * rowsPerPage;
  const pagedRows = visibleRows.slice(pageStart, pageStart + rowsPerPage);
  useEffect(() => {
    if (currentPage !== activePage) setCurrentPage(activePage);
  }, [activePage, currentPage]);
  const changeRowsPerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(0);
  };

  const changeModule = (module) => {
    setActiveModule(module);
    setCurrentPage(0);
    setQuery("");
    setStatusFilter("all");
    setQuotationFilters({ customer: "", transportMode: "" });
    setPanel(null);
    setToast(null);
    setSearchOpen(false);
    setCreateDialogOpen(false);
    setSelectedBolShipmentId(null);
    setAutoExportBol(false);
    setPendingDeleteShipmentId(null);
    setPendingBulkDeleteIds([]);
    setPendingBulkDeleteQuotation(null);
    setPendingBulkDeleteBillingIds([]);
    setPendingDeleteQuotationId(null);
    setPendingDeleteCarrierRateId(null);
    setPartnerDraft(null);
    setPendingDeletePartnerId(null);
    setReportExportAnchorEl(null);
    setQuotationCreateAnchorEl(null);
  };
  const changeQuotationType = (_, type) => {
    setQuotationTypeTab(type);
    setCurrentPage(0);
    setQuery("");
    setStatusFilter("all");
    setQuotationFilters({ customer: "", transportMode: "" });
    setSearchOpen(false);
    setPendingDeleteCarrierRateId(null);
  };
  const openShipmentById = (shipmentId, { startInEdit = false, initialDetailTab = "details" } = {}) => {
    const targetShipment = shipments.find((shipment) => shipment.shipmentId === shipmentId);
    if (targetShipment?.detailAvailable === false) {
      setToast({ message: `${formatTransportMode(targetShipment.transportMode)} details are outside this demo scope.`, tone: "info" });
      return;
    }
    const targetModule = targetShipment?.transportMode === "OCEAN"
      ? "shipments-ocean"
      : targetShipment?.transportMode === "AIR"
        ? "shipments-air"
        : "shipments-trucking";
    if (!isShipmentModule) {
      setQuery("");
      setStatusFilter("all");
    }
    setActiveModule(targetModule);
    setPanel({ type: "shipment", id: shipmentId, startInEdit, initialDetailTab });
    setToast(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const openQuoteById = (quoteId, { startInEdit = false } = {}) => {
    if (!quoteId) return;
    setActiveModule("quotations");
    setQuotationTypeTab("customer");
    setPanel({ type: "quotation", id: quoteId, startInEdit });
    setToast(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const openCarrierRateById = (ratePlanId, { startInEdit = false } = {}) => {
    if (!ratePlanId) return;
    setActiveModule("quotations");
    setQuotationTypeTab("carrier");
    setPanel({ type: "carrier-rate", id: ratePlanId, startInEdit });
    setToast(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const openCreateQuotation = (type) => {
    setQuotationCreateAnchorEl(null);
    setQuotationTypeTab(type);
    const createdAt = new Date().toISOString();
    if (type === "carrier") {
      const ratePlanId = nextDemoIdentifier(carrierRatePlans, "ratePlanId", "COST-DEMO-");
      setPanel({
        type: "carrier-rate",
        id: ratePlanId,
        startInEdit: true,
        isCreating: true,
        draftRecord: {
          ratePlanId,
          name: "",
          counterparty: "",
          serviceType: "",
          serviceScope: "",
          transportMode: "TRUCKING",
          status: "draft",
          effectiveFrom: "",
          effectiveTo: "",
          createdAt,
          lastUpdated: createdAt,
          version: 0,
          currency: "USD",
          chargeLines: [],
          versionHistory: [],
        },
      });
    } else {
      const quoteId = nextDemoIdentifier(quotations, "quoteId", "RATE-DEMO-");
      setPanel({
        type: "quotation",
        id: quoteId,
        startInEdit: true,
        isCreating: true,
        draftRecord: {
          quoteId,
          contractId: nextDemoIdentifier(quotations, "contractId", "CTR-DEMO-"),
          billingAccountId: nextDemoIdentifier(quotations, "billingAccountId", "BILL-ACCT-"),
          customer: "",
          name: "",
          transportMode: "TRUCKING",
          status: "draft",
          currency: "USD",
          serviceScope: "",
          serviceScopes: [],
          effectiveFrom: "",
          effectiveTo: "",
          createdAt,
          lastUpdated: createdAt,
          version: 0,
          shipmentIds: [],
          rateMatrix: [],
          surchargeRules: [],
          serviceItems: [],
          versionHistory: [],
        },
      });
    }
    setToast(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const duplicateQuotationRecords = (type, ids) => {
    const sourceRecords = type === "carrier"
      ? ids.map((id) => carrierRatePlans.find((plan) => plan.ratePlanId === id)).filter(Boolean)
      : ids.map((id) => quotations.find((quote) => quote.quoteId === id)).filter(Boolean);
    if (!sourceRecords.length) return;
    const createdAt = new Date().toISOString();
    const copies = sourceRecords.reduce((result, source) => {
      if (type === "carrier") {
        const ratePlanId = nextDemoIdentifier([...carrierRatePlans, ...result], "ratePlanId", "COST-DEMO-");
        result.push({
          ...JSON.parse(JSON.stringify(source)),
          ratePlanId,
          name: `${source.name} Copy`,
          status: "draft",
          createdAt,
          lastUpdated: createdAt,
          version: 1,
          versionHistory: [{
            historyId: `${ratePlanId}-V1`,
            version: 1,
            event: "Created",
            role: "Demo user",
            changedAt: createdAt,
            summary: `Duplicated from ${source.ratePlanId}.`,
          }],
        });
      } else {
        const workingRecords = [...quotations, ...result];
        const quoteId = nextDemoIdentifier(workingRecords, "quoteId", "RATE-DEMO-");
        result.push({
          ...JSON.parse(JSON.stringify(source)),
          quoteId,
          contractId: nextDemoIdentifier(workingRecords, "contractId", "CTR-DEMO-"),
          billingAccountId: nextDemoIdentifier(workingRecords, "billingAccountId", "BILL-ACCT-"),
          name: `${source.name} Copy`,
          status: "draft",
          createdAt,
          lastUpdated: createdAt,
          version: 1,
          shipmentIds: [],
          versionHistory: [{
            historyId: `${quoteId}-V1`,
            version: 1,
            event: "Created",
            role: "Demo user",
            changedAt: createdAt,
            summary: `Duplicated from ${source.quoteId}.`,
          }],
        });
      }
      return result;
    }, []);
    if (type === "carrier") setCarrierRatePlans((current) => [...copies, ...current]);
    else setQuotations((current) => [...copies, ...current]);
    setSelectedRowsByModule((current) => ({ ...current, [`quotations-${type}`]: [] }));
    setStatusFilter("all");
    setToast({ message: `${copies.length} ${type === "carrier" ? copies.length === 1 ? "carrier rate" : "carrier rates" : copies.length === 1 ? "customer quote" : "customer quotes"} duplicated as draft.`, tone: "success" });
  };
  const confirmDeleteShipment = () => {
    if (!pendingDeleteShipmentId) return;
    const deletedId = pendingDeleteShipmentId;
    setDeletedShipmentIds((current) => current.includes(deletedId) ? current : [...current, deletedId]);
    setSelectedRowsByModule((current) => ({ ...current, shipments: (current.shipments || []).filter((id) => id !== deletedId) }));
    setPanel((current) => current?.type === "shipment" && current.id === deletedId ? null : current);
    setReturnFocusId(null);
    setPendingDeleteShipmentId(null);
    setToast({ message: deletedId + " deleted from this demo session.", tone: "success" });
  };
  const confirmBulkDeleteShipments = () => {
    if (!pendingBulkDeleteIds.length) return;
    const deletedCount = pendingBulkDeleteIds.length;
    setDeletedShipmentIds((current) => [...new Set([...current, ...pendingBulkDeleteIds])]);
    setSelectedRowsByModule((current) => ({ ...current, shipments: [] }));
    setPendingBulkDeleteIds([]);
    setToast({ message: deletedCount + " shipments deleted from this demo session.", tone: "success" });
  };
  const confirmBulkDeleteQuotations = () => {
    if (!pendingBulkDeleteQuotation?.ids.length) return;
    const { type, ids } = pendingBulkDeleteQuotation;
    const deletedIds = new Set(ids);
    if (type === "carrier") {
      setCarrierRatePlans((current) => current.filter((plan) => !deletedIds.has(plan.ratePlanId)));
    } else {
      setQuotations((current) => current.filter((quote) => !deletedIds.has(quote.quoteId)));
    }
    setSelectedRowsByModule((current) => Object.fromEntries(Object.entries(current).map(([key, selectedIds]) => [key, Array.isArray(selectedIds) ? selectedIds.filter((id) => !deletedIds.has(id)) : selectedIds])));
    setPendingBulkDeleteQuotation(null);
    setToast({ message: `${ids.length} ${type === "carrier" ? "carrier rates" : "customer quotes"} deleted from this demo session.`, tone: "success" });
  };
  const openCreatePartner = () => {
    setPartnerDraft({ ...emptyPartnerDraft, type: activePartnerType || "customer" });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const openEditPartner = (partner) => {
    setPartnerDraft({ ...partner });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };
  const savePartner = () => {
    if (!partnerDraft?.name.trim()) return;
    const normalized = { ...partnerDraft, name: partnerDraft.name.trim() };
    const collectionLabel = normalized.type === "carrier" ? "Carriers" : "Customers";
    if (normalized.partnerId) {
      setPartners((current) => current.map((partner) => partner.partnerId === normalized.partnerId ? normalized : partner));
      setToast({ message: normalized.name + " updated in " + collectionLabel + ".", tone: "success" });
    } else {
      const prefix = normalized.type === "customer" ? "CUS-DEMO-" : "CAR-DEMO-";
      const nextNumber = Math.max(0, ...partners.filter((partner) => partner.type === normalized.type).map((partner) => Number(partner.partnerId.split("-").at(-1)) || 0)) + 1;
      const created = { ...normalized, partnerId: prefix + String(nextNumber).padStart(3, "0") };
      setPartners((current) => [created, ...current]);
      setToast({ message: created.name + " created in " + collectionLabel + ".", tone: "success" });
    }
    setPartnerDraft(null);
  };
  const confirmDeletePartner = () => {
    const partner = partners.find((item) => item.partnerId === pendingDeletePartnerId);
    if (!partner) return;
    setPartners((current) => current.filter((item) => item.partnerId !== partner.partnerId));
    setPendingDeletePartnerId(null);
    setToast({ message: partner.name + " deleted from " + (partner.type === "carrier" ? "Carriers" : "Customers") + ".", tone: "success" });
  };
  const resolveIssue = (issueId, resolution) => {
    setIssueState((current) => ({ ...current, [issueId]: { status: "resolved", ...resolution } }));
    setSelectedIssueId(issueId);
    setToast({ message: "Review decision saved for this demo session.", tone: "success" });
  };
  const addManualAdjustment = (shipmentId, pricingSide, adjustment) => {
    setManualAdjustmentsByShipment((current) => ({
      ...current,
      [shipmentId]: {
        ...(current[shipmentId] || { customer: [], vendor: [] }),
        [pricingSide]: [...(current[shipmentId]?.[pricingSide] || []), adjustment],
      },
    }));
    setToast({ message: `${adjustment.description} added to the ${pricingSide} ledger.`, tone: "success" });
  };
  const updateManualAdjustment = (shipmentId, pricingSide, adjustmentId, patch) => {
    setManualAdjustmentsByShipment((current) => ({
      ...current,
      [shipmentId]: {
        ...(current[shipmentId] || { customer: [], vendor: [] }),
        [pricingSide]: (current[shipmentId]?.[pricingSide] || []).map((adjustment) => adjustment.adjustmentId === adjustmentId
          ? { ...adjustment, ...patch }
          : adjustment),
      },
    }));
  };
  const removeManualAdjustment = (shipmentId, pricingSide, adjustmentId) => {
    setManualAdjustmentsByShipment((current) => ({
      ...current,
      [shipmentId]: {
        ...(current[shipmentId] || { customer: [], vendor: [] }),
        [pricingSide]: (current[shipmentId]?.[pricingSide] || []).filter((adjustment) => adjustment.adjustmentId !== adjustmentId),
      },
    }));
    setToast({ message: "Manual adjustment removed.", tone: "neutral" });
  };
  const updatePricingLineOverride = (shipmentId, pricingSide, lineKey, patch) => {
    setPricingLineOverridesByShipment((current) => ({
      ...current,
      [shipmentId]: {
        ...(current[shipmentId] || { customer: {}, vendor: {} }),
        [pricingSide]: {
          ...(current[shipmentId]?.[pricingSide] || {}),
          [lineKey]: {
            ...(current[shipmentId]?.[pricingSide]?.[lineKey] || {}),
            ...patch,
          },
        },
      },
    }));
  };
  const saveQuotation = (updatedQuote, message = "Quote plan updated.", previousQuoteId = updatedQuote.quoteId) => {
    const isNew = !quotations.some((quote) => quote.quoteId === previousQuoteId);
    setQuotations((current) => current.some((quote) => quote.quoteId === previousQuoteId)
      ? current.map((quote) => quote.quoteId === previousQuoteId ? updatedQuote : quote)
      : [updatedQuote, ...current]);
    setPanel((current) => current?.type === "quotation" && current.id === previousQuoteId
      ? { type: "quotation", id: updatedQuote.quoteId, startInEdit: false }
      : current);
    setToast({ message: isNew && message === "Quote plan updated." ? "Customer quote created." : message, tone: "success" });
  };
  const confirmDeleteQuotation = () => {
    if (!pendingDeleteQuotationId) return;
    const deletedQuote = quotations.find((quote) => quote.quoteId === pendingDeleteQuotationId);
    setQuotations((current) => current.filter((quote) => quote.quoteId !== pendingDeleteQuotationId));
    setSelectedRowsByModule((current) => Object.fromEntries(Object.entries(current).map(([key, ids]) => [key, Array.isArray(ids) ? ids.filter((id) => id !== pendingDeleteQuotationId) : ids])));
    setPanel((current) => current?.type === "quotation" && current.id === pendingDeleteQuotationId ? null : current);
    setPendingDeleteQuotationId(null);
    setToast({ message: `${deletedQuote?.name || "Quotation"} deleted from this demo session.`, tone: "success" });
  };
  const saveCarrierRatePlan = (updatedPlan, message = "Carrier rate updated.") => {
    const isNew = !carrierRatePlans.some((plan) => plan.ratePlanId === updatedPlan.ratePlanId);
    setCarrierRatePlans((current) => current.some((plan) => plan.ratePlanId === updatedPlan.ratePlanId)
      ? current.map((plan) => plan.ratePlanId === updatedPlan.ratePlanId ? updatedPlan : plan)
      : [updatedPlan, ...current]);
    setPanel((current) => current?.type === "carrier-rate" && current.id === updatedPlan.ratePlanId
      ? { type: "carrier-rate", id: updatedPlan.ratePlanId, startInEdit: false }
      : current);
    setToast({ message: isNew && message === "Carrier rate updated." ? "Carrier rate created." : message, tone: "success" });
  };
  const confirmDeleteCarrierRate = () => {
    if (!pendingDeleteCarrierRateId) return;
    const deletedPlan = carrierRatePlans.find((plan) => plan.ratePlanId === pendingDeleteCarrierRateId);
    setCarrierRatePlans((current) => current.filter((plan) => plan.ratePlanId !== pendingDeleteCarrierRateId));
    setSelectedRowsByModule((current) => Object.fromEntries(Object.entries(current).map(([key, ids]) => [key, Array.isArray(ids) ? ids.filter((id) => id !== pendingDeleteCarrierRateId) : ids])));
    setPanel((current) => current?.type === "carrier-rate" && current.id === pendingDeleteCarrierRateId ? null : current);
    setPendingDeleteCarrierRateId(null);
    setToast({ message: `${deletedPlan?.name || "Carrier rate"} deleted from this demo session.`, tone: "success" });
  };
  const attemptSubmit = () => {
    const blockerCount = selectedShipment?.shipmentId === fixture.fixtureId
      ? demoIssues.filter((issue) => issue.severity === "candidate_blocker" && issueState[issue.issueId].status === "unresolved").length
      : 0;
    if (!selectedShipment || selectedShipmentCommitted) {
      setToast({ message: "Shipment is already confirmed in this demo session.", tone: "info" });
      return false;
    }
    if (blockerCount) {
      setReviewFilter("blocking");
      document.querySelector(".field-control-empty")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setToast({ message: "Confirmation blocked by " + blockerCount + " candidate " + (blockerCount === 1 ? "issue" : "issues") + ". Resolve or defer them first.", tone: "critical" });
      return false;
    }
    setCommittedShipmentIds((current) => current.includes(selectedShipment.shipmentId) ? current : [...current, selectedShipment.shipmentId]);
    setShipmentsPendingReview((current) => current.filter((shipmentId) => shipmentId !== selectedShipment.shipmentId));
    setToast({ message: "Shipment confirmed. Charge & Cost was refreshed and the BOL is ready to export.", tone: "success" });
    return true;
  };
  const changeShipmentStatus = (nextStatus) => {
    if (!selectedShipment || nextStatus === selectedShipment.listStatus) return;
    if (nextStatus === "confirmed") {
      setCommittedShipmentIds((current) => current.includes(selectedShipment.shipmentId) ? current : [...current, selectedShipment.shipmentId]);
      setShipmentsPendingReview((current) => current.filter((shipmentId) => shipmentId !== selectedShipment.shipmentId));
    } else {
      setCommittedShipmentIds((current) => current.filter((shipmentId) => shipmentId !== selectedShipment.shipmentId));
      setShipmentsPendingReview((current) => current.includes(selectedShipment.shipmentId) ? current : [...current, selectedShipment.shipmentId]);
    }
    setToast({ message: `Shipment status changed to ${formatStatus(nextStatus)}.`, tone: "success" });
  };
  const exportBillingCsv = () => {
    setBillingExportAnchorEl(null);
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headers = ["Shipment", "Transport Mode", "Billing Account", "Source Rate Version", "Counterparty", "Type", "Amount", "Currency", "Due Date"];
    const reportRecords = getBillingReportRecords({ ...billingReportFilters, billingType: billingTypeTab });
    const rows = reportRecords.map((record) => [
      record.shipmentId,
      formatTransportMode(record.transportMode),
      record.accountId,
      record.sourceRatePlanId,
      record.counterparty,
      formatStatus(record.billingType),
      record.amount,
      record.currency,
      formatDate(record.dueDate),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "best-usa-billing-" + billingReportFilters.dateFrom + "-to-" + billingReportFilters.dateTo + ".csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: "CSV billing report exported.", tone: "success" });
  };
  const exportBillingGroupCsv = (group) => {
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headers = ["Shipment", "Transport Mode", "Record No.", "Billing Date", "Counterparty", "Type", "Amount", "Currency"];
    const rows = group.rows.map((record) => [
      record.shipmentId,
      formatTransportMode(record.transportMode),
      record.billingId,
      formatDate(record.billingDate),
      group.counterparty,
      group.billingType === "customer_ar" ? "AR" : "AP",
      record.amount,
      record.currency,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    const partySlug = group.counterparty.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.href = url;
    link.download = `best-usa-billing-${partySlug || "party"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: `${group.counterparty} billing records exported.`, tone: "success" });
  };
  const exportBillingGroupPdf = (group) => {
    const escapeHtml = (value) => String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const accountingSide = group.billingType === "customer_ar" ? "AR" : "AP";
    const rows = group.rows.map((record) => `
      <tr>
        <td>${escapeHtml(record.shipmentId)}</td>
        <td>${escapeHtml(formatTransportMode(record.transportMode))}</td>
        <td>${escapeHtml(record.billingId)}</td>
        <td>${escapeHtml(formatDate(record.billingDate))}</td>
        <td class="amount">${escapeHtml(formatMoney(record.amount, record.currency) || "—")}</td>
      </tr>`).join("");
    const printWindow = window.open("", "_blank", "width=1024,height=720");
    if (!printWindow) {
      setToast({ message: "Allow pop-ups to open the PDF preview.", tone: "warning" });
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(group.counterparty)} Billing</title><style>
      body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:32px;color:#17242e}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 24px;color:#63717c}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 12px;border-bottom:1px solid #e5e9ec;text-align:left}th{background:#f5f7f9;color:#63717c}.amount{text-align:right}@media print{body{padding:0}}
    </style></head><body><h1>${escapeHtml(group.counterparty)}</h1><p>${accountingSide} · ${group.rows.length} ${group.rows.length === 1 ? "shipment" : "shipments"}</p><table><thead><tr><th>Shipment</th><th>Transport mode</th><th>Record No.</th><th>Billing date</th><th class="amount">Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    window.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 150);
    setToast({ message: `${group.counterparty} PDF preview opened.`, tone: "success" });
  };
  const exportBillingPdf = () => {
    setBillingExportAnchorEl(null);
    const reportRecords = getBillingReportRecords({ ...billingReportFilters, billingType: billingTypeTab });
    const escapeHtml = (value) => String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const rows = reportRecords.map((record) => `
      <tr>
        <td>${escapeHtml(record.shipmentId)}</td>
        <td>${escapeHtml(formatTransportMode(record.transportMode))}</td>
        <td>${escapeHtml(formatStatus(record.billingType))}</td>
        <td>${escapeHtml(record.counterparty)}</td>
        <td class="amount">${escapeHtml(formatMoney(record.amount, record.currency) || "—")}</td>
      </tr>`).join("");
    const printWindow = window.open("", "_blank", "width=1024,height=720");
    if (!printWindow) {
      setToast({ message: "Allow pop-ups to open the PDF preview.", tone: "warning" });
      return;
    }
    printWindow.opener = null;
    printWindow.document.write(`<!doctype html><html><head><title>BEST USA Billing Report</title><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#17242e}h1{font-size:22px;margin:0 0 6px}p{margin:0 0 24px;color:#63717c;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border:1px solid #dfe4e8;text-align:left}th{background:#f5f7f9;color:#63717c}.amount{text-align:right}@media print{body{margin:20mm}}
    </style></head><body><h1>BEST USA Billing Report</h1><p>${escapeHtml(formatDate(billingReportFilters.dateFrom))} – ${escapeHtml(formatDate(billingReportFilters.dateTo))} · ${reportRecords.length} records</p><table><thead><tr><th>Shipment</th><th>Transport mode</th><th>Type</th><th>Counterparty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    window.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 150);
    setToast({ message: "PDF preview opened. Choose Save as PDF in the print dialog.", tone: "success" });
  };
  const exportReportCsv = () => {
    setReportExportAnchorEl(null);
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const { activeChart, visibleChartData, periodLabel, dimensionLabel } = getReportChartModel(reportChartView, reportChartDimension, reportChartDateRange);
    const seriesHeaders = activeChart.series.map((series) => reportChartView === "volume" ? series.label : `${series.label} (USD thousands)`);
    const rows = visibleChartData.map((entry) => [entry.fullLabel, ...activeChart.series.map((series) => entry[series.key])]);
    const csv = [
      ["Report", activeChart.title],
      ["Date Range", periodLabel],
      ["Dimension", dimensionLabel],
      [],
      ["Group", ...seriesHeaders],
      ...rows,
    ].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `best-usa-${reportChartView}-by-${reportChartDimension}-${reportChartDateRange.dateFrom}-to-${reportChartDateRange.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: "Current report view exported as CSV.", tone: "success" });
  };
  const exportReportPdf = () => {
    setReportExportAnchorEl(null);
    const { activeChart, visibleChartData, periodLabel, dimensionLabel } = getReportChartModel(reportChartView, reportChartDimension, reportChartDateRange);
    const escapeHtml = (value) => String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const headers = activeChart.series.map((series) => `<th>${escapeHtml(series.label)}</th>`).join("");
    const rows = visibleChartData.map((entry) => `<tr><td>${escapeHtml(entry.fullLabel)}</td>${activeChart.series.map((series) => `<td class="amount">${escapeHtml(activeChart.unitPrefix + entry[series.key] + activeChart.unitSuffix)}</td>`).join("")}</tr>`).join("");
    const printWindow = window.open("", "_blank", "width=1024,height=720");
    if (!printWindow) {
      setToast({ message: "Allow pop-ups to open the PDF preview.", tone: "warning" });
      return;
    }
    printWindow.opener = null;
    printWindow.document.write(`<!doctype html><html><head><title>BEST USA ${escapeHtml(activeChart.title)}</title><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#17242e}h1{font-size:22px;margin:0 0 6px}p{margin:0 0 24px;color:#63717c;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border:1px solid #dfe4e8;text-align:left}th{background:#f5f7f9;color:#63717c}.amount{text-align:right}@media print{body{margin:20mm}}
    </style></head><body><h1>${escapeHtml(activeChart.title)}</h1><p>${escapeHtml(periodLabel)} · Grouped by ${escapeHtml(dimensionLabel)}</p><table><thead><tr><th>Group</th>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    window.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 150);
    setToast({ message: "PDF preview opened. Choose Save as PDF in the print dialog.", tone: "success" });
  };

  const quotationCustomerOptions = useMemo(
    () => [...new Set(quotations.map((quotation) => quotation.customer).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [quotations],
  );

  const filterOptions = useMemo(() => {
    const definitions = isShipmentModule
      ? [
        { value: "all", label: "All", icon: LayoutList, tone: "primary" },
        { value: "draft", label: "Draft", icon: FileText, tone: "warning" },
        { value: "confirmed", label: "Confirmed", icon: CheckCircle2, tone: "success" },
      ]
      : isPartnerModule
        ? [{ value: "all", label: "All" }]
        : activeModule === "quotations"
          ? quotationTypeTab === "carrier"
            ? [{ value: "all", label: "All" }, { value: "accepted", label: "Accepted" }, { value: "draft", label: "Draft" }, { value: "expired", label: "Expired" }]
            : [{ value: "all", label: "All" }, { value: "accepted", label: "Accepted" }, { value: "draft", label: "Draft" }, { value: "expired", label: "Expired" }]
          : [{ value: "all", label: "All" }];
    const records = isShipmentModule
      ? shipmentDateScopeRows
      : isPartnerModule
        ? partners.filter((partner) => partner.type === activePartnerType)
        : activeModule === "quotations"
          ? quotationTypeTab === "carrier" ? carrierRatePlans : quotations
          : billingRecords;
    return definitions.map((option) => ({
      ...option,
      count: option.value === "all"
        ? records.length
        : records.filter((record) => isShipmentModule ? record.listStatus === option.value : record.status === option.value).length,
    }));
  }, [activeModule, activePartnerType, carrierRatePlans, isPartnerModule, isShipmentModule, quotationTypeTab, shipmentDateScopeRows, partners, quotations]);

  useEffect(() => {
    if (!filterOptions.some((option) => option.value === statusFilter)) setStatusFilter("all");
  }, [filterOptions, statusFilter]);

  const closeDetail = () => {
    const focusId = panel?.id;
    if (focusId) setReturnFocusId(focusId);
    setPanel(null);
  };
  const openSearchSheet = () => {
    setDraftFilters({ query, status: statusFilter, ...quotationFilters });
    setSearchOpen(true);
  };
  const appliedFilters = [
    query ? { key: "query", label: `Keyword: ${query}` } : null,
    activeModule === "quotations" && quotationTypeTab === "customer" && quotationFilters.customer
      ? { key: "customer", label: `Customer: ${quotationFilters.customer}` }
      : null,
    activeModule === "quotations" && quotationTypeTab === "customer" && quotationFilters.transportMode
      ? { key: "transportMode", label: `Transport mode: ${formatTransportMode(quotationFilters.transportMode)}` }
      : null,
    !isPartnerModule && statusFilter !== "all" ? { key: "status", label: "Status: " + (filterOptions.find((option) => option.value === statusFilter)?.label || formatStatus(statusFilter)) } : null,
  ].filter(Boolean);
  const removeAppliedFilter = (key) => {
    if (key === "query") setQuery("");
    else if (key === "status") setStatusFilter("all");
    else setQuotationFilters((current) => ({ ...current, [key]: "" }));
    setCurrentPage(0);
  };
  const billingExportDisabled = !billingReportFilters.dateFrom
    || !billingReportFilters.dateTo
    || getBillingReportRecords({ ...billingReportFilters, billingType: billingTypeTab }).length === 0;
  const canCreateShipment = isShipmentModule;
  const openCreateShipment = () => {
    if (activeModule === "shipments-trucking") {
      setCreateDialogOpen(true);
      return;
    }
    setToast({ message: `${config.title} creation is not included in this demo yet.`, tone: "info" });
  };
  const shipmentEmptyLabel = activeModule === "shipments-ocean"
    ? "Ocean operations are outside this Trucking-first demo. This entry preserves the future module boundary."
    : activeModule === "shipments-air"
      ? "Air operations are outside this Trucking-first demo. This entry preserves the future module boundary."
      : "No matching shipments";
  const shipmentEmptyStateVisual = activeModule === "shipments-ocean"
    ? "ocean"
    : activeModule === "shipments-air"
      ? "air"
      : "search";
  const shipmentEmptyStateHint = activeModule === "shipments-ocean"
    ? "No Ocean shipments are available in this demo yet."
    : activeModule === "shipments-air"
      ? "No Air shipments are available in this demo yet."
      : undefined;

  return (
    <AppShell
      modules={visibleModuleConfig}
      activeModule={activeModule}
      onModuleChange={changeModule}
    >
      {partnerDraft ? (
        <PartnerFormPage draft={partnerDraft} onChange={setPartnerDraft} onClose={() => setPartnerDraft(null)} onSave={savePartner} />
      ) : panel?.type === "shipment" && selectedShipment ? (
        <ShipmentPanel
          key={selectedShipment.shipmentId}
          shipment={selectedShipment}
          partners={partners}
          quotePlans={quotations}
          carrierRatePlans={carrierRatePlans}
          committed={selectedShipmentCommitted}
          issueState={issueState}
          selectedIssueId={selectedIssueId}
          setSelectedIssueId={setSelectedIssueId}
          resolveIssue={resolveIssue}
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          onClose={closeDetail}
          onDelete={setPendingDeleteShipmentId}
          onCommit={attemptSubmit}
          onStatusChange={changeShipmentStatus}
          onSaveDraft={(fieldValues) => {
            setShipmentFieldValuesById((current) => ({ ...current, [selectedShipment.shipmentId]: fieldValues }));
            if (selectedShipmentCommitted) {
              setCommittedShipmentIds((current) => current.filter((shipmentId) => shipmentId !== selectedShipment.shipmentId));
              setShipmentsPendingReview((current) => current.includes(selectedShipment.shipmentId) ? current : [...current, selectedShipment.shipmentId]);
              setToast({ message: "Changes saved. Submit the shipment for review again.", tone: "info" });
            } else {
              setToast({ message: "Draft saved for this demo session.", tone: "success" });
            }
          }}
          onSaveRateSelection={(selection) => {
            setRateSelectionsByShipment((current) => ({ ...current, [selectedShipment.shipmentId]: selection }));
          }}
          initialEditing={Boolean(panel.startInEdit)}
          initialDetailTab={panel.initialDetailTab || "details"}
          initialFieldValues={shipmentFieldValuesById[selectedShipment.shipmentId]}
          initialRateSelection={rateSelectionsByShipment[selectedShipment.shipmentId]}
          onRestoreIssueState={setIssueState}
          onOpenQuote={openQuoteById}
          onOpenCarrierRate={openCarrierRateById}
          onOpenBol={openBolPreview}
          onExportBol={exportBol}
          manualAdjustments={manualAdjustmentsByShipment[selectedShipment.shipmentId] || { customer: [], vendor: [] }}
          pricingLineOverrides={pricingLineOverridesByShipment[selectedShipment.shipmentId] || { customer: {}, vendor: {} }}
          onUpdatePricingLine={(pricingSide, lineKey, patch) => updatePricingLineOverride(selectedShipment.shipmentId, pricingSide, lineKey, patch)}
          onRestorePricingLineOverrides={(overrides) => {
            setPricingLineOverridesByShipment((current) => ({ ...current, [selectedShipment.shipmentId]: overrides }));
          }}
          onAddAdjustment={(pricingSide, adjustment) => addManualAdjustment(selectedShipment.shipmentId, pricingSide, adjustment)}
          onUpdateAdjustment={(pricingSide, adjustmentId, patch) => updateManualAdjustment(selectedShipment.shipmentId, pricingSide, adjustmentId, patch)}
          onRemoveAdjustment={(pricingSide, adjustmentId) => removeManualAdjustment(selectedShipment.shipmentId, pricingSide, adjustmentId)}
          onRestoreAdjustments={(adjustments) => {
            setManualAdjustmentsByShipment((current) => ({ ...current, [selectedShipment.shipmentId]: adjustments }));
            setToast({ message: "Unsaved billing adjustments discarded.", tone: "neutral" });
          }}
          initialSourceFiles={selectedShipment.shipmentId === fixture.fixtureId ? draftSourceFiles : EMPTY_SOURCE_FILES}
        />
      ) : panel?.type === "quotation" && selectedQuote ? (
        <QuotationPanel quote={selectedQuote} onSave={saveQuotation} onClose={closeDetail} onDelete={setPendingDeleteQuotationId} initialEditing={Boolean(panel.startInEdit)} isCreating={Boolean(panel.isCreating)} />
      ) : panel?.type === "carrier-rate" && selectedCarrierRatePlan ? (
        <CarrierRatePlanPanel plan={selectedCarrierRatePlan} partners={partners} onSave={saveCarrierRatePlan} onClose={closeDetail} initialEditing={Boolean(panel.startInEdit)} isCreating={Boolean(panel.isCreating)} />
      ) : (
        <>
          <PageHeader
            title={config.title}
            titleAction={isShipmentModule || activeModule === "billing" ? (
              <ReportDateRangeFilter
                className="header-date-range-field"
                label={isShipmentModule ? "Created date" : "Billing period"}
                ariaLabel={isShipmentModule ? "Shipment created date range" : "Billing period range"}
                dateRange={isShipmentModule
                  ? shipmentDateRange
                  : { dateFrom: billingReportFilters.dateFrom, dateTo: billingReportFilters.dateTo }}
                onDateRangeChange={(range) => {
                  if (isShipmentModule) setShipmentDateRange(range);
                  else setBillingReportFilters((current) => ({ ...current, ...range }));
                  setCurrentPage(0);
                }}
                minDate="2026-01-01"
                maxDate="2026-12-31"
                showLabel={false}
              />
            ) : null}
            primaryAction={canCreateShipment || isPartnerModule || activeModule === "quotations" || activeModule === "billing" || activeModule === "reports" ? <>
              {canCreateShipment
              ? <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreateShipment}>Create</Button>
              : isPartnerModule
                ? <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreatePartner}>Create</Button>
                : activeModule === "quotations"
                  ? <>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={17} />}
                      endIcon={<ChevronDown size={16} />}
                      aria-controls={quotationCreateAnchorEl ? "quotation-create-menu" : undefined}
                      aria-haspopup="menu"
                      aria-expanded={Boolean(quotationCreateAnchorEl)}
                      onClick={(event) => setQuotationCreateAnchorEl(event.currentTarget)}
                    >
                      Create
                    </Button>
                    <Menu
                      id="quotation-create-menu"
                      anchorEl={quotationCreateAnchorEl}
                      open={Boolean(quotationCreateAnchorEl)}
                      onClose={() => setQuotationCreateAnchorEl(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                      slotProps={{ paper: { sx: { minWidth: 184, mt: .5 } }, list: { "aria-label": "Create quotation" } }}
                    >
                      <MenuItem onClick={() => openCreateQuotation("customer")}>Customer Quote</MenuItem>
                      <MenuItem onClick={() => openCreateQuotation("carrier")}>Carrier Rate</MenuItem>
                    </Menu>
                  </>
                : activeModule === "billing"
                  ? <div className="billing-export-header-actions">
                    <Button
                      className="report-export-trigger"
                      variant="contained"
                      startIcon={<Download size={17} />}
                      endIcon={<ChevronDown size={16} />}
                      disabled={billingExportDisabled}
                      aria-controls={billingExportAnchorEl ? "billing-export-menu" : undefined}
                      aria-haspopup="menu"
                      aria-expanded={Boolean(billingExportAnchorEl)}
                      onClick={(event) => setBillingExportAnchorEl(event.currentTarget)}
                    >
                      Export
                    </Button>
                    <Menu
                      id="billing-export-menu"
                      anchorEl={billingExportAnchorEl}
                      open={Boolean(billingExportAnchorEl)}
                      onClose={() => setBillingExportAnchorEl(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                      slotProps={{ paper: { className: "report-export-menu" }, list: { "aria-label": "Export billing report" } }}
                    >
                      <MenuItem className="report-export-menu-item" onClick={exportBillingCsv}>Export CSV</MenuItem>
                      <MenuItem className="report-export-menu-item" onClick={exportBillingPdf}>Export PDF</MenuItem>
                    </Menu>
                  </div>
                : activeModule === "reports"
                  ? <>
                    <Button
                      className="report-export-trigger"
                      variant="contained"
                      startIcon={<Download size={17} />}
                      endIcon={<ChevronDown size={16} />}
                      aria-controls={reportExportAnchorEl ? "report-export-menu" : undefined}
                      aria-haspopup="menu"
                      aria-expanded={Boolean(reportExportAnchorEl)}
                      onClick={(event) => setReportExportAnchorEl(event.currentTarget)}
                    >
                      Export
                    </Button>
                    <Menu
                      id="report-export-menu"
                      anchorEl={reportExportAnchorEl}
                      open={Boolean(reportExportAnchorEl)}
                      onClose={() => setReportExportAnchorEl(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                      slotProps={{ paper: { className: "report-export-menu" }, list: { "aria-label": "Export report" } }}
                    >
                      <MenuItem className="report-export-menu-item" onClick={exportReportCsv}>
                        <span>Export CSV</span>
                      </MenuItem>
                      <MenuItem className="report-export-menu-item" onClick={exportReportPdf}>
                        <span>Export PDF</span>
                      </MenuItem>
                    </Menu>
                  </>
                : null}
            </> : null}
          />
          <section className="content-area">
        {activeModule !== "reports" ? (
              <>
                {activeModule === "quotations" || activeModule === "billing" ? (
                  <div className="list-workspace-tabs-bar">
                    {activeModule === "quotations" ? (
                      <Tabs className="list-workspace-tabs" value={quotationTypeTab} onChange={changeQuotationType} aria-label="Quotation type">
                        <Tab value="customer" label="Customer Quotes" />
                        <Tab value="carrier" label="Carrier Rates" />
                      </Tabs>
                    ) : (
                      <Tabs className="list-workspace-tabs" value={billingTypeTab} onChange={(_, value) => { setBillingTypeTab(value); setCurrentPage(0); }} aria-label="Billing type">
                        <Tab value="all" label="All" />
                        <Tab value="customer_ar" label="Bill-to (AR)" />
                        <Tab value="vendor_ap" label="Pay-to (AP)" />
                      </Tabs>
                    )}
                  </div>
                ) : null}
                <section className={activeModule === "billing" ? "billing-list-workspace" : "management-table-card"}>
                  {activeModule !== "billing" && selectedRowIds.length ? (
                    <BulkActionBar count={selectedRowIds.length} onClear={() => setSelectedRowIds([])}>
                      {activeModule === "quotations" ? (
                        <Button variant="outlined" startIcon={<Copy size={17} />} onClick={() => duplicateQuotationRecords(quotationTypeTab, selectedRowIds)}>
                          Duplicate
                        </Button>
                      ) : null}
                      {isShipmentModule || activeModule === "quotations" ? (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Trash2 size={17} />}
                          onClick={() => {
                            if (isShipmentModule) setPendingBulkDeleteIds(selectedRowIds);
                            else setPendingBulkDeleteQuotation({ type: quotationTypeTab, ids: selectedRowIds });
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </BulkActionBar>
                  ) : <TableToolbar
                    searchOnly={activeModule === "billing"}
                    title={activeModule === "billing" ? "Parties" : null}
                    leadingActions={activeModule === "billing" ? (
                      <Tooltip title={allBillingGroupsExpanded ? "Collapse all" : "Expand all"} placement="top">
                        <span className="billing-expansion-toggle">
                          <IconButton
                            aria-label={allBillingGroupsExpanded ? "Collapse all" : "Expand all"}
                            aria-pressed={allBillingGroupsExpanded}
                            disabled={!visibleBillingGroupKeys.length}
                            onClick={() => setExpandedBillingGroupKeys(allBillingGroupsExpanded ? [] : visibleBillingGroupKeys)}
                            sx={{ width: 40, height: 40, color: "primary.main", borderRadius: 2, "&:hover": { backgroundColor: "primary.100" } }}
                          >
                            {allBillingGroupsExpanded ? <ChevronsDownUp size={20} aria-hidden="true" /> : <ChevronsUpDown size={20} aria-hidden="true" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={changeRowsPerPage}
                    total={visibleRows.length}
                    from={visibleRows.length ? pageStart + 1 : 0}
                    to={Math.min(pageStart + rowsPerPage, visibleRows.length)}
                    page={activePage}
                    pageCount={pageCount}
                    onPreviousPage={() => setCurrentPage(Math.max(0, activePage - 1))}
                    onNextPage={() => setCurrentPage(Math.min(pageCount - 1, activePage + 1))}
                    onOpenSearch={openSearchSheet}
                  />}
                  <AppliedFilterBar filters={appliedFilters} onRemove={removeAppliedFilter} onOpenSearch={openSearchSheet} />
                  {isShipmentModule ? <ShipmentsTable shipments={pagedRows} onOpen={(shipment) => openShipmentById(shipment.shipmentId)} onOpenBol={openBolPreview} onDelete={setPendingDeleteShipmentId} selectedIds={selectedRowIds} onSelectedIdsChange={setSelectedRowIds} rowsPerPage={rowsPerPage} noRowsLabel={shipmentEmptyLabel} emptyStateVisual={shipmentEmptyStateVisual} emptyStateHint={shipmentEmptyStateHint} />
                    : isPartnerModule ? <PartnersTable rows={pagedRows} entityLabel={activePartnerType === "carrier" ? "Carrier" : "Customer"} onEdit={openEditPartner} onDelete={setPendingDeletePartnerId} selectedIds={selectedRowIds} onSelectedIdsChange={setSelectedRowIds} rowsPerPage={rowsPerPage} />
                    : activeModule === "quotations" ? quotationTypeTab === "carrier"
                      ? <CarrierRatePlansTable rows={pagedRows} onOpen={(plan) => openCarrierRateById(plan.ratePlanId)} onEdit={(plan) => openCarrierRateById(plan.ratePlanId, { startInEdit: true })} onDuplicate={(plan) => duplicateQuotationRecords("carrier", [plan.ratePlanId])} onDelete={setPendingDeleteCarrierRateId} selectedIds={selectedRowIds} onSelectedIdsChange={setSelectedRowIds} rowsPerPage={rowsPerPage} />
                      : <QuotationsTable rows={pagedRows} onOpen={(quote) => openQuoteById(quote.quoteId)} onEdit={(quote) => openQuoteById(quote.quoteId, { startInEdit: true })} onDuplicate={(quote) => duplicateQuotationRecords("customer", [quote.quoteId])} onDelete={setPendingDeleteQuotationId} selectedIds={selectedRowIds} onSelectedIdsChange={setSelectedRowIds} rowsPerPage={rowsPerPage} />
                      : <BillingTable
                          rows={visibleRows}
                          billingType={billingTypeTab}
                          onOpen={(record) => openShipmentById(record.shipmentId, { initialDetailTab: "billing" })}
                          onOpenShipment={(shipmentId) => openShipmentById(shipmentId, { initialDetailTab: "billing" })}
                          onExportCsv={exportBillingGroupCsv}
                          onExportPdf={exportBillingGroupPdf}
                          expandedGroupKeys={expandedBillingGroupKeys}
                          onExpandedGroupKeysChange={setExpandedBillingGroupKeys}
                        />}
                </section>
                <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} onReset={() => setDraftFilters({ query: "", status: "all", customer: "", transportMode: "" })} onSearch={() => {
                  setQuery(draftFilters.query);
                  if (!isPartnerModule && activeModule !== "billing") setStatusFilter(draftFilters.status);
                  if (activeModule === "quotations" && quotationTypeTab === "customer") {
                    setQuotationFilters({ customer: draftFilters.customer, transportMode: draftFilters.transportMode });
                  }
                  setCurrentPage(0);
                  setSearchOpen(false);
                }}>
                  <TextInput label="Keyword" value={draftFilters.query} onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))} placeholder={isShipmentModule ? "Shipment, customer or route" : isPartnerModule ? `${activePartnerType === "carrier" ? "Carrier" : "Customer"} name, contact, email or phone` : activeModule === "quotations" ? quotationTypeTab === "carrier" ? "Carrier, rate plan or transport mode" : "Quote No. or quotation name" : "Billing, account or counterparty"} />
                  {activeModule === "quotations" && quotationTypeTab === "customer" ? (
                    <>
                      <AutocompleteInput
                        label="Customer"
                        options={quotationCustomerOptions}
                        value={draftFilters.customer}
                        onChange={(value) => setDraftFilters((current) => ({ ...current, customer: value || "" }))}
                        placeholder="All customers"
                      />
                      <SelectInput
                        label="Transport mode"
                        options={quotationShipmentModeOptions}
                        value={draftFilters.transportMode}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, transportMode: event.target.value }))}
                        placeholder="All transport modes"
                      />
                    </>
                  ) : null}
                  {!isPartnerModule && activeModule !== "billing" ? <SelectInput label="Status" value={draftFilters.status === "all" ? "" : draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value || "all" }))} options={filterOptions.filter((option) => option.value !== "all").map((option) => ({ value: option.value, label: option.label }))} /> : null}
                </SearchSheet>
              </>
            ) : <ReportsPreview onOpenShipment={openShipmentById} chartView={reportChartView} onChartViewChange={setReportChartView} chartDimension={reportChartDimension} onChartDimensionChange={setReportChartDimension} chartDateRange={reportChartDateRange} onChartDateRangeChange={setReportChartDateRange} />}
          </section>
        </>
      )}
      <CreateShipmentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        existingShipments={shipments.filter((shipment) => ["OCEAN", "AIR"].includes(shipment.transportMode)).slice(0, 8)}
        onExtract={(sourceFiles) => {
          setCreateDialogOpen(false);
          setShipmentFieldValuesById((current) => ({ ...current, [fixture.fixtureId]: {} }));
          replaceDraftSourceFiles(sourceFiles);
          openShipmentById(fixture.fixtureId, { startInEdit: true });
          setToast({ message: "Extraction complete. Review the draft information before submitting.", tone: "success" });
        }}
        onManual={() => {
          setCreateDialogOpen(false);
          setShipmentFieldValuesById((current) => ({ ...current, [fixture.fixtureId]: createEmptyShipmentFieldValues() }));
          replaceDraftSourceFiles([]);
          openShipmentById(fixture.fixtureId, { startInEdit: true });
        }}
        onStartExisting={(sourceShipment) => {
          const sharedRouteStops = fixture.jobDraft.routeStops.map((stop, index) => ({
            ...stop,
            company: index === 1 ? sourceShipment.customer : stop.company,
          }));
          setShipmentFieldValuesById((current) => ({
            ...current,
            [fixture.fixtureId]: {
              ...(current[fixture.fixtureId] || {}),
              __startMode: "existing",
              "overview.customer": sourceShipment.customer,
              "identifiers.customerPONumber": sourceShipment.referenceNumber,
              routeStops: sharedRouteStops,
              cargoLines: fixture.jobDraft.cargoLines.map((line) => ({ ...line })),
            },
          }));
          setCreateDialogOpen(false);
          replaceDraftSourceFiles([]);
          openShipmentById(fixture.fixtureId, { startInEdit: true });
          setToast({ message: `Shared fields copied from ${sourceShipment.shipmentId}. The new shipment remains independent.`, tone: "success" });
        }}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingDeleteQuotationId)}
        title="Delete Quotation?"
        description={pendingDeleteQuotationId ? `Delete ${quotations.find((quote) => quote.quoteId === pendingDeleteQuotationId)?.name || pendingDeleteQuotationId} from this demo session? It will no longer be available for shipment pricing.` : ""}
        onClose={() => setPendingDeleteQuotationId(null)}
        onConfirm={confirmDeleteQuotation}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingDeleteCarrierRateId)}
        title="Delete Carrier Rate?"
        description={pendingDeleteCarrierRateId ? `Delete ${carrierRatePlans.find((plan) => plan.ratePlanId === pendingDeleteCarrierRateId)?.name || pendingDeleteCarrierRateId} from this demo session? It will no longer be available for vendor cost pricing.` : ""}
        onClose={() => setPendingDeleteCarrierRateId(null)}
        onConfirm={confirmDeleteCarrierRate}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingDeletePartnerId)}
        title={pendingDeletePartnerId && partners.find((partner) => partner.partnerId === pendingDeletePartnerId)?.type === "carrier" ? "Delete Carrier?" : "Delete Customer?"}
        description={pendingDeletePartnerId ? "Delete " + (partners.find((partner) => partner.partnerId === pendingDeletePartnerId)?.name || pendingDeletePartnerId) + "? It will no longer appear in new shipment selections." : ""}
        onClose={() => setPendingDeletePartnerId(null)}
        onConfirm={confirmDeletePartner}
      />
      <BolPreviewDialog shipment={selectedBolShipment} stop={selectedBolStop} fieldValues={selectedBolFieldValues || shipmentFieldValuesById[selectedBolShipmentId] || {}} autoExport={autoExportBol} onAutoExportComplete={() => setAutoExportBol(false)} onClose={() => { setSelectedBolShipmentId(null); setSelectedBolStop(null); setSelectedBolFieldValues(null); setAutoExportBol(false); }} />
      <DeleteConfirmDialog
        open={Boolean(pendingDeleteShipmentId)}
        title="Delete Shipment?"
        description={pendingDeleteShipmentId ? "Delete " + pendingDeleteShipmentId + " from this demo session? This action cannot be undone." : ""}
        onClose={() => setPendingDeleteShipmentId(null)}
        onConfirm={confirmDeleteShipment}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingBulkDeleteIds.length)}
        title={"Delete " + pendingBulkDeleteIds.length + " Shipments?"}
        description={"Delete the selected " + pendingBulkDeleteIds.length + " shipments from this demo session? This action cannot be undone."}
        onClose={() => setPendingBulkDeleteIds([])}
        onConfirm={confirmBulkDeleteShipments}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingBulkDeleteQuotation?.ids.length)}
        title={pendingBulkDeleteQuotation ? `Delete ${pendingBulkDeleteQuotation.ids.length} ${pendingBulkDeleteQuotation.type === "carrier" ? pendingBulkDeleteQuotation.ids.length === 1 ? "Carrier Rate" : "Carrier Rates" : pendingBulkDeleteQuotation.ids.length === 1 ? "Customer Quote" : "Customer Quotes"}?` : "Delete selected quotations?"}
        description={pendingBulkDeleteQuotation ? `Delete the selected ${pendingBulkDeleteQuotation.ids.length} ${pendingBulkDeleteQuotation.type === "carrier" ? "carrier rate" : "customer quote"}${pendingBulkDeleteQuotation.ids.length === 1 ? "" : "s"} from this demo session? They will no longer be available for shipment pricing.` : ""}
        onClose={() => setPendingBulkDeleteQuotation(null)}
        onConfirm={confirmBulkDeleteQuotations}
      />
      <FeedbackSnackbar feedback={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

export default App;
