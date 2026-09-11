const pricingConditionPresets = [
  { key: "all_shipments", label: "All shipments", conditions: [] },
  { key: "ltl_shipments", label: "LTL shipments", conditions: [{ field: "loadType", operator: "equals", value: "LTL" }] },
  { key: "ftl_shipments", label: "FTL shipments", conditions: [{ field: "loadType", operator: "equals", value: "FTL" }] },
  { key: "fcl_shipments", label: "FCL shipments", conditions: [{ field: "loadType", operator: "equals", value: "FCL" }] },
  { key: "lcl_shipments", label: "LCL shipments", conditions: [{ field: "loadType", operator: "equals", value: "LCL" }] },
  { key: "air_freight_shipments", label: "Air shipments", conditions: [{ field: "transportMode", operator: "equals", value: "AIR" }] },
  { key: "weight_0_2500", label: "0–2,500 lb billable weight", conditions: [{ field: "billableWeightLb", operator: "between", min: 0, max: 2500 }] },
  { key: "weight_0_3000", label: "0–3,000 lb billable weight", conditions: [{ field: "billableWeightLb", operator: "between", min: 0, max: 3000 }] },
  { key: "weight_3001_6000", label: "3,001–6,000 lb billable weight", conditions: [{ field: "billableWeightLb", operator: "between", min: 3001, max: 6000 }] },
  { key: "pallets_0_4", label: "0–4 pallets", conditions: [{ field: "palletCount", operator: "between", min: 0, max: 4 }] },
  { key: "pallets_5_10", label: "5–10 pallets", conditions: [{ field: "palletCount", operator: "between", min: 5, max: 10 }] },
  { key: "chargeable_weight_500_1000", label: "500–1,000 KG chargeable weight", conditions: [{ field: "chargeableWeightKg", operator: "between", min: 500, max: 1000 }] },
  { key: "additional_delivery_stop", label: "Each delivery stop after the first", conditions: [{ field: "deliveryStopNumber", operator: "greaterThan", value: 1 }] },
  { key: "residential_delivery", label: "Each residential delivery", conditions: [{ field: "deliveryType", operator: "equals", value: "RESIDENTIAL" }] },
  { key: "each_delivery", label: "Each delivery", conditions: [{ field: "deliveryCount", operator: "greaterThan", value: 0 }] },
  { key: "appointment", label: "Each appointment", conditions: [{ field: "appointmentRequired", operator: "equals", value: true }] },
  { key: "container", label: "Each container", conditions: [{ field: "containerCount", operator: "greaterThan", value: 0 }] },
  { key: "high_value", label: "High-value shipments", conditions: [{ field: "highValue", operator: "equals", value: true }] },
  { key: "refrigerated", label: "Refrigerated shipments", conditions: [{ field: "temperatureControlled", operator: "equals", value: true }] },
  { key: "detention_after_30", label: "After 30 free min", conditions: [{ field: "detentionMinutes", operator: "greaterThan", value: 30 }] },
];

const canonicalizeCondition = (condition = {}) => {
  if (condition.field !== "serviceType") return { ...condition };
  if (condition.value === "Air Freight") return { ...condition, field: "transportMode", value: "AIR" };
  return { ...condition, field: "loadType" };
};
const cloneConditions = (conditions = []) => conditions.map(canonicalizeCondition);
const conditionSignature = (conditions = []) => JSON.stringify(conditions);
const presetByKey = Object.fromEntries(pricingConditionPresets.map((preset) => [preset.key, preset]));
const presetByLabel = Object.fromEntries(pricingConditionPresets.map((preset) => [preset.label.toLowerCase(), preset]));
const presetBySignature = Object.fromEntries(pricingConditionPresets.map((preset) => [conditionSignature(preset.conditions), preset]));
const basicConditionKeysByMode = {
  TRUCKING: ["all_shipments", "ltl_shipments", "ftl_shipments"],
  OCEAN: ["all_shipments", "fcl_shipments", "lcl_shipments"],
  AIR: ["all_shipments"],
};
const tierConditionKeysByMode = {
  TRUCKING: ["weight_0_3000", "weight_3001_6000", "pallets_0_4", "pallets_5_10"],
  OCEAN: [],
  AIR: ["chargeable_weight_500_1000"],
};

function conditionsFromLegacyLabel(label = "All shipments") {
  const normalizedLabel = String(label || "All shipments").trim();
  const preset = presetByLabel[normalizedLabel.toLowerCase()];
  if (preset) return cloneConditions(preset.conditions);
  return normalizedLabel && normalizedLabel !== "All shipments"
    ? [{ field: "custom", operator: "matches", value: normalizedLabel }]
    : [];
}

export function normalizePricingConditions(rule = {}, fallbackLabel = "All shipments") {
  if (Array.isArray(rule.conditions)) return cloneConditions(rule.conditions);
  return conditionsFromLegacyLabel(rule.appliesWhen || fallbackLabel);
}

export function mergeCanonicalPricingRule(legacyRule = {}, canonicalRule = {}) {
  const legacyFields = { ...legacyRule };
  delete legacyFields.templateKey;
  delete legacyFields.appliesWhen;
  return {
    ...legacyFields,
    name: legacyRule.name || legacyRule.description || canonicalRule.name || canonicalRule.description || "",
    description: legacyRule.description || legacyRule.name || canonicalRule.description || canonicalRule.name || "",
    ruleType: legacyRule.ruleType || canonicalRule.ruleType || "",
    ruleTypeLabel: legacyRule.ruleTypeLabel || canonicalRule.ruleTypeLabel || "",
    billingUnit: legacyRule.billingUnit || legacyRule.unit || canonicalRule.billingUnit || "",
    equipmentType: Object.prototype.hasOwnProperty.call(legacyRule, "equipmentType") ? legacyRule.equipmentType : canonicalRule.equipmentType ?? null,
    conditions: Array.isArray(legacyRule.conditions) ? cloneConditions(legacyRule.conditions) : cloneConditions(canonicalRule.conditions),
    rateCategory: legacyRule.rateCategory || canonicalRule.rateCategory || "",
    unitPrice: legacyRule.unitPrice ?? legacyRule.rate ?? legacyRule.amount ?? canonicalRule.unitPrice ?? canonicalRule.rate ?? canonicalRule.amount,
    amount: legacyRule.amount ?? legacyRule.unitPrice ?? legacyRule.rate ?? canonicalRule.amount ?? canonicalRule.unitPrice ?? canonicalRule.rate,
  };
}

export function formatPricingConditions(conditions = []) {
  const normalizedConditions = Array.isArray(conditions) ? conditions : [];
  const preset = presetBySignature[conditionSignature(normalizedConditions)];
  if (preset) return preset.label;
  if (!normalizedConditions.length) return "All shipments";
  return normalizedConditions.map((condition) => {
    if (condition.field === "custom") return String(condition.value || "Custom condition");
    if (condition.operator === "between") return `${condition.field}: ${condition.min}–${condition.max}`;
    return `${condition.field} ${condition.operator} ${String(condition.value)}`;
  }).join(" · ");
}

export function getPricingConditionKey(conditions = []) {
  const preset = presetBySignature[conditionSignature(conditions)];
  return preset?.key || `custom:${formatPricingConditions(conditions)}`;
}

export function getPricingConditionOptions(conditions = [], context = {}) {
  const key = getPricingConditionKey(conditions);
  const normalizedMode = context.transportMode === "LAND" ? "TRUCKING" : context.transportMode;
  const visibleKeys = [
    ...(basicConditionKeysByMode[normalizedMode] || ["all_shipments"]),
    ...(context.ruleType === "tiered_rate" ? tierConditionKeysByMode[normalizedMode] || [] : []),
  ];
  const options = [...new Set(visibleKeys)]
    .map((presetKey) => presetByKey[presetKey])
    .filter(Boolean)
    .map((preset) => ({ value: preset.key, label: preset.label }));
  if (!options.some((option) => option.value === key)) {
    options.push({ value: key, label: presetByKey[key]?.label || formatPricingConditions(conditions) });
  }
  return options;
}

export function getPricingConditionsForKey(key, currentConditions = []) {
  return presetByKey[key] ? cloneConditions(presetByKey[key].conditions) : cloneConditions(currentConditions);
}

export function getDefaultLoadTypeConditions(loadType) {
  const key = String(loadType || "").trim().toLowerCase().replaceAll(" ", "_") + "_shipments";
  return getPricingConditionsForKey(presetByKey[key] ? key : "all_shipments");
}

// Temporary compatibility export while fixture and pricing callers migrate from serviceType.
export const getDefaultServiceConditions = getDefaultLoadTypeConditions;

export function getDefaultConditionsForRuleType(ruleType, currentConditions = [], fallbackConditions = []) {
  if (ruleType === "threshold_time") return getPricingConditionsForKey("detention_after_30");
  if (getPricingConditionKey(currentConditions) === "detention_after_30") return cloneConditions(fallbackConditions);
  return cloneConditions(currentConditions.length ? currentConditions : fallbackConditions);
}

export function matchesPricingConditions(conditions = [], context = {}) {
  return conditions.every((condition) => {
    const actual = condition.field === "loadType" ? context.loadType ?? context.serviceType : context[condition.field];
    if (actual === undefined || actual === null || actual === "") return true;
    if (condition.operator === "equals") return actual === condition.value;
    if (condition.operator === "greaterThan") return Number(actual) > Number(condition.value);
    if (condition.operator === "between") return Number(actual) >= Number(condition.min) && Number(actual) <= Number(condition.max);
    if (condition.operator === "matches") return String(actual).includes(String(condition.value));
    return true;
  });
}
